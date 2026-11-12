# AI Usage

## Tools used

| Tool | Used for |
|---|---|
| Claude Code (desktop app) | Reading the brief, planning the timeline, learning RAG concepts, knowledge quizzes, scaffolding and code review |

*(Add tools and uses as the project progresses.)*

---

## Log

### 11 Nov 2026 — Using AI as a tutor to test my RAG understanding

**Why:** I had spent Day 0 studying RAG concepts. Before writing any code I wanted to check whether I actually understood them, rather than build on misconceptions.

**My prompt (verbatim):**

> No I have not used Next.js. I have intermediate level of understanding for SQL, did a little LLM API before. Yes I need to catchup on the progress as well for day 0. I have spent day 0 learning the concepts of RAG, things about chunking, TopK, precision, recall, embedding, types of embedding and how to understand the cosine embedding, did some PGVector as well using Supabase with GTE-Small open sourced model. So now I have to catchup with the progress. At the meantime give me some test on the knowledge I gained yesterday to see whether I truly understand the concept or not.

**AI output:** a 14-question quiz in three levels, plus a revised timeline that moved the RAG pipeline ahead of the CRM because I am new to Next.js.

#### Quiz questions and my answers (verbatim, unedited)

**Level 1: Fundamentals**

1. **Q:** What is the cosine similarity between `[1, 0]` and `[0, 1]`? Between `[1, 1]` and `[3, 3]`? What does the second answer tell you about what cosine similarity ignores?
   **My answer:** 0.75 the angle of the similarity will be 45 degrees. I remembered the cosine of 0.75 by memorising but I understood the angle will be 45 degrees. 1,1 and 3,3 gets cosine of 1. It ignores semantic meaning behind the words. It only find the similar words. It means that cosine similarity does not translate synonyms.

2. **Q:** pgvector's `<=>` returns cosine distance, not similarity. How do you convert it to similarity? To get the most similar chunks, `ORDER BY embedding <=> query` ASC or DESC?
   **My answer:** I dont know how to convert it to similarity. I think to get the more similar chunks we have to ORDER BY DESC since the distance will be closer

3. **Q:** Why must the question and the chunks be embedded with the same model? What would you do if you switched from gte-small to Gemini embeddings halfway?
   **My answer:** Different models perform differently. The things the learn on will be different if we switched models halfway. From what I understand, if GTE-Small embedded 50% of the documents and the other 50% was embedded by Gemini, they have no way to understand what was done by the other half. That is what I understand

4. **Q:** How many dimensions does gte-small produce, and what is its maximum input length in tokens? What happens to a 1,000-token chunk you send it?
   **My answer:** GTE dimensions around 300+. I have no idea about the input length nor the consequences if I sent 1000 token chunk.

**Level 2: Applied**

5. **Q:** Top-5 retrieved, 2 relevant, 4 relevant exist in the DB. Precision@5 and recall@5?
   **My answer:** Precision of 0.5 and the recall of 0.5 as well.

6. **Q:** How is hit rate different from recall@k? Which is easier to measure with only "expected source document" labels?
   **My answer:** I dont know about the hit rate difference from recall@k. It is easier if it comes from expected source document than expected source document and hallucinated response.

7. **Q:** One symptom of chunks too large, one of chunks too small.
   **My answer:** If the chunk is too large a lot or irrelevant things will be jumbled up. If the chunk to small not enough good and useful information is captured. Anything below 500 char will be too less. Anything above 900 will be too large

8. **Q:** What is chunk overlap for, and what is its cost?
   **My answer:** Chunk overlapping by 15% is good enough. Overlapping is used to give each chunk some previous context instead of random words or letters to start with. I dont know whats its cost

9. **Q:** With HNSW, is search exact or approximate? Gains and losses vs a sequential scan?
   **My answer:** I did not dive too much in HNSW

**Level 3: Scenarios**

10. **Q:** "What does PR No. 11/2024 say about benefits in kind?" returns chunks from the wrong ruling. Why do dense embeddings struggle, and what fixes it?
    **My answer:** I think hybrid retrieval. I scanned through the blog by medium it mentioned something like this I think.

11. **Q:** Top chunk similarity is 0.78. Answer or "not found"? How to pick the threshold, and why not reuse one from a tutorial?
    **My answer:** I think the system may proceed to answer with the document sited. Does this have to do with temperature and something about confidence. I dont have an exact answer to this

12. **Q:** LLM cites "e-Invoice Guideline, page 14" but the content is on page 22. Where could the bug come from, and how do you design citations so the LLM can't invent a page?
    **My answer:** Probably during retrieval. Use hallucination guardrails and set temperature. Chunking with page numbers as well.

13. **Q:** How do you tell a retrieval failure from a generation failure?
    **My answer:** I dont know

14. **Q:** Metadata filter `doc_type = 'sst'`, top-5 requested, only 2 returned though many SST chunks exist. Cause with HNSW?
    **My answer:** I dont know

#### Result: ~5 / 14

| # | Score | Correction (summary) |
|---|---|---|
| 1 | ½ | `[1,0]·[0,1]` = 0 → cos 0 (90°). Cosine ignores **magnitude**, not meaning — embeddings do capture synonyms. |
| 2 | ¼ | similarity = 1 − distance; order **ASC**. My reasoning ("closer") was right, the keyword was wrong. |
| 3 | 1 | Correct: separate vector spaces; must re-embed everything. |
| 4 | ¼ | 384 dims, 512-token limit, longer input silently truncated. |
| 5 | ½ | Precision = 2/5 = 0.4 (denominator is k); recall 0.5 correct. |
| 6 | 0 | Hit rate = ≥1 expected source in top-k per question; only needs doc-level labels. |
| 7 | ¾ | Right idea; justify size from model limit + eval, not fixed numbers. |
| 8 | ½ | Purpose ≈ right; cost = more chunks + duplicate results in top-k. |
| 9 | 0 | HNSW is approximate: faster at scale, may miss true nearest. |
| 10 | ¾ | Hybrid is right; reason = embeddings are weak on identifiers/numbers. |
| 11 | 0 | Temperature ≠ confidence. Threshold must be derived from my own eval (model-specific score ranges). |
| 12 | ¼ | LLM should cite `[n]` only; code maps to page. Printed vs physical page mismatch is a common cause. |
| 13 | 0 | Inspect retrieved chunks: missing → retrieval failure; present but wrong answer → generation failure. |
| 14 | 0 | HNSW post-filters its candidate set (`ef_search`); raise it, use iterative scan, or exact scan. |

**What I changed because of this:** the corrections became concrete build rules (see `FINDINGS.md`): ASC ordering, ≤400-token chunks for gte-small, an eval-derived similarity threshold instead of the `0.6` I had copied into `prototype/main.py`, `[n]`-style citations mapped in code, and logging retrieved chunks for every question.

**Where AI helped:** it exposed two misconceptions that would have produced silently wrong code — DESC ordering (returns least relevant chunks) and treating temperature as a hallucination guard.

**Where it fell short / what I had to judge myself:** *(fill in)*
