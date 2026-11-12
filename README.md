# YYC taxPod

A small CRM for a tax practice, plus **Ask Tax AI**: a RAG assistant that answers Malaysian tax questions from official LHDN and JKDM documents, cites the page each answer came from, and says so when the documents don't cover a question.

- **CRM:** dashboard KPIs, contacts (search, filter, create/edit/delete), a pipeline board for opportunities, and an activity log.
- **Ask Tax AI (`/ask`):** embed the question → retrieve the top-k chunks from pgvector → Gemini answers only from those chunks → `[n]` citations linked to the document and page. It refuses rather than guesses.

Stack: Next.js 16 (App Router, Server Actions) · Supabase Postgres + pgvector · `gte-base` embeddings (open source, run locally) · Gemini Flash · Python for PDF ingestion and evaluation.

## Documentation

| File | What's in it |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Timeline, data model, RAG design, **evaluation results** |
| [docs/DECISION_LOG.md](docs/DECISION_LOG.md) | Each design decision with the options considered and why (D-001 … D-008) |
| [docs/FINDINGS.md](docs/FINDINGS.md) | What I learned building it, including mistakes and how I caught them |
| [docs/AI_USAGE.md](docs/AI_USAGE.md) | How I used AI tools, with prompts and what I changed afterwards |

## Project layout

```
web/                  Next.js app (CRM pages + /ask chat UI + /api/ask route)
  lib/rag/            embed → retrieve → prompt → answer (fallback chain, guards)
  lib/crm/            queries and Server Actions for the CRM
ingest/               PDF → chunks → embeddings → Supabase (Python)
  documents.json      the document manifest (title, type, source URL)
  data/               the 6 source PDFs
eval/                 17-question evaluation set, runner, and saved results
supabase/             SQL migrations and CRM seed data
prototype/main.py     Day-0 pgvector + gte-small experiment (kept for reference; not used by the app)
```

## Running it locally

### Requirements

- Node.js 20.9+ and npm
- Python 3.10+ (developed on 3.13)
- A free [Supabase](https://supabase.com) project
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)

### 1. Environment variables

The Python scripts and the Next.js app share **one** `.env` in the project root (the app loads it in `web/next.config.ts`).

```bash
cp .env.example .env
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys), and `GEMINI_API_KEY`. The secret key is used only on the server.

### 2. Database

In the Supabase dashboard, open **SQL Editor** and run these files in order (each one is safe to re-run):

1. `supabase/migrations/001_knowledge_base.sql`: pgvector, `kb_documents`, `kb_chunks`, the `match_chunks` function
2. `supabase/migrations/002_crm.sql`: `contacts`, `opportunities`, `activities`
3. `supabase/seed.sql`: demo CRM data (fictional). Re-running it resets the CRM tables.

### 3. Ingest the tax documents

```bash
python3 -m venv vnev
```

```bash
vnev/bin/pip install -r ingest/requirements.txt
```

```bash
vnev/bin/python ingest/ingest.py
```

The first run downloads the `gte-base` model (about 450 MB) and ingests the 6 PDFs in `ingest/data/` (about 430 chunks). To check parsing without touching the database, use `vnev/bin/python ingest/ingest.py --dry-run --show 3`.

### 4. Start the app

```bash
cd web && npm install && npm run dev
```

Open http://localhost:3000. The first question on `/ask` takes a little longer because the query embedding model loads on first use.

## Evaluation

```bash
vnev/bin/python eval/run_eval.py --label myrun
```

```bash
vnev/bin/python eval/run_eval.py --label myrun --e2e
```

The first command measures retrieval only (document hit@k, page hit@k, MRR) with no LLM calls. The second sends every question through the running app's `/api/ask`, so `npm run dev` must be running. Results are written to `eval/results/`.

Current results (200-token chunks, 14 in-scope and 3 out-of-scope questions): document hit@1 **100%**, page hit@3 **100%**, MRR **1.000**; end-to-end **14/14** cited correctly and **3/3** out-of-scope questions refused. Details: [ARCHITECTURE.md → Evaluation results](docs/ARCHITECTURE.md#evaluation-results).

## Known limitations

- **Questions that name a ruling by number** ("PR No. 4/2026") only just retrieve the right document, because dense embeddings treat ruling numbers as near-identical. Hybrid (keyword + vector) search is the planned fix.
- **The similarity threshold only screens out questions that have nothing to do with tax.** Tax questions outside the documents score about as high as covered ones, so the model's own "not covered" answer is what catches them.
- **Gemini Flash latency varies.** A fallback chain and circuit breaker (D-008) keep answers coming, but a slow call can take tens of seconds.
- **English only.** Questions in Bahasa Malaysia need a multilingual embedding model (D-006).
- **No login.** The CRM has a single hard-coded user, and only the server reads the database.
