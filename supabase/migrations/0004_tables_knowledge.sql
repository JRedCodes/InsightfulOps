-- InsightfulOps (MVP) - Knowledge base tables
-- Source of truth: docs/insightful_ops_db_schema_rls.md

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  file_path text not null,
  visibility doc_visibility not null default 'employee',
  status doc_status not null default 'processing',
  checksum text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_company on public.documents (company_id);
create index if not exists idx_documents_visibility on public.documents (visibility);
create index if not exists idx_documents_status on public.documents (status);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists idx_chunks_company on public.document_chunks (company_id);
create index if not exists idx_chunks_document on public.document_chunks (document_id);

-- Vector index (HNSW preferred; requires pgvector support in your Supabase project)
create index if not exists idx_chunks_embedding_hnsw
on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Retrieval function (tenant + visibility enforced)
create or replace function public.match_chunks(query_embedding vector(1536), match_count int default 8)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  visibility doc_visibility,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    d.id as document_id,
    d.title,
    d.visibility,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where
    c.company_id = public.current_company_id()
    and d.company_id = public.current_company_id()
    and d.status = 'indexed'::doc_status
    and public.visibility_allowed(d.visibility)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

