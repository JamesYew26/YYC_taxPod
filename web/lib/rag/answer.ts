import { ApiError, GoogleGenAI } from "@google/genai";
import {
  GEMINI_MODELS,
  LLM_TEMPERATURE,
  LLM_TIMEOUT_MS,
  MIN_SIMILARITY,
  MODEL_COOLDOWN_MS,
  NOT_FOUND_MESSAGE,
  TOP_K,
  type DocType,
} from "./config";
import { embedQuery } from "./embed";
import { ANSWER_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { retrieveChunks, type RetrievedChunk } from "./retrieve";

// Orchestrates the query pipeline:
//   question → embed → retrieve top-k → threshold guard → Gemini (JSON) → map [n] → citations

export type Citation = {
  n: number; // the [n] marker used in the answer text
  title: string;
  section: string | null;
  page_start: number;
  page_end: number;
  source_url: string | null;
  similarity: number;
};

export type AskResult = {
  status: "answered" | "not_found";
  /** Why it was not found: weak retrieval (no LLM call) or the LLM said the excerpts don't cover it. */
  reason?: "below_threshold" | "llm_declined" | "no_valid_citations";
  answer: string;
  citations: Citation[];
  /** Everything retrieved, with scores — for the "show sources" debug view and the eval. */
  retrieved: { n: number; title: string; section: string | null; pages: string; similarity: number }[];
  warnings: string[];
  /** Gemini model that wrote the answer; null when the threshold guard skipped the LLM. */
  model: string | null;
  timings_ms: { embed: number; retrieve: number; llm: number; total: number };
};

/** Gemini is unavailable (rate limit, outage) after retries — the route maps this to HTTP 503. */
export class LlmUnavailableError extends Error {}

let gemini: GoogleGenAI | undefined;
function geminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in the project-root .env");
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return gemini;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** model → timestamp until which it is considered down (in-memory, per server process). */
const modelDownUntil = new Map<string, number>();

/** 429 rate limit, 5xx overload, 404 retired model, or our per-attempt timeout → try elsewhere. */
function unavailableReason(err: unknown): string | null {
  if (err instanceof ApiError && (err.status === 429 || err.status === 404 || err.status >= 500)) {
    return `HTTP ${err.status}`;
  }
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return `timeout after ${LLM_TIMEOUT_MS}ms`;
  }
  return null;
}

/**
 * Call Gemini with structured JSON output. Resilience (observed: an overloaded model can take
 * ~60 s just to return a 503, so retrying the same model only adds latency):
 *  - every attempt is capped at LLM_TIMEOUT_MS,
 *  - 503 / timeout / 404 → move straight to the next model in GEMINI_MODELS,
 *  - 429 rate limit → one short backoff and retry on the same model first.
 */
async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
): Promise<{ found: boolean; answer: string; model: string; warnings: string[] }> {
  const warnings: string[] = [];
  // Circuit breaker: try healthy models first; models that failed recently go last
  // (still tried, so we never refuse while a cooled-down model might have recovered).
  const now = Date.now();
  const healthy = GEMINI_MODELS.filter((m) => (modelDownUntil.get(m) ?? 0) <= now);
  const cooling = GEMINI_MODELS.filter((m) => (modelDownUntil.get(m) ?? 0) > now);
  if (cooling.length) warnings.push(`skipped recently failing: ${cooling.join(", ")}`);

  for (const model of [...healthy, ...cooling]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await geminiClient().models.generateContent({
          model,
          contents: buildUserPrompt(question, chunks),
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: LLM_TEMPERATURE,
            responseMimeType: "application/json",
            responseJsonSchema: ANSWER_SCHEMA,
            httpOptions: { timeout: LLM_TIMEOUT_MS },
          },
        });
        const parsed = JSON.parse(response.text ?? "");
        if (typeof parsed.found !== "boolean" || typeof parsed.answer !== "string") {
          throw new Error("Gemini returned JSON that does not match the answer schema");
        }
        modelDownUntil.delete(model);
        return { ...parsed, model, warnings };
      } catch (err) {
        const reason = unavailableReason(err);
        if (!reason) throw err;
        console.warn(`[rag] ${model} ${reason} (attempt ${attempt + 1})`);
        const rateLimited = err instanceof ApiError && err.status === 429;
        if (!rateLimited || attempt > 0) break; // overloaded / retired / slow → next model
        await sleep(1500);
      }
    }
    modelDownUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
    warnings.push(`${model} unavailable, fell back to next model`);
  }
  throw new LlmUnavailableError(`All Gemini models unavailable: ${GEMINI_MODELS.join(", ")}`);
}

function pages(c: RetrievedChunk): string {
  return c.page_start === c.page_end ? `p. ${c.page_start}` : `pp. ${c.page_start}-${c.page_end}`;
}

export async function answerQuestion(question: string, options: { docType?: DocType } = {}): Promise<AskResult> {
  const t0 = performance.now();
  const embedding = await embedQuery(question);
  const t1 = performance.now();
  const chunks = await retrieveChunks(embedding, { topK: TOP_K, docType: options.docType });
  const t2 = performance.now();

  const retrieved = chunks.map((c, i) => ({
    n: i + 1,
    title: c.title,
    section: c.section,
    pages: pages(c),
    similarity: Number(c.similarity.toFixed(4)),
  }));
  // Observability: log every retrieval with scores, so retrieval vs generation failures can be told apart.
  console.log(`[rag] q="${question}" top=${retrieved.map((r) => r.similarity).join(", ")}`);

  const base = { retrieved, model: null as string | null, warnings: [] as string[] };
  const topScore = chunks[0]?.similarity ?? 0;

  // Guard layer 1: weak retrieval → don't ask the LLM at all.
  if (topScore < MIN_SIMILARITY) {
    return {
      ...base,
      status: "not_found",
      reason: "below_threshold",
      answer: NOT_FOUND_MESSAGE,
      citations: [],
      timings_ms: timings(t0, t1, t2, t2),
    };
  }

  const llm = await generateAnswer(question, chunks);
  const t3 = performance.now();
  base.model = llm.model;
  base.warnings.push(...llm.warnings);

  // Guard layer 2: the model itself says the excerpts don't answer the question.
  if (!llm.found) {
    return {
      ...base,
      status: "not_found",
      reason: "llm_declined",
      answer: llm.answer || NOT_FOUND_MESSAGE,
      citations: [],
      timings_ms: timings(t0, t1, t2, t3),
    };
  }

  // Map [n] markers → real chunk metadata. Markers that don't exist are stripped and flagged.
  const used = new Set<number>();
  const answer = llm.answer.replace(/\[(\d+)\]/g, (marker, num) => {
    const n = Number(num);
    if (n >= 1 && n <= chunks.length) {
      used.add(n);
      return marker;
    }
    base.warnings.push(`removed invalid citation ${marker}`);
    return "";
  });

  // Guard layer 3: an "answer" with no valid citation isn't grounded in the documents.
  if (used.size === 0) {
    base.warnings.push("answer had no valid citations");
    return {
      ...base,
      status: "not_found",
      reason: "no_valid_citations",
      answer: NOT_FOUND_MESSAGE,
      citations: [],
      timings_ms: timings(t0, t1, t2, t3),
    };
  }

  const citations: Citation[] = [...used]
    .sort((a, b) => a - b)
    .map((n) => {
      const c = chunks[n - 1];
      return {
        n,
        title: c.title,
        section: c.section,
        page_start: c.page_start,
        page_end: c.page_end,
        source_url: c.source_url,
        similarity: Number(c.similarity.toFixed(4)),
      };
    });

  return { ...base, status: "answered", answer, citations, timings_ms: timings(t0, t1, t2, t3) };
}

function timings(t0: number, t1: number, t2: number, t3: number) {
  return {
    embed: Math.round(t1 - t0),
    retrieve: Math.round(t2 - t1),
    llm: Math.round(t3 - t2),
    total: Math.round(t3 - t0),
  };
}
