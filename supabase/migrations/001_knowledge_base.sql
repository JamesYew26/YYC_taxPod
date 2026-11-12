-- =====================================================================
-- 001_knowledge_base.sql
-- Knowledge base for the Tax Document Q&A (RAG) module.
-- Run once in the Supabase SQL Editor (safe to re-run).
-- =====================================================================

create extension if not exists vector;

-- One row per source document (PDF).
create table if not exists kb_documents (
  id           bigint generated always as identity primary key,
  file_name    text not null unique,          -- key used by the ingestion script for re-runs
  title        text not null,                 -- shown in citations
  doc_type     text not null
               check (doc_type in ('public_ruling', 'sst', 'e_invoice', 'other')),
  source_url   text,
  page_count   int,
  ingested_at  timestamptz not null default now()
);

-- One row per chunk of text, with its embedding.
create table if not exists kb_chunks (
  id               bigint generated always as identity primary key,
  document_id      bigint not null references kb_documents(id) on delete cascade,
  chunk_index      int  not null,             -- order within the document
  content          text not null,             -- raw chunk text (what the LLM sees)
  section          text,                      -- nearest numbered heading, e.g. "5.2 Exemption"
  page_start       int  not null,             -- 1-based physical PDF page
  page_end         int  not null,
  token_count      int  not null,
  embedding_model  text not null,             -- e.g. 'thenlper/gte-base' (vectors from different models are not comparable)
  embedding        vector(768) not null,
  -- Keyword-search column for hybrid retrieval (bonus): kept in sync automatically.
  fts              tsvector generated always as (to_tsvector('english', content)) stored,
  unique (document_id, chunk_index)
);

-- Approximate nearest-neighbour index for cosine distance (<=>).
-- At this scale an exact scan is also fast; the index is here for production scale.
create index if not exists kb_chunks_embedding_hnsw
  on kb_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists kb_chunks_fts_gin on kb_chunks using gin (fts);
create index if not exists kb_chunks_document_id on kb_chunks (document_id);

-- RLS on with no policies: only the server-side secret key can read/write.
-- The browser never talks to these tables directly.
alter table kb_documents enable row level security;
alter table kb_chunks    enable row level security;

-- ---------------------------------------------------------------------
-- match_chunks: top-k cosine similarity search with optional doc_type filter.
-- Returns scores without applying a threshold (threshold lives in app code — D-004).
-- ---------------------------------------------------------------------
create or replace function match_chunks(
  query_embedding  vector(768),
  match_count      int  default 5,
  filter_doc_type  text default null
)
returns table (
  chunk_id     bigint,
  document_id  bigint,
  title        text,
  doc_type     text,
  source_url   text,
  section      text,
  page_start   int,
  page_end     int,
  content      text,
  similarity   float
)
language sql stable
as $$
  select
    c.id,
    d.id,
    d.title,
    d.doc_type,
    d.source_url,
    c.section,
    c.page_start,
    c.page_end,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity   -- distance -> similarity
  from kb_chunks c
  join kb_documents d on d.id = c.document_id
  -- Note: with the HNSW index this filter is applied AFTER the approximate
  -- candidate set is collected, so a narrow filter can return < match_count rows.
  where filter_doc_type is null or d.doc_type = filter_doc_type
  order by c.embedding <=> query_embedding asc              -- smallest distance first
  limit match_count;
$$;
