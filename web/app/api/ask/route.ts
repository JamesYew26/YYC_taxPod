import { DOC_TYPES, type DocType } from "@/lib/rag/config";
import { LlmUnavailableError, answerQuestion } from "@/lib/rag/answer";

// POST /api/ask  { "question": "...", "docType"?: "public_ruling" | "sst" | "e_invoice" | "other" }
// → AskResult (see lib/rag/answer.ts)

const MAX_QUESTION_LENGTH = 500;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "error", message: "Request body must be JSON" }, { status: 400 });
  }

  const { question, docType } = (body ?? {}) as { question?: unknown; docType?: unknown };
  if (typeof question !== "string" || question.trim().length < 3) {
    return Response.json({ status: "error", message: "Please enter a question" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { status: "error", message: `Questions are limited to ${MAX_QUESTION_LENGTH} characters` },
      { status: 400 },
    );
  }
  if (docType !== undefined && docType !== null && !DOC_TYPES.includes(docType as DocType)) {
    return Response.json({ status: "error", message: `docType must be one of ${DOC_TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    const result = await answerQuestion(question.trim(), { docType: (docType ?? undefined) as DocType | undefined });
    return Response.json(result);
  } catch (err) {
    console.error("[rag] /api/ask failed:", err);
    if (err instanceof LlmUnavailableError) {
      return Response.json(
        { status: "error", message: "The AI service is busy right now. Please try again in a minute." },
        { status: 503 },
      );
    }
    return Response.json({ status: "error", message: "Something went wrong answering that question." }, { status: 500 });
  }
}
