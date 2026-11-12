# Findings — RAG Learning Notes

Running notes on what I learned while preparing the RAG module, including misconceptions I had and how they were corrected. Rules marked **🔧 Build rule** directly change how the code is written.

---

## Day 0 — Tue 10 Nov 2026: Core concepts

Studied: RAG pipeline, embeddings, embedding types, cosine similarity, chunking, top-k, precision/recall, pgvector on Supabase with the open-source `gte-small` model (see `prototype/main.py` — insert + `match_documents` RPC prototype).

### Embeddings & cosine similarity
- An embedding model turns text into a fixed-length vector. **Direction encodes meaning** — "tax exemption" and "tax relief" point in similar directions even though the words differ. This is the advantage over keyword search.
- Cosine similarity: `cos θ = (A·B) / (|A| × |B|)`
  - `[1,0]` vs `[0,1]` → dot product 0 → cos = **0** (90°, unrelated)
  - `[1,1]` vs `[3,3]` → cos = **1** (same direction)
- Cosine **ignores magnitude (vector length)**, not meaning.
- ❌ *Misconception corrected:* I thought cosine similarity "ignores semantic meaning and doesn't translate synonyms". Wrong — capturing meaning (incl. synonyms) is exactly what embeddings do.

### pgvector distance vs similarity
- `<=>` returns cosine **distance**. `similarity = 1 − distance`.
- Most similar first = `ORDER BY embedding <=> query` **ASC** (smallest distance).
- ❌ *Misconception corrected:* I said DESC. DESC silently returns the *least* relevant chunks.
- 🔧 **Build rule:** `ORDER BY embedding <=> q ASC`; expose `1 - (embedding <=> q) AS similarity`.

### Embedding models are not interchangeable
- Each model defines its own vector space; dimensions may differ (gte-small 384 vs Gemini 768+). Vectors from different models cannot be compared.
- Switching models ⇒ **re-embed every chunk**.
- 🔧 **Build rule:** store an `embedding_model` column on `chunks`.
- 🔧 **Build rule:** the *query* must be embedded with the same model at request time. If ingestion uses gte-small in Python, the Next.js app must also produce gte-small vectors (options: Transformers.js `Xenova/gte-small`, Supabase Edge Function built-in `gte-small`, or a small Python service). → Record the choice in DECISION_LOG.md.

### gte-small limits
- **384 dimensions**, **max 512 input tokens**.
- Longer input is **silently truncated** — the tail is never embedded (unsearchable) but still gets sent to the LLM when retrieved, hiding the bug.
- 🔧 **Build rule:** chunks ≤ ~400 tokens (~1,500 chars English, ~4 chars/token).

### Precision, recall, hit rate
- **Precision@k** = relevant retrieved ÷ k → "of what I returned, how much was useful?"
- **Recall@k** = relevant retrieved ÷ all relevant that exist → "of everything useful, how much did I find?"
- Example: top-5, 2 relevant, 4 exist → precision 0.4, recall 0.5. (I initially used the wrong denominator for precision.)
- **Hit rate@k** = fraction of questions where **at least one** expected source appears in top-k (binary per question). Only needs "expected source document" labels — that's why the brief asks for it. Recall needs every relevant chunk labelled.
- Retrieval evaluation ≠ answer-quality evaluation. Hallucination is checked separately.

### Chunking
- **Too large:** embedding becomes an average of several topics → weak match for specific questions; wastes LLM context.
- **Too small:** loses context ("the rate is 6%" — of what?).
- Size is not a magic number — justify it from the model's token limit + document structure, then validate with the eval.
- **Overlap** keeps a fact from being split across a boundary and lost from both chunks. **Cost:** more chunks (storage, embedding calls) and near-duplicate chunks wasting top-k slots.

### HNSW index
- **Approximate** nearest-neighbour search using a layered graph (express train → local stops).
- Gain: speed at scale. Lose: no guarantee of the true nearest match; build time and memory.
- At ~5 documents (hundreds–low thousands of chunks), an exact scan is milliseconds. Add HNSW and explain it's for production scale.
- **Filtering pitfall:** HNSW collects ~`ef_search` (default 40) candidates *then* applies `WHERE`. A `doc_type` filter can leave fewer than k rows. Fixes: raise `hnsw.ef_search`, pgvector ≥ 0.8 `hnsw.iterative_scan`, or exact scan at small scale.

### Hybrid retrieval
- Dense embeddings handle identifiers poorly: "PR No. 11/2024" ≈ "PR No. 8/2023" semantically.
- Keyword search (Postgres full-text) matches exact tokens. **Hybrid** = run both, merge with Reciprocal Rank Fusion. Alternative: parse the ruling number and apply a metadata filter.

### Hallucination guard & thresholds
- ❌ *Misconception corrected:* **Temperature is not confidence and not a hallucination guard.** It only controls randomness in generation. Temperature 0 = consistent, not truthful.
- Similarity scores are **model-specific** — some models compress scores into a high narrow band. A threshold from a tutorial (e.g. the `0.6` in `prototype/main.py`) is not transferable.
- Choose the threshold **empirically**: run in-scope and out-of-scope questions, record top scores, pick a value that separates them.
- 🔧 **Build rule — two-layer guard:**
  1. Code: top score < threshold → return "not found", skip the LLM.
  2. Prompt: "If the context does not contain the answer, say so."

### Citations
- Wrong page numbers can come from: parsing (printed page ≠ physical PDF page; 0- vs 1-based index), chunking (chunk spans two pages, only one stored), or the LLM inventing it.
- 🔧 **Build rule:** the LLM **never writes page numbers**. Label chunks `[1]…[n]` in the prompt, the LLM cites `[n]`, code maps `[n]` → document title + page from the DB and validates each `[n]` exists.
- 🔧 **Build rule:** parse PDFs page-by-page; store page (and page range if a chunk spans pages).

### Debugging: retrieval vs generation failure
- Inspect the retrieved chunks for the failing question.
  - Correct chunk **not** in top-k → **retrieval** failure (chunking, k, hybrid, embedding model).
  - Correct chunk **in** context but answer wrong → **generation** failure (prompt, model, context order).
- 🔧 **Build rule:** log retrieved chunks + scores for every question; add a "show sources & scores" toggle in the chat UI.

---

## Build rules — quick reference

| Topic | Rule |
|---|---|
| SQL ordering | `ORDER BY embedding <=> q` **ASC**; similarity = 1 − distance |
| Chunk size | ≤ ~400 tokens with gte-small (512-token hard limit, silent truncation) |
| Model consistency | Same model for ingest and query; store `embedding_model` |
| Guard | Eval-derived similarity threshold + refusal instruction; temperature is not a guard |
| Citations | LLM cites `[n]`; code maps to doc + page |
| Observability | Log retrieved chunks + scores per question |

---

## Day 1 — Wed 11 Nov 2026: Findings from real documents

### Real PDFs need cleaning that synthetic tests don't reveal
First dry run over the 6 real PDFs exposed issues a clean test file never would:
- **Table-of-contents lines** ("8. Disclaimer 68", dot leaders) were mistaken for section headings → TOC lines with dot leaders are now dropped, and heading candidates ending in a page number are rejected.
- **Dates** ("15 Jun 2026") matched the heading pattern → heading numbers must contain a dot ("5." / "5.2").
- **Numbered paragraphs** ("2.1 This PR takes into account…") look like headings → headings must be ≤ 80 chars, not end in punctuation, and not end in a connecting word ("the", "yang", "dan"…).
- **Overlap could exceed the chunk limit** (a carried paragraph + the next one reached 354 tokens) → carry only if the result still fits.
- Section labels are reliable for LHDN public rulings, imperfect for the BM guides. **Page numbers are the reliable citation anchor; section is a bonus.**
- Result: 6 documents → 239 chunks (avg ~320 tokens).

### English-only embeddings fail on Bahasa Malaysia text
With gte-base, an English question about sales-tax drawback scored **0.784** against the Malay passage that answers it, but **0.802** against an unrelated English passage about child relief. The translated English passage scored **0.947**.
- 🔧 **Build rule:** the embedding model's language coverage must match both the documents and the users' questions. See DECISION_LOG D-006.

### Similarity scores sit in a narrow, high band (confirms quiz Q11)
An *unrelated* English passage scored **0.80** with gte-base. A threshold like 0.6 copied from a tutorial would let everything through. The threshold has to come from the evaluation.

### Heading detection: no single signal works across publishers
After swapping in the English JKDM guides, section labels broke again. Iterations:
1. **Numbering only** (regex): LHDN fine; JKDM guides labelled every numbered *paragraph* as a heading.
2. **Bold only** (PyMuPDF font flags): JKDM fine; LHDN picked up bold table cells ("Total expenses 6,900") and the running header.
3. **Running header not removed:** the LHDN header block ends at ~14% of page height, just outside the 10% margin → margin widened to 15%.
4. **Combined rule:** (numbered OR bold ALL-CAPS) + short + no trailing punctuation + not repeated on 3 or more pages + next block doesn't continue in lowercase. Clean labels for all 6 documents.

Lesson: look at the output of every parsing change on *every* document. A fix for one publisher's format broke the other's twice.
- Final corpus: 6 English documents → **235 chunks** (avg ~325 tokens, max 350).

---

## Day 2 — Thu 12 Nov 2026: First retrieval test (`ingest/search.py`, gte-base, top-3)

| Question | Top-1 score | Correct document at #1? |
|---|---|---|
| Foreign national employed < 60 days | 0.909 | ✅ PR 2/2026, 4.6.1 |
| Max special allowance, small value assets | 0.929 | ✅ PR 4/2026 |
| Service tax on credit card annual fees | 0.874 | ✅ Financial Services guide |
| When must a business start issuing e-invoices | 0.914 | ✅ e-Invoice Guideline, 1.4 |
| Tax relief for children | 0.858 | ✅ PR 5/2026, 6.20 Deduction for children |
| "What PR No. 4/2026 says about hire purchase?" | 0.849 | ❌ **all 3 results from PR 2/2026** |
| *Out of scope:* nasi lemak recipe | 0.769 | n/a (top hit: child relief) |
| *Out of scope:* reset Netflix password | 0.727 | n/a (top hit: e-Invoice cancellation) |

### What this shows
- **The identifier failure from quiz Q10 happened for real.** Asking about "PR No. 4/2026" by number returned only chunks from a *different* ruling, even though PR 4/2026 has a section "13. Hire Purchase of Small Value Assets". To a dense embedding, "PR 4/2026" and "PR 2/2026" look almost identical. → Strong case for **hybrid search** (the `fts` column already exists) or parsing ruling numbers into a metadata filter.
- **Scores sit in a narrow band (quiz Q11):** in-scope top-1 is 0.85–0.93; nonsense questions still score 0.73–0.77. A tutorial threshold of 0.6 would let everything through.
- **First threshold candidate is ≈ 0.80** (the gap between 0.769 and 0.849). This is only provisional: so far the off-topic questions were *far* off-topic. The eval needs **near-domain** out-of-scope questions (e.g. Singapore GST, a tax topic not in these documents) to find where the real boundary is.
- Several chunks per question come from the same section (e.g. three from 4.6.1), which is good for completeness but means top-k fills up with one document. Worth checking in the eval.

### Python ↔ JavaScript embedding parity (D-002 risk check)
Embedded the same 3 sentences with `thenlper/gte-base` (Python sentence-transformers) and `Xenova/gte-base` (Transformers.js, `dtype: "fp32"`, mean pooling, normalized):
- cosine(JS, Python) = **0.99989, 1.00014, 1.00007** (values above 1 are floating-point rounding). The vectors are effectively identical, so query vectors from Next.js can be compared with chunk vectors from Python.
- Cold start: **83 s** for the first model load (download, ~440 MB fp32). Cached afterwards. Each query embeds in **~10 ms**.
- 🔧 **Build rule:** load the embedder once per server process (singleton on `globalThis`) and warm it up before a demo.

---

## Day 2 (cont.) — First end-to-end answers from `/api/ask`

| Question | Top-1 | Result | Model |
|---|---|---|---|
| Foreign national < 60 days | 0.909 | ✅ answered, all citations PR 2/2026 §4.6.x | 3.6-flash |
| Max special allowance, small value assets | 0.929 | ✅ answered (100%, RM2,000/asset, RM20,000 cap for non-MSMC) | 3.6-flash |
| Service tax on credit card annual fees | 0.874 | ✅ answered (RM25 per card per 12 months) | 3.6-flash |
| When must businesses issue e-invoices | 0.914 | ✅ answered, phased dates by turnover | 3.6-flash |
| Tax relief for children | 0.858 | ✅ answered (RM2,000 / RM8,000 + related reliefs) | 3.6-flash |
| Private university fees, Malaysian students | 0.956 | ✅ answered (not taxable for citizens) | 3.6-flash |
| "What does PR No. 4/2026 say about hire purchase?" | 0.844 | ❌ **false "not found"**: retrieval miss, LLM correctly refused | 3.5-flash |
| *Out of scope:* Singapore GST rate | 0.843 | ✅ refused (LLM declined) | 3.5-flash |
| *Out of scope:* Calculating RPGT on a house sale | 0.804 | ✅ refused (LLM declined) | 3.6-flash |

### Lessons
- **The similarity threshold cannot separate near-domain questions.** Singapore GST (out of scope) scored **0.843**, while children's relief (in scope) scored **0.858**: only 0.015 apart. Threshold 0.80 filters nonsense (0.73–0.77) but every tax-flavoured question passes it. **Guard 2 (the LLM's `found: false`) did the real work** for out-of-scope tax questions. This justifies the layered design, and the threshold should not be raised to try to catch these (it would start refusing real questions).
- **Refusing is the correct failure mode.** On the PR 4/2026 retrieval miss, the model was handed the wrong ruling and said "not covered" rather than inventing hire-purchase rules. It's a false negative, not a hallucination. The fix belongs in retrieval (hybrid search / ruling-number filter), not the prompt.
- **Citation mapping works:** every `[n]` resolved to a real chunk with the correct document and page range. One wrong *section label* seen (a numbered list item "3. Purchase of pulse oximeter…" inside PR 5/2026 §6.8) — page is still right.
- **LLM availability is the biggest operational risk.** `gemini-3.8-flash` returned 503 "high demand" for the entire session, and an overloaded model can take ~60 s just to *return* the 503. See D-008.
- **Latency:** embed ~10 ms, retrieve ~0.5–1 s (Supabase round trip), LLM 3–23 s. The LLM is >90% of response time.

### Chat UI (`/ask`) verified in the browser
- Answer card: status pill (teal "Answered from documents" / amber "Not covered" / amber "No relevant passages found"), answer with clickable `[n]` chips that highlight the matching source, a Sources list (document · section · page range, linking to the PDF at `#page=N` where a URL is known), and a collapsible "Retrieval details" panel (all top-k chunks with similarity, model used, embed/retrieve/LLM timings, fallback warnings).
- Dashboard → `/ask?q=…` hand-off works. A nonsense question is refused in **0.7 s** with no LLM call (guard 1).
- **Gemini latency was the bottleneck in the demo run:** for the credit-card question, 3.8, 3.6 and 3.5 Flash all failed (504 gateway timeouts at ~20 s each), and **3.5-flash-lite** answered after **58 s of LLM time** (68.6 s total). Without the fallback chain this question would have failed outright. Embed + retrieve took ~2 s.
- Possible improvements: stream the answer, or put the fastest-healthy model first at demo time (`GEMINI_MODEL=gemini-3.5-flash-lite`).

---

## Day 2 (cont.) — Evaluation (`eval/run_eval.py`)

- Built a 17-question eval set with **page-level** ground truth (pages verified in the PDFs), plus retrieval-only and end-to-end modes.
- **Baseline (350 tokens):** doc hit@1 93%, page hit@1 71%, MRR 0.929; end-to-end 13/14 cited correctly, 3/3 refusals.
- **Experiment (200 tokens):** doc hit@1 **100%**, page hit@1 79% / @3 100%, MRR **1.000**; end-to-end **14/14**, 3/3 refusals. Adopted.
- **Mistake caught by the eval:** my first "200-token" run gave results *identical* to the baseline. The ingestion script had crashed (`global` declared after use), but piping its output through `grep` hid the error, so the eval re-measured the old index. Lesson: **identical results after a change mean "check that the change actually happened"**, and use `set -o pipefail` so a failing step stops the pipeline.
- The threshold can't separate tax-related out-of-scope questions (0.846 vs 0.851). The LLM's `found:false` does that job (see ARCHITECTURE → Evaluation results).

---

## Day 2 (cont.) — CRM built and browser-tested (a day ahead of plan)

**Tested in the browser against seeded data:** dashboard KPIs match the seed exactly (12 contacts, 6 new in 30 days, 10 open deals = RM 350,000, total RM 470,500, won RM 75,500); contacts search (`?q=lim`), status filter, create, edit and delete; pipeline stage move; new opportunity (value "15,000" parsed correctly); activity log, including the automatic stage-change note; cascade delete; no console errors.

**Bugs found by testing (not by the type-checker):**
1. **Cache Components + `Date.now()`.** The dashboard's "new in last 30 days" query read `Date.now()` before any request-time data, so Next 16 flagged it as a value that could be frozen into a prerender. Fix: `await connection()` at the top of each CRM query, explicitly marking it as request-time.
2. **Native `<dialog>` steals focus.** `showModal()` focuses the first focusable element (the Close button), overriding React's `autoFocus`, so typing went nowhere. Fix: after `showModal()`, focus the first form field.
3. **React 19 resets forms after every action, including failed ones.** A validation error wiped everything the user typed. Fix: Server Actions echo the submitted values back on error, and forms use them as `defaultValue`.
4. **Kanban columns too cramped** at a laptop-width window (~180 px each). Fix: fixed 15rem columns with horizontal scroll.

Lesson: the type-checker and linter passed on all four. Only using the app found them.
