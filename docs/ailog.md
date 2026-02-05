# AI / Debug Log — InsightfulOps

## 2026-02-05 — RLS recursion (stack depth exceeded) during impersonation tests

- **Context**: Running Supabase RLS verification via SQL Editor impersonation (`set local role authenticated` + `request.jwt.claim.sub`) for `current_company_id()` / role-based policies.
- **Symptoms**: `ERROR 54001: stack depth limit exceeded` with repeated `current_company_id()` calls.
- **Root cause**: RLS policies referenced helper functions (`current_company_id`, `current_role`) that query `public.profiles`, but `profiles` itself had RLS enabled and policies that referenced the same helpers → recursion.
- **Fix**: Introduced `SECURITY DEFINER` helper functions and applied via `supabase/migrations/0009_security_definer_helpers.sql`.
- **Preventative note**: For RLS helper functions that read RLS-protected tables, prefer `SECURITY DEFINER` (and set a safe `search_path`) or redesign policies to avoid querying protected tables inside policy helpers.
