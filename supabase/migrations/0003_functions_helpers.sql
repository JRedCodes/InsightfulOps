-- InsightfulOps (MVP) - Helper functions for role + tenant context
-- Source of truth: docs/insightful_ops_db_schema_rls.md

create or replace function public.current_company_id()
returns uuid
language sql
stable
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
as $$
  select public.current_role() = 'admin'::app_role
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('manager'::app_role, 'admin'::app_role)
$$;

create or replace function public.visibility_allowed(v doc_visibility)
returns boolean
language sql
stable
as $$
  select case
    when public.current_role() = 'admin'::app_role then true
    when public.current_role() = 'manager'::app_role then v in ('employee'::doc_visibility, 'manager'::doc_visibility)
    else v = 'employee'::doc_visibility
  end
$$;

