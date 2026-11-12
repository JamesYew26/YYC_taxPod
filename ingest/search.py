"""
Retrieval-only test: embed a question with gte-base and call match_chunks() in Supabase.
No LLM involved — this isolates retrieval so failures can be diagnosed (FINDINGS: retrieval vs generation).

Usage (from the project root)
    vnev/bin/python ingest/search.py "How is a foreign national taxed if employed less than 60 days?"
    vnev/bin/python ingest/search.py -k 8 --type sst "Is service tax charged on credit card fees?"
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client

EMBEDDING_MODEL = "thenlper/gte-base"  # must match ingest.py
ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("questions", nargs="+", help="one or more questions")
    parser.add_argument("-k", type=int, default=5, help="top-k chunks to return")
    parser.add_argument("--type", choices=["public_ruling", "sst", "e_invoice", "other"],
                        help="optional doc_type metadata filter")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    url, key = os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env")
    sb = create_client(url, key)
    model = SentenceTransformer(EMBEDDING_MODEL)

    for q in args.questions:
        # Queries are embedded as-is (no title header) — the header only helps document vectors.
        vec = model.encode(q, normalize_embeddings=True).tolist()
        rows = sb.rpc("match_chunks", {
            "query_embedding": vec,
            "match_count": args.k,
            "filter_doc_type": args.type,
        }).execute().data

        print(f"\n❓ {q}")
        for i, r in enumerate(rows, start=1):
            pages = f"p.{r['page_start']}" + (f"-{r['page_end']}" if r["page_end"] != r["page_start"] else "")
            preview = r["content"][:160].replace("\n", " ")
            print(f"  [{i}] {r['similarity']:.3f} | {r['title'][:55]} | {pages} | {r['section'] or '-'}\n"
                  f"      {preview}…")


if __name__ == "__main__":
    main()
