"""
Evaluate the Tax Document Q&A (RAG) module.

Two modes:
  retrieval (default)  embed each question with gte-base, call match_chunks() — no LLM.
                       Measures whether the right document / page is retrieved.
  --e2e                POST each question to the running app's /api/ask (embed → retrieve →
                       guards → Gemini). Measures answered / refused / cited-correct-document.

Usage (from the project root)
    vnev/bin/python eval/run_eval.py --label baseline
    vnev/bin/python eval/run_eval.py --label baseline --e2e          # needs `npm run dev` in web/
    vnev/bin/python eval/run_eval.py --label k10 -k 10

Outputs eval/results/<label>[-e2e].json (raw per-question data) and .md (summary tables).

Metrics (in-scope questions)
    doc hit@k   expected document appears in the top-k chunks
    page hit@k  a top-k chunk from the expected document covers an expected page (stricter)
    MRR         mean of 1/rank of the first chunk from the expected document (0 if absent)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS = ROOT / "eval" / "questions.json"
RESULTS_DIR = ROOT / "eval" / "results"
EMBEDDING_MODEL = "thenlper/gte-base"  # must match ingest.py and web/lib/rag/config.ts
THRESHOLDS = [0.75, 0.78, 0.80, 0.82, 0.84, 0.86]


def pct(x: float) -> str:
    return f"{x * 100:.0f}%"


# ---------------------------------------------------------------------------
# Retrieval-only evaluation
# ---------------------------------------------------------------------------
def run_retrieval(questions: list[dict], k: int) -> list[dict]:
    from sentence_transformers import SentenceTransformer
    from supabase import create_client

    url, key = os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env")
    sb = create_client(url, key)
    file_by_doc_id = {d["id"]: d["file_name"] for d in sb.table("kb_documents").select("id,file_name").execute().data}
    model = SentenceTransformer(EMBEDDING_MODEL)

    rows = []
    for q in questions:
        vec = model.encode(q["question"], normalize_embeddings=True).tolist()
        hits = sb.rpc("match_chunks", {"query_embedding": vec, "match_count": k, "filter_doc_type": None}).execute().data
        retrieved = [
            {
                "rank": i + 1,
                "file": file_by_doc_id.get(h["document_id"], "?"),
                "pages": [h["page_start"], h["page_end"]],
                "section": h["section"],
                "similarity": round(h["similarity"], 4),
            }
            for i, h in enumerate(hits)
        ]
        doc_rank = page_rank = None
        if q.get("expected_file"):
            expected_pages = set(q.get("expected_pages") or [])
            for r in retrieved:
                if r["file"] != q["expected_file"]:
                    continue
                doc_rank = doc_rank or r["rank"]
                covered = set(range(r["pages"][0], r["pages"][1] + 1))
                if page_rank is None and covered & expected_pages:
                    page_rank = r["rank"]
        rows.append({**q, "retrieved": retrieved, "doc_rank": doc_rank, "page_rank": page_rank,
                     "top_score": retrieved[0]["similarity"] if retrieved else 0.0})
        mark = "—" if not q.get("expected_file") else (f"doc@{doc_rank}" if doc_rank else "MISS")
        print(f"  {q['id']}  top={rows[-1]['top_score']:.3f}  {mark:8}  {q['question'][:70]}")
    return rows


def summarise_retrieval(rows: list[dict], k: int, label: str) -> str:
    ins = [r for r in rows if r.get("expected_file")]
    oos = [r for r in rows if not r.get("expected_file")]
    n = len(ins)

    def hit(field: str, cutoff: int) -> float:
        return sum(1 for r in ins if r[field] and r[field] <= cutoff) / n

    mrr = sum(1 / r["doc_rank"] for r in ins if r["doc_rank"]) / n
    lines = [
        f"# Retrieval evaluation — `{label}`",
        "",
        f"Run {datetime.now():%Y-%m-%d %H:%M} · model `{EMBEDDING_MODEL}` · top-k {k} · "
        f"{n} in-scope + {len(oos)} out-of-scope questions",
        "",
        "## Summary (in-scope)",
        "",
        "| Metric | @1 | @3 | @5 |",
        "|---|---|---|---|",
        f"| Document hit rate | {pct(hit('doc_rank', 1))} | {pct(hit('doc_rank', 3))} | {pct(hit('doc_rank', 5))} |",
        f"| Page hit rate | {pct(hit('page_rank', 1))} | {pct(hit('page_rank', 3))} | {pct(hit('page_rank', 5))} |",
        "",
        f"MRR (document): **{mrr:.3f}**",
        "",
        "## Per question",
        "",
        "| ID | Question | Expected | Top-1 score | Doc rank | Page rank |",
        "|---|---|---|---|---|---|",
    ]
    for r in rows:
        exp = (r["expected_file"][:28] + "…" + (f" p.{r['expected_pages']}" if r.get("expected_pages") else "")) \
            if r.get("expected_file") else "*(refuse)*"
        doc = "—" if not r.get("expected_file") else (str(r["doc_rank"]) if r["doc_rank"] else "❌ miss")
        page = "—" if not r.get("expected_file") else (str(r["page_rank"]) if r["page_rank"] else "❌ miss")
        lines.append(f"| {r['id']} | {r['question']} | {exp} | {r['top_score']:.3f} | {doc} | {page} |")

    # Threshold analysis: how well does the similarity threshold (guard 1) separate scope?
    lines += [
        "",
        "## Similarity threshold analysis (guard 1)",
        "",
        f"In-scope top-1 scores: min **{min(r['top_score'] for r in ins):.3f}**, "
        f"max {max(r['top_score'] for r in ins):.3f}. "
        + (f"Out-of-scope top-1 scores: max **{max(r['top_score'] for r in oos):.3f}**." if oos else ""),
        "",
        "| Threshold | In-scope passed (want 100%) | Out-of-scope blocked (want 100%) |",
        "|---|---|---|",
    ]
    for t in THRESHOLDS:
        passed = sum(1 for r in ins if r["top_score"] >= t) / n
        blocked = (sum(1 for r in oos if r["top_score"] < t) / len(oos)) if oos else 0
        lines.append(f"| {t:.2f} | {pct(passed)} | {pct(blocked)} |")

    misses = [r for r in ins if not r["doc_rank"] or not r["page_rank"]]
    if misses:
        lines += ["", "## Misses — what was retrieved instead", ""]
        for r in misses:
            lines.append(f"- **{r['id']}** {r['question']}")
            for h in r["retrieved"][:3]:
                lines.append(f"  - #{h['rank']} {h['similarity']:.3f} · {h['file'][:45]} · "
                             f"pp. {h['pages'][0]}-{h['pages'][1]} · {h['section'] or '-'}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# End-to-end evaluation (through the running app)
# ---------------------------------------------------------------------------
def run_e2e(questions: list[dict], api_url: str) -> list[dict]:
    rows = []
    for q in questions:
        t0 = time.time()
        req = urllib.request.Request(api_url, data=json.dumps({"question": q["question"]}).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                body, http = json.loads(resp.read()), resp.status
        except urllib.error.HTTPError as e:
            body, http = json.loads(e.read() or b"{}"), e.code
        except urllib.error.URLError as e:
            sys.exit(f"Could not reach {api_url} — is `npm run dev` running in web/? ({e.reason})")
        elapsed = time.time() - t0

        cited_titles = {c["title"] for c in body.get("citations", [])}
        rows.append({**q, "http": http, "status": body.get("status"), "reason": body.get("reason"),
                     "model": body.get("model"), "answer": body.get("answer") or body.get("message"),
                     "cited_titles": sorted(cited_titles), "seconds": round(elapsed, 1),
                     "warnings": body.get("warnings", [])})
        print(f"  {q['id']}  {body.get('status') or 'error':10} {(body.get('reason') or ''):18} "
              f"{elapsed:5.1f}s  {body.get('model') or '-':22} {q['question'][:55]}")
    return rows


def summarise_e2e(rows: list[dict], label: str, title_by_file: dict[str, str]) -> str:
    ins = [r for r in rows if r.get("expected_file")]
    oos = [r for r in rows if not r.get("expected_file")]
    errors = [r for r in rows if r["status"] not in ("answered", "not_found")]
    answered = [r for r in ins if r["status"] == "answered"]
    cited_ok = [r for r in answered if title_by_file.get(r["expected_file"]) in r["cited_titles"]]
    refused_ok = [r for r in oos if r["status"] == "not_found"]
    secs = sorted(r["seconds"] for r in rows if r["status"] in ("answered", "not_found"))
    median = secs[len(secs) // 2] if secs else 0

    lines = [
        f"# End-to-end evaluation — `{label}`",
        "",
        f"Run {datetime.now():%Y-%m-%d %H:%M} through `/api/ask`",
        "",
        "| Metric | Result |",
        "|---|---|",
        f"| In-scope answered | {len(answered)}/{len(ins)} ({pct(len(answered) / len(ins))}) |",
        f"| In-scope answered **and** cited the expected document | {len(cited_ok)}/{len(ins)} ({pct(len(cited_ok) / len(ins))}) |",
        f"| Out-of-scope correctly refused | {len(refused_ok)}/{len(oos)} |" if oos else "| Out-of-scope | n/a |",
        f"| Errors (LLM unavailable etc.) | {len(errors)} |",
        f"| Median latency | {median:.1f}s |",
        "",
        "| ID | Status | Reason | Cited expected doc? | Model | Seconds |",
        "|---|---|---|---|---|---|",
    ]
    for r in rows:
        if r.get("expected_file"):
            ok = "✅" if title_by_file.get(r["expected_file"]) in r["cited_titles"] else "❌"
        else:
            ok = "✅ refused" if r["status"] == "not_found" else "❌ answered"
        lines.append(f"| {r['id']} | {r['status']} | {r['reason'] or ''} | {ok} | {r['model'] or '-'} | {r['seconds']} |")
    lines += ["", "## Answers", ""]
    for r in rows:
        lines.append(f"**{r['id']}. {r['question']}**  \n*Expected:* {r.get('answer_notes', '')}  \n"
                     f"*Got ({r['status']}):* {(r['answer'] or '').strip()}\n")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--label", default="run", help="name for this run's result files")
    parser.add_argument("-k", type=int, default=5)
    parser.add_argument("--e2e", action="store_true", help="evaluate through the running app's /api/ask")
    parser.add_argument("--api", default="http://localhost:3000/api/ask")
    parser.add_argument("--only", nargs="*", help="question ids to run (default: all)")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    questions = json.loads(QUESTIONS.read_text())["questions"]
    if args.only:
        questions = [q for q in questions if q["id"] in args.only]
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.e2e:
        manifest = json.loads((ROOT / "ingest" / "documents.json").read_text())
        title_by_file = {m["file"]: m["title"] for m in manifest}
        print(f"End-to-end eval of {len(questions)} questions via {args.api}")
        rows = run_e2e(questions, args.api)
        report = summarise_e2e(rows, args.label, title_by_file)
        stem = f"{args.label}-e2e"
    else:
        print(f"Retrieval eval of {len(questions)} questions (top-{args.k})")
        rows = run_retrieval(questions, args.k)
        report = summarise_retrieval(rows, args.k, args.label)
        stem = args.label

    (RESULTS_DIR / f"{stem}.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    (RESULTS_DIR / f"{stem}.md").write_text(report)
    print("\n" + report)
    print(f"Saved eval/results/{stem}.md and .json")


if __name__ == "__main__":
    main()
