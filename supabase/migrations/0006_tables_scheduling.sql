-- InsightfulOps (MVP) - Scheduling tables
-- Source of truth: docs/insightful_ops_db_schema_rls.md

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  role_label text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_valid check (ends_at > starts_at)
);

create index if not exists idx_shifts_company on public.shifts (company_id);
create index if not exists idx_shifts_user on public.shifts (user_id);
create index if not exists idx_shifts_start on public.shifts (starts_at);

-- Optional (Phase 1.5): shift change requests
create table if not exists public.shift_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  requested_change text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shiftreq_company on public.shift_change_requests (company_id);
create index if not exists idx_shiftreq_shift on public.shift_change_requests (shift_id);

