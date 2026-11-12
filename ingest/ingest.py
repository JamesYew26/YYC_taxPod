"""
Ingest Malaysian tax PDFs into Supabase (pgvector).

Pipeline
    PDF ──► page text blocks (PyMuPDF) ──► drop repeated headers/footers
        ──► track section headings ──► pack blocks into token-bounded chunks (with overlap)
        ──► embed with gte-base ──► kb_documents / kb_chunks

Usage (from the project root)
    vnev/bin/python ingest/ingest.py --dry-run --show 3   # parse + chunk only: no model download, no DB
    vnev/bin/python ingest/ingest.py                      # full ingest of everything in documents.json
    vnev/bin/python ingest/ingest.py --only some-file.pdf # re-ingest one document

Inputs
    ingest/documents.json   list of {file, title, doc_type, source_url}
    ingest/data/<file>      the PDFs themselves

Environment (.env in project root)
    NEXT_PUBLIC_SUPABASE_URL   project URL
    SUPABASE_SECRET_KEY        server-side secret key (bypasses RLS) — never exposed to the browser
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf  # PyMuPDF
from dotenv import load_dotenv
from transformers import AutoTokenizer

# ---------------------------------------------------------------------------
# Configuration — every number here is a design decision (see DECISION_LOG D-001, D-005)
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "thenlper/gte-base"  # 768 dims, 512-token input limit
MODEL_MAX_TOKENS = 512
CHUNK_MAX_TOKENS = 200          # chosen by evaluation: beat 350 on doc/page hit rate (DECISION_LOG D-005)
CHUNK_OVERLAP_TOKENS = 50       # trailing paragraph carried into the next chunk if it fits in this
MIN_CHUNK_TOKENS = 20           # tiny trailing fragments get merged rather than stored alone
REPEAT_THRESHOLD = 0.5          # a margin line on >= 50% of pages is treated as a header/footer
MARGIN_FRACTION = 0.15          # top/bottom 15% of the page is where headers/footers live
                                # (LHDN running headers end at ~14% of page height)
EMBED_BATCH_SIZE = 32
INSERT_BATCH_SIZE = 100

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "ingest" / "data"
MANIFEST = ROOT / "ingest" / "documents.json"

# A numbered heading such as "5. EXEMPTION", "5.2 Benefits in kind", "6.1.3 Example".
# Numbered heading, LHDN style: "5. Gifts or Contributions", "6.20 Deduction for children", "1.0 INTRODUCTION".
# The number must contain a dot so dates like "15 Jun 2026" don't match.
NUMBERED_HEADING_RE = re.compile(r"^\d{1,2}\.(?:\d{1,2}\.?){0,3}\s+[A-Z]")
# FAQ question lines ("Q: …", "12. Q : …") are bold in JKDM guides but are not section headings.
QA_RE = re.compile(r"^(\d{1,3}\.\s*)?Q\s*:", re.IGNORECASE)
# Table-of-contents entries end in a page number ("8. Disclaimer 68") — not real headings.
TOC_ENTRY_RE = re.compile(r"\s\d{1,3}$")
# A line ending in a connector or dash is the first line of a wrapped sentence, not a heading.
DANGLING_END_RE = re.compile(
    r"(\s[-–]|\b(the|that|of|and|or|to|in|by|for|with|is|are|yang|dan|atau|di|ke|untuk|oleh|bagi|daripada|dalam))$",
    re.IGNORECASE)
# Dot leaders ("SUMMARY OF CHANGES ........ 3") only appear in tables of contents.
DOT_LEADER_RE = re.compile(r"\.{5,}")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
@dataclass
class Block:
    """A paragraph-ish piece of text from one page."""
    text: str
    page: int            # 1-based physical page number
    section: str | None  # nearest heading above this block
    tokens: int = 0


@dataclass
class Chunk:
    blocks: list[Block] = field(default_factory=list)

    @property
    def tokens(self) -> int:
        return sum(b.tokens for b in self.blocks)

    @property
    def content(self) -> str:
        return "\n\n".join(b.text for b in self.blocks)

    @property
    def page_start(self) -> int:
        return min(b.page for b in self.blocks)

    @property
    def page_end(self) -> int:
        return max(b.page for b in self.blocks)

    @property
    def section(self) -> str | None:
        # Use the section of the first block that has one.
        return next((b.section for b in self.blocks if b.section), None)


# ---------------------------------------------------------------------------
# Step 1 — Parse: PDF -> blocks with page numbers and section headings
# ---------------------------------------------------------------------------
def normalise_for_repeat_check(text: str) -> str:
    """'Page 3 of 30' and 'Page 4 of 30' should count as the same footer."""
    return re.sub(r"\d+", "#", text.strip().lower())


def clean(text: str) -> str:
    text = text.replace("­", "")              # soft hyphens
    text = re.sub(r"-\n(?=[a-z])", "", text)       # re-join words hyphenated across lines
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)          # a block is one paragraph: join its lines
    return text.strip()


def is_heading(text: str, is_bold: bool, repeats: int) -> bool:
    """Two heading styles in the corpus:
      - LHDN public rulings: numbered headings ("6.20 Deduction for children")
      - JKDM service-tax guides: unnumbered bold ALL-CAPS headings ("RATE OF SERVICE TAX")
    Both also number ordinary paragraphs and bold table cells, so each style needs guards."""
    if not (3 <= len(text) <= 80) or not re.search(r"[A-Za-z]{3}", text):
        return False
    if repeats >= 3:                                # headings are unique; repeated text is a running header
        return False
    if text.endswith((".", ";", ",", ":")):         # sentences / lead-ins, not headings
        return False
    if QA_RE.match(text) or TOC_ENTRY_RE.search(text) or DANGLING_END_RE.search(text):
        return False
    letters = re.sub(r"[^A-Za-z]", "", text)
    is_all_caps = len(letters) >= 4 and letters.isupper()
    return bool(NUMBERED_HEADING_RE.match(text)) or (is_bold and is_all_caps)


def parse_pdf(path: Path) -> tuple[list[Block], int]:
    doc = pymupdf.open(path)
    page_count = doc.page_count

    # Raw blocks per page. get_text("dict") groups lines into paragraph-like blocks and
    # exposes font info per text span, which is how we recognise headings (bold).
    # Each entry: (text, is_margin_candidate, is_bold)
    raw_pages: list[list[tuple[str, bool, bool]]] = []
    for page in doc:
        height = page.rect.height
        page_blocks = []
        for block in page.get_text("dict", sort=True)["blocks"]:
            if block["type"] != 0:  # 0 = text, 1 = image
                continue
            lines = [" ".join(s["text"] for s in line["spans"]) for line in block["lines"]]
            text = "\n".join(lines)
            if not text.strip():
                continue
            spans = [s for line in block["lines"] for s in line["spans"] if s["text"].strip()]
            is_bold = all(s["flags"] & 16 or "bold" in s["font"].lower() for s in spans)
            x0, y0, x1, y1 = block["bbox"]
            in_margin = y1 <= height * MARGIN_FRACTION or y0 >= height * (1 - MARGIN_FRACTION)
            page_blocks.append((text, in_margin and len(text) <= 200, is_bold))
        raw_pages.append(page_blocks)
    doc.close()

    # Headers/footers: short text in the top/bottom margin that repeats on most pages
    # (e.g. "Public Ruling No. 5/2019", "Page 3 of 30"). Body text is never dropped,
    # even if it repeats (disclaimers, repeated example wording).
    seen_on_pages = Counter()
    for page_blocks in raw_pages:
        for key in {normalise_for_repeat_check(t) for t, candidate, _bold in page_blocks if candidate}:
            seen_on_pages[key] += 1
    min_repeats = max(3, int(page_count * REPEAT_THRESHOLD))
    boilerplate = {k for k, n in seen_on_pages.items() if n >= min_repeats}

    # How many pages each short text appears on (any position) — used to reject repeated "headings".
    text_repeats = Counter()
    for page_blocks in raw_pages:
        for key in {normalise_for_repeat_check(clean(t)) for t, _c, _b in page_blocks if len(t) <= 120}:
            text_repeats[key] += 1

    # Pass 1: clean and filter, keeping (text, page, is_bold).
    kept: list[tuple[str, int, bool]] = []
    for page_no, page_blocks in enumerate(raw_pages, start=1):
        for raw, candidate, is_bold in page_blocks:
            if candidate and normalise_for_repeat_check(raw) in boilerplate:
                continue
            text = clean(raw)
            if not text or re.fullmatch(r"[\d\W]+", text):  # stray page numbers / bullets
                continue
            if DOT_LEADER_RE.search(text):                  # table-of-contents lines carry no answers
                continue
            kept.append((text, page_no, is_bold))

    # Pass 2: assign sections. Look ahead one block: if the next block continues in lowercase,
    # this line is the first line of a wrapped paragraph, not a heading.
    out: list[Block] = []
    current_section: str | None = None
    for i, (text, page_no, is_bold) in enumerate(kept):
        next_text = kept[i + 1][0] if i + 1 < len(kept) else ""
        continues = bool(re.match(r"^[a-z(]", next_text))
        if not continues and is_heading(text, is_bold, text_repeats[normalise_for_repeat_check(text)]):
            current_section = text
        out.append(Block(text=text, page=page_no, section=current_section))
    return out, page_count


# ---------------------------------------------------------------------------
# Step 2 — Chunk: pack blocks into token-bounded chunks with overlap
# ---------------------------------------------------------------------------
def count_tokens(tokenizer, text: str) -> int:
    return len(tokenizer.encode(text, add_special_tokens=False))


def split_oversized(block: Block, tokenizer) -> list[Block]:
    """A single paragraph longer than the chunk limit is split by sentence, then by words."""
    sentences = re.split(r"(?<=[.;:])\s+", block.text)
    pieces: list[str] = []
    current = ""
    for s in sentences:
        candidate = f"{current} {s}".strip()
        if count_tokens(tokenizer, candidate) <= CHUNK_MAX_TOKENS:
            current = candidate
            continue
        
        if current:
            pieces.append(current)
        if count_tokens(tokenizer, s) <= CHUNK_MAX_TOKENS:
            current = s
        else:  # one enormous sentence: hard split on words
            words, current = s.split(), ""
            for w in words:
                candidate = f"{current} {w}".strip()
                if count_tokens(tokenizer, candidate) > CHUNK_MAX_TOKENS:
                    pieces.append(current)
                    current = w
                else:
                    current = candidate
    if current:
        pieces.append(current)
    return [Block(text=p, page=block.page, section=block.section,
                  tokens=count_tokens(tokenizer, p)) for p in pieces]


def chunk_blocks(blocks: list[Block], tokenizer) -> list[Chunk]:
    units: list[Block] = []
    for b in blocks:
        b.tokens = count_tokens(tokenizer, b.text)
        units.extend(split_oversized(b, tokenizer) if b.tokens > CHUNK_MAX_TOKENS else [b])

    chunks: list[Chunk] = []
    current = Chunk()
    for unit in units:
        if current.blocks and current.tokens + unit.tokens > CHUNK_MAX_TOKENS:
            chunks.append(current)
            # Overlap: carry the previous chunk's last paragraph forward if it is short enough
            # AND still leaves room for the next unit (never exceed CHUNK_MAX_TOKENS).
            last = current.blocks[-1]
            carry = ([last] if last.tokens <= CHUNK_OVERLAP_TOKENS
                     and len(current.blocks) > 1
                     and last.tokens + unit.tokens <= CHUNK_MAX_TOKENS else [])
            current = Chunk(blocks=list(carry))
        current.blocks.append(unit)
    if current.blocks:
        # Merge a tiny final fragment into the previous chunk if it fits.
        if chunks and current.tokens < MIN_CHUNK_TOKENS and chunks[-1].tokens + current.tokens <= CHUNK_MAX_TOKENS:
            chunks[-1].blocks.extend(current.blocks)
        else:
            chunks.append(current)
    return chunks


def embedding_text(title: str, chunk: Chunk) -> str:
    """Text actually embedded: a short header gives the vector document context.
    The stored `content` (what the LLM sees) stays the raw chunk."""
    header = title if not chunk.section else f"{title} — {chunk.section}"
    return f"{header}\n\n{chunk.content}"


# ---------------------------------------------------------------------------
# Step 3 — Embed + store
# ---------------------------------------------------------------------------
def get_supabase():
    from supabase import create_client

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env")
    return create_client(url, key)


def store_document(sb, meta: dict, page_count: int, chunks: list[Chunk], vectors) -> None:
    # Upsert the document row (re-running replaces its chunks — idempotent).
    doc_row = sb.table("kb_documents").upsert(
        {
            "file_name": meta["file"],
            "title": meta["title"],
            "doc_type": meta["doc_type"],
            "source_url": meta.get("source_url"),
            "page_count": page_count,
        },
        on_conflict="file_name",
    ).execute().data[0]
    doc_id = doc_row["id"]

    sb.table("kb_chunks").delete().eq("document_id", doc_id).execute()

    rows = [
        {
            "document_id": doc_id,
            "chunk_index": i,
            "content": c.content,
            "section": c.section,
            "page_start": c.page_start,
            "page_end": c.page_end,
            "token_count": c.tokens,
            "embedding_model": EMBEDDING_MODEL,
            "embedding": vec.tolist(),
        }
        for i, (c, vec) in enumerate(zip(chunks, vectors))
    ]
    for start in range(0, len(rows), INSERT_BATCH_SIZE):
        sb.table("kb_chunks").insert(rows[start:start + INSERT_BATCH_SIZE]).execute()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    global CHUNK_MAX_TOKENS  # overridable by --chunk-tokens for chunk-size experiments
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="parse and chunk only; no embeddings, no DB")
    parser.add_argument("--show", type=int, default=0, help="print N sample chunks per document")
    parser.add_argument("--only", help="ingest only this file name from documents.json")
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    parser.add_argument("--chunk-tokens", type=int, default=CHUNK_MAX_TOKENS,
                        help=f"max tokens per chunk (default {CHUNK_MAX_TOKENS}); for chunk-size experiments")
    args = parser.parse_args()

    CHUNK_MAX_TOKENS = args.chunk_tokens

    load_dotenv(ROOT / ".env")
    manifest = json.loads(args.manifest.read_text())
    if args.only:
        manifest = [m for m in manifest if m["file"] == args.only]
    if not manifest:
        sys.exit(f"No documents to ingest — add entries to {args.manifest}")

    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL)
    model = sb = None
    if not args.dry_run:
        sb = get_supabase()  # fail fast on missing credentials, before the slow model load
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(EMBEDDING_MODEL)

    total_chunks = 0
    for meta in manifest:
        path = args.data_dir / meta["file"]
        if not path.exists():
            print(f"⚠️  skipping {meta['file']}: not found in {args.data_dir}")
            continue

        blocks, page_count = parse_pdf(path)
        if not blocks:
            print(f"⚠️  {meta['file']}: no text extracted (scanned PDF? needs OCR) — skipped")
            continue
        chunks = chunk_blocks(blocks, tokenizer)
        texts = [embedding_text(meta["title"], c) for c in chunks]

        # Guard against silent truncation by the embedding model.
        over = [i for i, t in enumerate(texts) if count_tokens(tokenizer, t) > MODEL_MAX_TOKENS - 2]
        if over:
            print(f"⚠️  {len(over)} chunk(s) exceed {MODEL_MAX_TOKENS} tokens with header: {over[:5]}")

        sizes = [c.tokens for c in chunks]
        print(f"📄 {meta['file']}: {page_count} pages → {len(blocks)} blocks → {len(chunks)} chunks "
              f"(tokens avg {sum(sizes) // len(sizes)}, min {min(sizes)}, max {max(sizes)})")

        for c in chunks[: args.show]:
            preview = c.content[:400].replace("\n", " ")
            print(f"   ── p.{c.page_start}-{c.page_end} | {c.section or '(no section)'} | {c.tokens} tok\n"
                  f"      {preview}{'…' if len(c.content) > 400 else ''}")

        if not args.dry_run:
            vectors = model.encode(texts, batch_size=EMBED_BATCH_SIZE,
                                   normalize_embeddings=True, show_progress_bar=True)
            store_document(sb, meta, page_count, chunks, vectors)
            print(f"   ✅ stored {len(chunks)} chunks")
        total_chunks += len(chunks)

    print(f"\nDone: {total_chunks} chunks{' (dry run — nothing stored)' if args.dry_run else ''}.")


if __name__ == "__main__":
    main()
