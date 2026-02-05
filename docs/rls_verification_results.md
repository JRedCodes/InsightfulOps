# RLS Verification Results

Use this doc to record the _actual_ verification pass from `docs/rls_verification_checklist.md`.

## Date

- 2026-02-05

## Supabase project

- Project ref:
- Region:

## Test users created

- CompanyA: A_admin, A_manager, A_employee
- CompanyB: B_admin

## Results

### Tenant isolation

- [ ] A_admin cannot read CompanyB rows
- [ ] A_employee cannot read CompanyB rows

### Profiles

- [ ] A_employee can only select self profile
- [ ] A_admin can list all profiles in CompanyA

### Documents visibility (CompanyA)

- [ ] A_employee sees only employee docs
- [x] A_manager sees employee + manager docs
- [ ] A_admin sees employee + manager + admin docs

### Chunks visibility (CompanyA)

- [ ] Chunk selects only return chunks for visible docs (and only when doc status is `indexed`)

### Conversations/messages ownership (MVP)

- [ ] A_employee can read own conversations/messages
- [ ] A_manager cannot read A_employee conversations/messages

### Scheduling permissions

- [ ] A_employee sees only own shifts
- [x] A_employee cannot insert/update/delete shifts
- [x] A_manager sees all CompanyA shifts
- [ ] A_manager can insert/update/delete shifts (CompanyA)

## Notes / issues

- Encountered RLS recursion (`ERROR 54001: stack depth limit exceeded`) when running impersonation queries that call `public.current_company_id()`/`public.current_role()` (because policies and helper functions both referenced `profiles`).
- Fix applied by running `supabase/migrations/0009_security_definer_helpers.sql` in Supabase (helper functions now `SECURITY DEFINER`).
- Verified denial: as `a_employee@example.com`, `insert into public.shifts (...)` fails with `ERROR 42501: new row violates row-level security policy for table "shifts"` (expected).
- Verified manager visibility: as `a_manager@example.com`, `select title, visibility from public.documents` returned `doc_employee` + `doc_manager` (expected).
- Verified manager can read shifts: as `a_manager@example.com`, `select user_id, role_label from public.shifts` returned the seeded company shift row (expected).
- Verified cross-tenant company isolation: as `b_admin@example.com`, selecting from `public.companies` returned only `CompanyB` (expected).
