# InsightfulOps — Rolling Checklist

Rules (per `docs/workflow_context.md`):

- Mark items complete **only when merged/tested** (for now, treat “complete” as “implemented + verified locally” until git/PR flow exists).
- Keep this list aligned to `docs/gameplan.md`.

---

## Milestone 0 — Repo scaffold + local dev + tests baseline

- [x] Initialize git repo (`git init`) and add `.gitignore`
- [x] Pick workspace tool (npm workspaces vs pnpm) and document in README
- [x] Create `frontend/` scaffold (Vite + React + TS)
- [x] Add Tailwind + base styles (`globals.css`)
- [x] Add routing skeleton per `docs/insightful_ops_frontend.md`
  - [x] Public routes: `/`, `/login`, `/signup`
  - [x] Protected routes: `/app/assistant`, `/app/schedule`, `/app/history`
  - [x] Admin routes: `/app/admin/*` gated by role
- [x] Add frontend state foundations
  - [x] Auth context (Supabase auth client)
  - [x] TanStack Query provider
- [x] Create `backend/` scaffold (Node + Express + TS)
- [x] Implement `GET /api/health` (public)
- [x] Add backend test setup + a passing `/health` test
- [x] Add frontend test setup + a passing smoke test
- [x] Add lint/format/typecheck scripts (frontend + backend)
- [x] Add CI workflow to run lint/typecheck/tests
- [x] Expand `README.MD` with local run instructions + env var names (no values)

---

## Milestone 1 — Supabase schema + RLS verified

- [x] Create Supabase project
- [x] Apply schema + enums + extensions
- [x] Apply helper functions (`current_company_id`, `current_role`, etc.)
- [x] Apply tables (companies, profiles, documents, chunks, conversations, messages, citations, feedback, logs, shifts)
- [x] Enable RLS on all tables
- [x] Apply RLS policies (tenant + role + ownership)
- [ ] Document + run an RLS verification pass
  - [ ] Cross-tenant read blocked
  - [ ] Doc visibility enforced (employee vs manager vs admin)
  - [ ] Scheduling permissions enforced (employee self vs manager/admin company)

---

## Milestone 2 — Backend API foundation (auth + core endpoints)

- [x] Supabase JWT verification middleware
- [x] Request context derived server-side (`user_id`, `company_id`, `role`)
- [ ] Standard response shape implemented (`{ ok, data }`, `{ ok, error }`)
- [x] `GET /api/me`
- [x] `POST /api/companies` (onboarding create company + set caller admin)
- [x] `PATCH /api/companies/settings` (admin)
- [x] `GET /api/users` (admin)
- [x] `PATCH /api/users/:id/role` (admin)
- [x] `DELETE /api/users/:id` (admin deactivate)
- [x] `GET /api/docs` (visibility-scoped)
- [ ] `POST /api/docs` (admin upload + enqueue)
- [ ] `POST /api/docs/:id/reindex` (admin)
- [ ] `DELETE /api/docs/:id` (admin archive)
- [x] `GET /api/conversations` (self)
- [x] `GET /api/conversations/:id` (self)
- [x] `GET /api/schedule/me`
- [x] `GET /api/schedule/team` (manager/admin)
- [ ] Backend tests for each endpoint as it lands (minimum: happy path + one auth/role failure)

---

## Milestone 3 — Docs ingestion + embeddings + retrieval

- [ ] Supabase Storage bucket + tenant path convention (`company_id/<document_id>/<filename>`)
- [ ] Worker/job system wired (BullMQ + Redis)
- [ ] Text extraction for PDF/DOCX/MD
- [ ] Chunking (size + overlap) + unit tests
- [ ] Embeddings generation (OpenAI) + safe retries/backoff
- [ ] Store chunks + mark document `status` transitions (`processing` → `indexed` / `failed`)
- [ ] Retrieval uses `match_chunks` (tenant + visibility enforced)
- [ ] Basic observability (logs + failure reasons)

---

## Milestone 4 — Assistant UX + citations + history

- [ ] `POST /api/assistant/chat` returns:
  - [x] assistant text (stub)
  - [x] confidence (stubbed as `null` for now)
  - [x] citations array (empty for now)
  - [x] flags (`no_sufficient_sources`, `needs_admin_review`)
- [x] Persist conversations/messages to DB
- [ ] Persist message citations to DB
- [ ] Assistant page UI (`/app/assistant`)
  - [ ] Message list
  - [ ] Chat input
  - [ ] Citation UI
  - [ ] “No sufficient sources” UI state
- [ ] Conversation history page (`/app/history`)
- [ ] Feedback endpoint + UI (thumbs up/down)
  - [x] Feedback endpoint (`POST /api/assistant/feedback`)
  - [ ] Feedback UI

---

## Milestone 5 — Scheduling (API + UI)

- [ ] `GET /api/schedule/me` (employee self; manager/admin also ok)
- [ ] `GET /api/schedule/team` (manager/admin only)
- [x] `POST /api/schedule/shifts` (manager/admin) (API)
- [x] `PATCH /api/schedule/shifts/:id` (manager/admin) (API)
- [x] `DELETE /api/schedule/shifts/:id` (manager/admin) (API)
- [ ] Schedule page UI (`/app/schedule`)
  - [ ] Employee weekly view
  - [ ] Manager team view
  - [ ] Shift modal CRUD (manager/admin)
- [ ] Tests: backend role checks + key frontend interaction(s)

---

## Milestone 6 — Admin console (users, docs, settings)

- [ ] Admin shell + nav (`/app/admin/*`)
- [ ] Users page (list + role change + deactivate)
- [ ] Docs page (upload + status + reindex + archive)
- [ ] Settings page (timezone/week start/shift min)
- [ ] Confirm UI gating + API gating + RLS all align

---

## Milestone 7 — Hardening + deployability

- [ ] Rate limiting (Redis) on key endpoints (assistant, docs upload)
- [ ] Error handling + logging conventions
- [ ] Production build + deploy plan documented
- [ ] README finalized for “run locally” + “deploy” steps

---

## Housekeeping

- [ ] Resolve naming mismatch: workflow references `docs/ailogs.md` but repo has `docs/ailog.md`
