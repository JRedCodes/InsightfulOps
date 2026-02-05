-- InsightfulOps (MVP) - SECURITY DEFINER helpers
--
-- Fixes stack-depth recursion when helper functions are used by RLS policies
-- and those helper functions read tables that have RLS enabled (e.g. profiles).
--
-- This makes helper functions execute with the privileges of the function owner
-- (typically the migration/SQL editor owner), which bypasses RLS unless FORCE
-- RLS is enabled on the table.

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
$$;

create or replace function public.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'::app_role
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('manager'::app_role, 'admin'::app_role)
$$;

create or replace function public.visibility_allowed(v doc_visibility)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_role() = 'admin'::app_role then true
    when public.current_role() = 'manager'::app_role then
      v in ('employee'::doc_visibility, 'manager'::doc_visibility)
    else v = 'employee'::doc_visibility
  end
$$;

