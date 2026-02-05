# InsightfulOps DB Schema + RLS Policies

This doc defines the **PostgreSQL schema** (Supabase) and **Row Level Security (RLS)** policies for the InsightfulOps MVP.

Goals:

- **Multi-tenant isolation**: no cross-company reads/writes
- **Role-based access**: `employee | manager | admin`
- **RAG-safe**: assistant retrieval only sees docs/chunks permitted to the user
- **Auditable**: store queries, citations, feedback

> Note: In Supabase, you will use `auth.uid()` in SQL policies.

---

## 0) Extensions & Enums

```sql
-- Needed for vectors (pgvector)
create extension if not exists vector;

-- UUID generation (often enabled already)
create extension if not exists pgcrypto;

-- Roles
do $$ begin
  create type app_role as enum ('employee','manager','admin');
exception when duplicate_object then null; end $$;

-- Doc visibility
do $$ begin
  create type doc_visibility as enum ('employee','manager','admin');
exception when duplicate_object then null; end $$;

-- Document processing status
do $$ begin
  create type doc_status as enum ('processing','indexed','failed','archived');
exception when duplicate_object then null; end $$;

-- Feedback
do $$ begin
  create type feedback_rating as enum ('up','down');
exception when duplicate_object then null; end $$;
```

---

## 1) Core Tenant + Profile Tables

### 1.1 companies

```sql
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Los_Angeles',
  week_start text not null default 'MONDAY',
  shift_min_minutes int not null default 60,
  created_at timestamptz not null default now()
);
```

### 1.2 profiles (maps Supabase auth.users → app user)

```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  email text,
  role app_role not null default 'employee',
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_company on public.profiles(company_id);
create index if not exists idx_profiles_role on public.profiles(role);
```

### 1.3 Helper function: current user context

Centralize role + company lookup.

```sql
create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.profiles where user_id = auth.uid() and is_active = true
$$;

create or replace function public.current_role()
returns app_role
language sql
stable
as $$
  select role from public.profiles where user_id = auth.uid() and is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'::app_role
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('manager'::app_role,'admin'::app_role)
$$;

create or replace function public.visibility_allowed(v doc_visibility)
returns boolean
language sql
stable
as $$
  select case
    when public.current_role() = 'admin'::app_role then true
    when public.current_role() = 'manager'::app_role then v in ('employee'::doc_visibility,'manager'::doc_visibility)
    else v = 'employee'::doc_visibility
  end
$$;
```

---

## 2) Knowledge Base (Docs + Chunks)

### 2.1 documents

```sql
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  file_path text not null, -- path in Supabase Storage
  visibility doc_visibility not null default 'employee',
  status doc_status not null default 'processing',
  checksum text, -- optional: file hash for dedupe
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_company on public.documents(company_id);
create index if not exists idx_documents_visibility on public.documents(visibility);
create index if not exists idx_documents_status on public.documents(status);
```

### 2.2 document_chunks (text + vector)

> `embedding vector(1536)` assumes OpenAI embeddings size. Adjust as needed.

```sql
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists idx_chunks_company on public.document_chunks(company_id);
create index if not exists idx_chunks_document on public.document_chunks(document_id);

-- Vector index (choose one). HNSW is commonly preferred for pgvector.
-- Requires pgvector >= 0.5.0; Supabase typically supports it.
create index if not exists idx_chunks_embedding_hnsw
on public.document_chunks using hnsw (embedding vector_cosine_ops);
```

### 2.3 Retrieval function (server-side)

This function returns top chunks while enforcing tenant + visibility.

```sql
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_count int default 8
)
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
```

---

## 3) AI Assistant: Conversations, Messages, Logs

### 3.1 conversations

```sql
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_company on public.conversations(company_id);
create index if not exists idx_conversations_user on public.conversations(created_by);
```

### 3.2 messages

```sql
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('user','assistant')),
  content text not null,
  confidence numeric(4,3),
  no_sufficient_sources boolean not null default false,
  needs_admin_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_company on public.messages(company_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
```

### 3.3 message_citations

```sql
create table if not exists public.message_citations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_id uuid references public.document_chunks(id) on delete set null,
  excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_citations_company on public.message_citations(company_id);
create index if not exists idx_citations_message on public.message_citations(message_id);
```

### 3.4 assistant_feedback

```sql
create table if not exists public.assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating feedback_rating not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_company on public.assistant_feedback(company_id);
create index if not exists idx_feedback_message on public.assistant_feedback(message_id);
create index if not exists idx_feedback_user on public.assistant_feedback(user_id);
```

### 3.5 query_logs (analytics)

```sql
create table if not exists public.query_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  user_message_id uuid references public.messages(id) on delete set null,
  assistant_message_id uuid references public.messages(id) on delete set null,
  module text, -- e.g., 'assistant','scheduling'
  latency_ms int,
  confidence numeric(4,3),
  no_sufficient_sources boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_querylogs_company on public.query_logs(company_id);
create index if not exists idx_querylogs_created on public.query_logs(created_at);
```

---

## 4) Scheduling (MVP)

### 4.1 shifts

```sql
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  role_label text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_valid check (ends_at > starts_at)
);

create index if not exists idx_shifts_company on public.shifts(company_id);
create index if not exists idx_shifts_user on public.shifts(user_id);
create index if not exists idx_shifts_start on public.shifts(starts_at);
```

### 4.2 shift_change_requests (Phase 1.5 optional)

```sql
create table if not exists public.shift_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  requested_change text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shiftreq_company on public.shift_change_requests(company_id);
create index if not exists idx_shiftreq_shift on public.shift_change_requests(shift_id);
```

---

## 5) RLS Policies

### 5.1 Enable RLS

```sql
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_citations enable row level security;
alter table public.assistant_feedback enable row level security;
alter table public.query_logs enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_change_requests enable row level security;
```

---

## 6) RLS: companies

### Read own company

```sql
create policy "companies_select_own" on public.companies
for select
using (id = public.current_company_id());
```

### Update settings (admin only)

```sql
create policy "companies_update_admin" on public.companies
for update
using (id = public.current_company_id() and public.is_admin())
with check (id = public.current_company_id() and public.is_admin());
```

> Company creation is typically done via **service role** or a secure server endpoint; avoid allowing arbitrary client inserts.

---

## 7) RLS: profiles

### Select own profile

```sql
create policy "profiles_select_self" on public.profiles
for select
using (user_id = auth.uid());
```

### Admin can list/manage company users

```sql
create policy "profiles_select_company_admin" on public.profiles
for select
using (company_id = public.current_company_id() and public.is_admin());
```

### Users can update their own basic profile fields (not role/company)

```sql
create policy "profiles_update_self" on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

### Admin can update roles within company

```sql
create policy "profiles_update_company_admin" on public.profiles
for update
using (company_id = public.current_company_id() and public.is_admin())
with check (company_id = public.current_company_id() and public.is_admin());
```

> For stricter control, create separate columns editable by self vs admin and/or use DB triggers to prevent role changes by non-admin.

---

## 8) RLS: documents

### Select documents within company + allowed visibility

```sql
create policy "documents_select_visible" on public.documents
for select
using (
  company_id = public.current_company_id()
  and status <> 'archived'::doc_status
  and public.visibility_allowed(visibility)
);
```

### Admin insert/update/delete

```sql
create policy "documents_admin_insert" on public.documents
for insert
with check (company_id = public.current_company_id() and public.is_admin());

create policy "documents_admin_update" on public.documents
for update
using (company_id = public.current_company_id() and public.is_admin())
with check (company_id = public.current_company_id() and public.is_admin());

create policy "documents_admin_delete" on public.documents
for delete
using (company_id = public.current_company_id() and public.is_admin());
```

---

## 9) RLS: document_chunks

### Select chunks only if document is visible

```sql
create policy "chunks_select_visible" on public.document_chunks
for select
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.company_id = public.current_company_id()
      and d.status = 'indexed'::doc_status
      and public.visibility_allowed(d.visibility)
  )
);
```

### Admin insert/update/delete chunks (usually via worker/service role)

```sql
create policy "chunks_admin_insert" on public.document_chunks
for insert
with check (company_id = public.current_company_id() and public.is_admin());

create policy "chunks_admin_update" on public.document_chunks
for update
using (company_id = public.current_company_id() and public.is_admin())
with check (company_id = public.current_company_id() and public.is_admin());

create policy "chunks_admin_delete" on public.document_chunks
for delete
using (company_id = public.current_company_id() and public.is_admin());
```

> Recommended: In production, ingestion workers use Supabase **service role** bypassing RLS. For a resume project, either approach is fine.

---

## 10) RLS: conversations, messages, citations

### Conversations: owner-only (MVP)

```sql
create policy "conversations_select_owner" on public.conversations
for select
using (company_id = public.current_company_id() and created_by = auth.uid());

create policy "conversations_insert_owner" on public.conversations
for insert
with check (company_id = public.current_company_id() and created_by = auth.uid());

create policy "conversations_delete_owner" on public.conversations
for delete
using (company_id = public.current_company_id() and created_by = auth.uid());
```

### Messages: only within owner conversations

```sql
create policy "messages_select_owner" on public.messages
for select
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);

create policy "messages_insert_owner" on public.messages
for insert
with check (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);
```

### Citations: same as messages (scoped to owner)

```sql
create policy "citations_select_owner" on public.message_citations
for select
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);

create policy "citations_insert_owner" on public.message_citations
for insert
with check (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);
```

> Later: allow managers/admins to view aggregated knowledge gaps without seeing employee conversations by using `query_logs` (not conversations).

---

## 11) RLS: assistant_feedback, query_logs

### Feedback: user can create; admin can read aggregated (optional)

```sql
create policy "feedback_insert_self" on public.assistant_feedback
for insert
with check (company_id = public.current_company_id() and user_id = auth.uid());

create policy "feedback_select_self" on public.assistant_feedback
for select
using (company_id = public.current_company_id() and user_id = auth.uid());

create policy "feedback_select_admin" on public.assistant_feedback
for select
using (company_id = public.current_company_id() and public.is_admin());
```

### Query logs: insert by self; select by admin

```sql
create policy "querylogs_insert_self" on public.query_logs
for insert
with check (company_id = public.current_company_id() and user_id = auth.uid());

create policy "querylogs_select_admin" on public.query_logs
for select
using (company_id = public.current_company_id() and public.is_admin());
```

---

## 12) RLS: shifts

### Employees can view their own shifts

```sql
create policy "shifts_select_self" on public.shifts
for select
using (company_id = public.current_company_id() and user_id = auth.uid());
```

### Managers/admins can view all company shifts

```sql
create policy "shifts_select_manager" on public.shifts
for select
using (company_id = public.current_company_id() and public.is_manager_or_admin());
```

### Managers/admins can create/update/delete shifts

```sql
create policy "shifts_insert_manager" on public.shifts
for insert
with check (company_id = public.current_company_id() and public.is_manager_or_admin());

create policy "shifts_update_manager" on public.shifts
for update
using (company_id = public.current_company_id() and public.is_manager_or_admin())
with check (company_id = public.current_company_id() and public.is_manager_or_admin());

create policy "shifts_delete_manager" on public.shifts
for delete
using (company_id = public.current_company_id() and public.is_manager_or_admin());
```

---

## 13) RLS: shift_change_requests (optional)

### Employee can create request for own shift

```sql
create policy "shiftreq_insert_self" on public.shift_change_requests
for insert
with check (
  company_id = public.current_company_id()
  and requested_by = auth.uid()
  and exists (
    select 1 from public.shifts s
    where s.id = shift_id
      and s.company_id = public.current_company_id()
      and s.user_id = auth.uid()
  )
);
```

### Employee can view their own requests

```sql
create policy "shiftreq_select_self" on public.shift_change_requests
for select
using (company_id = public.current_company_id() and requested_by = auth.uid());
```

### Manager/admin can view and update requests

```sql
create policy "shiftreq_select_manager" on public.shift_change_requests
for select
using (company_id = public.current_company_id() and public.is_manager_or_admin());

create policy "shiftreq_update_manager" on public.shift_change_requests
for update
using (company_id = public.current_company_id() and public.is_manager_or_admin())
with check (company_id = public.current_company_id() and public.is_manager_or_admin());
```

---

## 14) Notes on Storage Policies (Supabase Storage)

If storing docs in Supabase Storage, mirror the same principles:

- Bucket: `company-docs`
- Path convention: `company_id/<document_id>/<filename>`

Storage policies:

- Read: users can read objects where the path begins with their `company_id`
- Write: admin only

(Implement in Supabase Storage policy editor; use `public.current_company_id()` via SQL if available, otherwise store `company_id` in metadata.)

---

## 15) Recommended Next Steps

1. Implement schema + RLS in Supabase SQL editor (in small chunks).
2. Add seed script to create:
   - one company
   - one admin user profile
3. Build a “RLS test checklist”:
   - employee cannot see manager/admin docs
   - cannot query other company rows
   - manager can create shifts but employee cannot
4. Only then start wiring API routes.
