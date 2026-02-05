# RLS Verification Checklist (Supabase)

This is a manual verification pass for the schema + RLS in `docs/insightful_ops_db_schema_rls.md`.

## Setup

- Create **two companies**: `CompanyA`, `CompanyB`
- Create users:
  - **A_admin** (company A, role `admin`)
  - **A_manager** (company A, role `manager`)
  - **A_employee** (company A, role `employee`)
  - **B_admin** (company B, role `admin`)

## Core expectations (must pass)

### Tenant isolation

- [ ] As **A_admin**, selecting from tables scoped by `company_id` cannot return any `CompanyB` rows.
- [ ] As **A_employee**, same (no cross-tenant reads).

### Profiles

- [ ] As **A_employee**, `select * from public.profiles` only returns **self**.
- [ ] As **A_admin**, `select * from public.profiles` returns all profiles in company A.

### Documents visibility

Seed 3 docs in company A:

- `doc_employee` visibility = `employee`
- `doc_manager` visibility = `manager`
- `doc_admin` visibility = `admin`

- [ ] As **A_employee**, `select * from public.documents` returns only `doc_employee`.
- [ ] As **A_manager**, returns `doc_employee` + `doc_manager`.
- [ ] As **A_admin**, returns all 3.

### Chunks visibility

Seed chunks for each doc and set doc status to `indexed`.

- [ ] As **A_employee**, `select * from public.document_chunks` only returns chunks belonging to visible docs.
- [ ] As **A_manager**, same.
- [ ] As **A_admin**, same.

### Conversations/messages ownership (MVP)

- [ ] As **A_employee**, create a conversation and messages; you can read them back.
- [ ] As **A_manager** (same company), you **cannot** read A_employee’s conversation/messages.

### Scheduling permissions

- [ ] As **A_employee**, `select * from public.shifts` returns only own shifts.
- [ ] As **A_employee**, inserting/updating/deleting shifts fails.
- [ ] As **A_manager**, `select * from public.shifts` returns all company A shifts.
- [ ] As **A_manager**, inserting/updating/deleting shifts succeeds (within company A).

## Notes / gotchas to watch for

- `public.current_company_id()` and `public.current_role()` depend on `public.profiles` being populated for each auth user.
- Document chunk visibility requires the document `status = indexed` (per retrieval/policy rules).
- If you see `ERROR: 54001: stack depth limit exceeded` mentioning `current_company_id`, run `supabase/migrations/0009_security_definer_helpers.sql` (or apply the equivalent SQL) to avoid RLS recursion.
