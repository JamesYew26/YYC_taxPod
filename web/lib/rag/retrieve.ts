import { supabaseServer } from "@/lib/supabase/server";
import type { DocType } from "./config";

// Step 2: top-k cosine similarity search in pgvector via the match_chunks() SQL function
// (supabase/migrations/001_knowledge_base.sql). Returns scores; no threshold here (D-004).

export type RetrievedChunk = {
  chunk_id: number;
  document_id: number;
  title: string;
  doc_type: DocType;
  source_url: string | null;
  section: string | null;
  page_start: number;
  page_end: number;
  content: string;
  similarity: number;
};

export async function retrieveChunks(
  queryEmbedding: number[],
  options: { topK: number; docType?: DocType },
): Promise<RetrievedChunk[]> {
  const { data, error } = await supabaseServer().rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: options.topK,
    filter_doc_type: options.docType ?? null,
  });
  if (error) throw new Error(`match_chunks failed: ${error.message}`);
  return (data ?? []) as RetrievedChunk[];
}
