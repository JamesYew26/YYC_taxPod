import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { EMBEDDING_MODEL } from "./config";

// Step 1 of the query pipeline: question → 768-dim vector, computed locally (no API call).
//
// The model takes a few seconds to load, so it is loaded once per server process and reused.
// It is stored on globalThis so Next.js hot-reloading in dev doesn't load it again on every edit.
const cache = globalThis as unknown as { __gteEmbedder?: Promise<FeatureExtractionPipeline> };

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  cache.__gteEmbedder ??= (
    pipeline("feature-extraction", EMBEDDING_MODEL, {
      // fp32 to match the Python sentence-transformers vectors exactly (a quantized
      // default would drift from the stored chunk vectors — D-002 risk).
      dtype: "fp32",
    }) as Promise<FeatureExtractionPipeline>
  ).catch((err) => {
    cache.__gteEmbedder = undefined; // let the next request retry instead of caching the failure
    throw err;
  });
  return cache.__gteEmbedder;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  // Same post-processing as sentence-transformers for gte-base: mean pooling + L2 normalisation.
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
