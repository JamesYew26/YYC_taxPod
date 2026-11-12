# Decision Log

Short records of design decisions: what was decided, what else was considered, and why. Newest at the bottom.

---

## D-001 — Embedding model: `gte-base` (open source)
**Date:** 11 Nov 2026 · **Status:** Accepted

**Decision:** Use `thenlper/gte-base` (768 dimensions, 512-token max input) for both chunks and queries.

**Options considered:**
| Model | Dims | Max tokens | Notes |
|---|---|---|---|
| gte-small (Day-0 prototype) | 384 | 512 | Baseline; lowest quality |
| **gte-base** | 768 | 512 | Same family, clear quality step up, no `trust_remote_code`, ready-made Transformers.js port (`Xenova/gte-base`) |
| gte-large | 1024 | 512 | ~3× slower than base for a small gain |
| gte-base-en-v1.5 / nomic-embed-text-v1.5 | 768 | 8192 | Long context, but needs `trust_remote_code`; nomic needs task prefixes — more ways to get it wrong in the time available |
| Gemini embeddings (API) | 768–3072 | 2048 | Higher quality, but rate limits on the free tier and an external dependency |

**Why:** open source, runs locally (no cost, no rate limits, documents never leave the machine), and available in both Python and JavaScript. 768 dims is well under pgvector's 2000-dim HNSW limit.

**Consequences:**
- Chunks must stay under 512 tokens *including* any header text prepended for embedding (input beyond 512 is silently truncated).
- Vectors are not comparable with the gte-small prototype → new `vector(768)` column, full re-embed, `embedding_model` stored per chunk.
- Plan to evaluate gte-small vs gte-base on the same test set and report the hit-rate difference.

---

## D-002 — Ingestion in Python, query embedding in Next.js via Transformers.js
**Date:** 11 Nov 2026 · **Status:** Accepted

**Decision:** Ingestion runs as an offline Python script (PyMuPDF + sentence-transformers). At question time the Next.js API route embeds the query with Transformers.js (`Xenova/gte-base`, mean pooling, normalized, `dtype: "fp32"`).

**Options considered:** Supabase Edge Function (built-in model is gte-small only — ruled out by D-001); a separate Python query service (extra process to run and explain); TypeScript ingestion (single implementation, but PDF parsing with page numbers is weaker in JS).

**Why:** Python has the best PDF tooling for page-accurate parsing; Transformers.js keeps the runtime app a single Next.js process.

**Risk & mitigation:** two implementations of the same model could produce slightly different vectors (pooling or quantization mismatch). Verify by embedding the same sentence in both and checking cosine similarity ≥ 0.999.

---

## D-003 — Separate `kb_` tables for the knowledge base
**Date:** 11 Nov 2026 · **Status:** Accepted

**Decision:** Knowledge-base tables are `kb_documents` and `kb_chunks`, separate from the Day-0 prototype `documents` table and from CRM tables.

**Why:** avoids clashing with (and destroying) the prototype, and the prefix makes the RAG data obvious next to CRM tables like `contacts` and `opportunities`.

---

## D-004 — Retrieval returns scores; the threshold lives in application code
**Date:** 11 Nov 2026 · **Status:** Accepted

**Decision:** `match_chunks()` returns top-k with similarity scores and applies no threshold. The "not found" threshold is applied in the API route.

**Why:** the threshold must be tuned from evaluation (scores are model-specific), and logging every score — including below-threshold ones — is what makes retrieval failures debuggable.

---

## D-005 — Chunking: paragraph-aware, token-bounded, small overlap
**Date:** 11 Nov 2026 · **Status:** Accepted 12 Nov — validated by evaluation; size changed 350 → 200 tokens

**Decision:** Parse each PDF page into text blocks (≈ paragraphs), drop repeated headers/footers, track the current numbered section heading, then pack blocks into chunks of ≤ 350 gte-base tokens with ~50 tokens of overlap (the trailing paragraph is carried into the next chunk when short enough). Each chunk records `page_start`, `page_end` (1-based physical PDF pages) and `section`.

**Why:** paragraph boundaries keep facts intact; 350 tokens + a short title/section header stays safely under the 512-token limit; page ranges make citations exact.

**To validate:** compare hit rate at different chunk sizes (e.g. 200 vs 350) during evaluation.

---

## D-006 — Bahasa Malaysia documents vs an English-only embedding model
**Date:** 11 Nov 2026 · **Status:** Resolved — option 1 (replaced with English guides)

**Finding (measured, not assumed):** 2 of the 6 downloaded documents (both SST guides from JKDM) are in Bahasa Malaysia. gte-base is trained on English. Test with the English question *"Who is eligible to claim a drawback of sales tax and what are the conditions?"*:

| Similarity | Passage |
|---|---|
| 0.947 | English passage answering it |
| 0.802 | English passage on child relief (unrelated) |
| 0.784 | **Malay passage answering it** (same content as row 1) |

The correct Malay passage scores *below* an unrelated English one, so the Malay guides would rarely be retrieved for English questions.

**Options:**
1. Replace the two SST guides with English-language SST guides (keeps D-001 unchanged).
2. Switch to a multilingual open-source model, e.g. `multilingual-e5-base` (also 768 dims, so the schema is unchanged; needs `query: ` / `passage: ` prefixes). Supports users asking in BM, which matters for a Malaysian product.
3. Keep them and report the cross-lingual failure in the evaluation.

**Resolution:** replaced both BM guides with English-language JKDM service-tax guides: *Guide on Private Education Services* and *Guide on Financial Services (Version 2)*. The corpus is now all-English, so D-001 (gte-base) still holds. Supporting BM questions with a multilingual model goes under "What I would do differently with more time".

---

## D-007 — Section headings detected by layout, not numbering alone
**Date:** 11 Nov 2026 · **Status:** Accepted

**Context:** The two publishers format headings differently. LHDN public rulings use numbered headings ("6.20 Deduction for children"). JKDM guides use unnumbered bold ALL-CAPS headings ("RATE OF SERVICE TAX"). Both also number ordinary paragraphs.

**Decision:** A block is a heading if it is short (≤ 80 chars), doesn't end in punctuation, isn't repeated on 3 or more pages, and the next block doesn't continue in lowercase, **and** it is either numbered ("5.", "6.20") or bold ALL-CAPS. Font weight comes from PyMuPDF's `get_text("dict")` span flags.

**Why:** each signal on its own failed on the real PDFs (see FINDINGS.md, Day 1). Combining them labels all six documents cleanly. Page numbers remain the primary citation anchor; section is a bonus.

---

## D-008 — LLM resilience: per-attempt timeout, model fallback chain, circuit breaker
**Date:** 12 Nov 2026 · **Status:** Accepted

**Context (measured):** on the free tier, `gemini-3.8-flash` and `gemini-3.7-flash` returned 503 "high demand" for hours, `gemini-2.5-flash` returned 404 (retired, though still listed), and a 503 could take ~60 s to arrive. The first version (retry the same model with backoff) took **120 s** for one question.

**Decision:**
1. **Timeout:** each Gemini attempt is capped at 20 s (`httpOptions.timeout`).
2. **Fallback chain:** `gemini-3.8-flash → 3.6-flash → 3.5-flash → 3.5-flash-lite` (configurable via env). 503 / timeout / 404 → next model immediately. Only 429 gets one short retry on the same model.
3. **Circuit breaker:** a model that fails is moved to the back of the queue for 60 s, so later requests don't pay its latency again.
4. The response reports which model answered and any fallbacks in `warnings`. If every model fails, the API returns HTTP 503 with a friendly message.

**Why:** retrying an overloaded model only adds latency. Answer quality across these Flash versions was comparable for grounded Q&A, so availability matters more than using the newest model.

---

## D-005 update — chunk size 350 → 200 tokens (evaluation result)
**Date:** 12 Nov 2026

Same pipeline, re-ingested with `--chunk-tokens 200` (235 → 433 chunks) and evaluated on the 17-question set:
- Document hit@1 93% → **100%**, page hit@3 93% → **100%**, MRR 0.929 → **1.000**
- End-to-end correct cited answers 13/14 → **14/14**; out-of-scope refusals 3/3 in both runs.
- Fixed the "PR No. 4/2026" identifier miss. Likely cause: the prepended title carries more weight in a shorter chunk. The margin is thin, so hybrid search is still planned.

The default in `ingest/ingest.py` is now 200. Full write-up: ARCHITECTURE.md → Evaluation results.
