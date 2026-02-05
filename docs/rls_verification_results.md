# RLS Verification Results

Use this doc to record the _actual_ verification pass from `docs/rls_verification_checklist.md`.

## Date

- YYYY-MM-DD

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
- [ ] A_manager sees employee + manager docs
- [ ] A_admin sees employee + manager + admin docs

### Chunks visibility (CompanyA)

- [ ] Chunk selects only return chunks for visible docs (and only when doc status is `indexed`)

### Conversations/messages ownership (MVP)

- [ ] A_employee can read own conversations/messages
- [ ] A_manager cannot read A_employee conversations/messages

### Scheduling permissions

- [ ] A_employee sees only own shifts
- [ ] A_employee cannot insert/update/delete shifts
- [ ] A_manager sees all CompanyA shifts
- [ ] A_manager can insert/update/delete shifts (CompanyA)

## Notes / issues

-
