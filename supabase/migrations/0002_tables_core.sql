-- InsightfulOps (MVP) - Core tenant + profile tables
-- Source of truth: docs/insightful_ops_db_schema_rls.md

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Los_Angeles',
  week_start text not null default 'MONDAY',
  shift_min_minutes int not null default 60,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  email text,
  role app_role not null default 'employee',
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_company on public.profiles (company_id);
create index if not exists idx_profiles_role on public.profiles (role);

