// RAG settings in one place. Values come from the project-root .env (see next.config.ts).
// Every number here is a design decision — see docs/DECISION_LOG.md.

/** JS port of thenlper/gte-base — must be the same model used by ingest/ingest.py (D-001, D-002). */
export const EMBEDDING_MODEL = "Xenova/gte-base";

/**
 * Gemini models to try, in order. Free-tier models regularly return 503 "high demand" for
 * minutes at a time (observed 12 Nov: 3.8 and 3.7 unavailable while 3.6 / 3.5 answered),
 * so on a 503 / 429 / 404 we fall back to the next model instead of failing the request.
 * Override with GEMINI_MODEL (primary) and GEMINI_FALLBACK_MODELS (comma-separated).
 */
export const GEMINI_MODELS: string[] = [
  process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
];

/** How many chunks to retrieve and show the LLM. */
export const TOP_K = Number(process.env.RAG_TOP_K ?? 5);

/**
 * Hallucination guard, layer 1 (D-004): if the best chunk scores below this, we answer
 * "not found" without calling the LLM. Provisional value from the first retrieval test
 * (in-scope top-1 ≥ 0.849, nonsense ≤ 0.769) — to be tuned by the evaluation.
 */
export const MIN_SIMILARITY = Number(process.env.RAG_MIN_SIMILARITY ?? 0.8);

/** Circuit breaker: after a model fails, skip it for this long instead of paying its latency again. */
export const MODEL_COOLDOWN_MS = 60_000;

/** Per-attempt cap on a Gemini call; after this we fall back to the next model. */
export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 20000);

/** Low temperature = consistent wording. It is NOT a hallucination guard (FINDINGS, quiz Q11). */
export const LLM_TEMPERATURE = 0.1;

export const DOC_TYPES = ["public_ruling", "sst", "e_invoice", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const NOT_FOUND_MESSAGE =
  "I couldn't find an answer to that in the tax documents I have access to. " +
  "Try rephrasing, or check the official LHDN / JKDM sources.";
