# InsightfulOps — Gameplan (Evolving Roadmap)

This is the working build plan for the InsightfulOps resume‑grade MVP. It is **docs-first**, **incremental**, and **test-backed** (per `docs/workflow_context.md`).

---

## Current Milestone

**Milestone 0: Repo scaffold + local dev + testing baseline**

Goal: turn this docs-only repo into a runnable, testable monorepo (frontend + backend) without making product-scope decisions outside the PRD.

---

## North Star (Phase 1 MVP)

Ship a multi-tenant, role-aware web app where:

- Users authenticate via Supabase Auth
- The Assistant answers questions using **company docs only**, returning **citations** or a safe “no sufficient sources” response
- Admins can upload docs (PDF/DOCX/MD), which are chunked + embedded asynchronously and stored per tenant
- Scheduling is viewable (employee = self; manager/admin = team) with basic shift CRUD (manager/admin)
- All data access is protected by **tenant isolation + RLS** plus server route guards

Primary sources of truth:

- PRD: `docs/insightful_ops_prd.md`
- API: `docs/insightful_ops_api.md`
- DB/RLS: `docs/insightful_ops_db_schema_rls.md`
- Frontend: `docs/insightful_ops_frontend.md`

---

## Work Breakdown (Phases)

### Phase 0 — Repo Scaffolding (Milestone 0)

**Outcome:** local dev works, tests run, repo structure matches frontend doc.

- **Create monorepo structure**
  - `frontend/` (Vite + React + TS + Tailwind, React Router, TanStack Query, Zod)
  - `backend/` (Node + Express + TS)
  - Shared types package if helpful (`packages/shared/`) or keep minimal for MVP
- **Dev tooling**
  - Lint/format (ESLint + Prettier)
  - Typecheck scripts
  - Basic CI workflow (run lint + typecheck + tests)
- **Testing baseline**
  - Backend: request/integration-ish tests for at least `/health`
  - Frontend: component smoke test (route shell loads)
- **Docs**
  - Expand `README.MD` with local run steps + env var names (no values)
  - Ensure `docs/checklist.md` mirrors this plan

**Exit criteria**

- `frontend` dev server runs and builds
- `backend` starts and serves `GET /api/health`
- `pnpm test` / `npm test` (whatever we choose) passes locally
- CI (if added) passes

**Verification**

- Run backend tests and hit `GET /api/health`
- Run frontend tests and load `/` in browser

---

### Phase 1 — Supabase Project + DB/RLS (Milestone 1)

**Outcome:** schema exists, RLS is enabled, and core access rules are verified.

- Apply schema + RLS from `docs/insightful_ops_db_schema_rls.md` in small chunks
- Add a minimal “RLS verification checklist” and/or script
  - employee cannot see manager/admin docs
  - cannot read other company rows
  - manager/admin can manage shifts; employee cannot
- Implement onboarding path for company creation (`POST /companies`) per API doc

**Exit criteria**

- Tables + functions created; RLS policies enabled
- Manual verification steps documented and repeatable

**Verification**

- Use Supabase SQL editor + Auth users to validate expected denies/allows

---

### Phase 2 — Backend API Foundation (Milestone 2)

**Outcome:** server authenticates requests, derives `user_id/company_id/role`, and exposes MVP endpoints.

- Project skeleton: Express app, routing, error handler, request validation
- Auth middleware: verify Supabase JWT, populate request context
- Implement endpoints (in smallest shippable order):
  - `GET /health` (public)
  - `GET /me`
  - `GET /docs` (visibility-scoped list)
  - `POST /assistant/chat` (stubbed response first, then real)
  - Scheduling endpoints (`/schedule/me`, `/schedule/team`, shift CRUD)
- Add tests as endpoints land (Supertest-style)

**Exit criteria**

- Each shipped endpoint has at least a basic test
- Tenant scoping is enforced server-side (never accept `company_id` from client)

**Verification**

- Run test suite
- Make sample requests with valid/invalid JWT and confirm access rules

---

### Phase 3 — Docs Ingestion + Embeddings + Retrieval (Milestone 3)

**Outcome:** admin can upload docs; system indexes; retrieval returns authorized chunks.

- Storage: tenant-scoped path convention (per DB/RLS doc notes)
- Ingestion worker (BullMQ + Redis) to:
  - extract text (PDF/DOCX/MD)
  - chunk (size + overlap)
  - embed (OpenAI)
  - store chunks + mark doc status
- Retrieval function usage (`match_chunks`) for assistant RAG
- Observability: log failures, doc status transitions
- Tests: unit tests for chunking + visibility filtering; integration-ish test for `/docs` upload enqueue behavior

**Exit criteria**

- Upload → processing → indexed path works end-to-end
- Retrieval respects tenant + visibility

**Verification**

- Upload a doc, confirm status changes, confirm chunks stored, run a retrieval query

---

### Phase 4 — Assistant UX + Conversation History (Milestone 4)

**Outcome:** assistant-first UI working with citations and “no sufficient sources” behavior.

- Frontend routing/layout per `docs/insightful_ops_frontend.md`
- Assistant UI:
  - chat input, message list, citation UI, confidence display
  - safe fallback when no sources
- Persist conversations/messages per schema
- Tests: route gating basics + assistant message rendering

**Exit criteria**

- Chat round-trip works; citations display; history loads

**Verification**

- Ask a question with matching doc content → citations appear
- Ask a question without support → “no sufficient sources” returned

---

### Phase 5 — Scheduling UX (Milestone 5)

**Outcome:** employee sees their schedule; manager/admin sees team schedule; manager/admin can CRUD shifts.

- Implement schedule pages per frontend doc
- Wire endpoints and enforce role checks
- Tests: backend role checks + a key frontend interaction (shift modal open/save)

**Exit criteria**

- Role-aware scheduling works without data leakage

**Verification**

- Log in as employee vs manager vs admin and confirm access differences

---

### Phase 6 — Admin Console (Milestone 6)

**Outcome:** admin can manage docs + (basic) user management and business settings.

- Admin routes/shell
- Docs admin: upload, list, reindex, archive
- Users admin: list, change role, deactivate
- Settings: timezone/week start/shift min

**Exit criteria**

- Admin-only screens are gated (UI + API + RLS)

**Verification**

- Confirm employee/manager cannot access admin routes/endpoints

---

### Phase 7 — MVP Hardening + Deployment (Milestone 7)

**Outcome:** deployable demo with safe defaults and a clean README.

- Production env config + secrets handling (names only in repo)
- Basic rate limiting (Redis) per API doc
- Logging/error reporting (minimal)
- Deploy frontend + backend
- “How to verify” runbook for Jacob

**Exit criteria**

- A new user can follow README to run locally
- Deployed environment is stable for demo

---

## Dependencies / External Requirements (Hard Blockers When Implementing)

- Supabase project URL + anon key + service role key (server-only)
- OpenAI API key (embeddings + assistant)
- Redis (BullMQ + rate limiting)
- PostHog + Sentry (optional; only if we choose to include)

Per workflow: **stop and ask Jacob** when any of these are required.

---

## Decisions (Lightweight ADR)

Record major decisions here as they are made.

- **[Decided] Monorepo package manager**: npm workspaces (single root `package-lock.json`).
- **[Decided] Test runners**: Vitest for both frontend and backend.
- **[Pending] Doc ingestion**: server-only with service role vs admin-only RLS inserts (doc suggests service role in production).
- **[Housekeeping] Debug log filename**: workflow references `docs/ailogs.md` but repo currently has `docs/ailog.md`.

---

## First Smallest Shippable Increment (Next Work Unit)

**chore/repo-scaffold** (target: Phase 0 slice)

- Initialize git repo + baseline `.gitignore`
- Create `frontend/` scaffold per frontend doc and add a basic route shell
- Create `backend/` scaffold with `GET /api/health` + tests
- Add minimal lint/test scripts and update README with run steps
