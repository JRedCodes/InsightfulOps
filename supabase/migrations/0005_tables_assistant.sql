-- InsightfulOps (MVP) - Assistant tables
-- Source of truth: docs/insightful_ops_db_schema_rls.md

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_company on public.conversations (company_id);
create index if not exists idx_conversations_user on public.conversations (created_by);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant')),
  content text not null,
  confidence numeric(4, 3),
  no_sufficient_sources boolean not null default false,
  needs_admin_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_company on public.messages (company_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id);

create table if not exists public.message_citations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_id uuid references public.document_chunks (id) on delete set null,
  excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_citations_company on public.message_citations (company_id);
create index if not exists idx_citations_message on public.message_citations (message_id);

create table if not exists public.assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating feedback_rating not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_company on public.assistant_feedback (company_id);
create index if not exists idx_feedback_message on public.assistant_feedback (message_id);
create index if not exists idx_feedback_user on public.assistant_feedback (user_id);

create table if not exists public.query_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  user_message_id uuid references public.messages (id) on delete set null,
  assistant_message_id uuid references public.messages (id) on delete set null,
  module text,
  latency_ms int,
  confidence numeric(4, 3),
  no_sufficient_sources boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_querylogs_company on public.query_logs (company_id);
create index if not exists idx_querylogs_created on public.query_logs (created_at);

