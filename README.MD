# InsightfulOps

AI-powered operations assistant for SMBs: **assistant-first**, **role-aware**, and **multi-tenant safe** (tenant isolation + RLS).

## Repo docs (start here)

- `docs/workflow_context.md` (how we work)
- `docs/insightful_ops_prd.md` (scope/non-goals)
- `docs/insightful_ops_api.md` (endpoint contracts)
- `docs/insightful_ops_db_schema_rls.md` (schema + RLS source of truth)
- `docs/insightful_ops_frontend.md` (frontend routing/layout conventions)

## Structure

```txt
InsightfulOps/
├── frontend/   # React + TS + Vite
├── backend/    # Node + TS + Express
└── docs/       # product + architecture + roadmap
```

## Local development

### Prereqs

- Node (>= 20 recommended)

### Install

```bash
npm install
```

### Run (frontend + backend)

```bash
npm run dev
```

- Frontend dev server: Vite default (usually `http://localhost:5173`)
- Backend API: `http://localhost:4000/api`
  - Health: `GET /api/health`

### Run checks

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
```

## Environment variables (names only)

Copy `.env.example` to `.env` (never commit `.env`).

### Frontend (`frontend/`)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Backend (`backend/`)

- `PORT` (default `4000`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENAI_API_KEY`
- `REDIS_URL`

## Status

Roadmap and current milestone live in `docs/gameplan.md`. Shipped/remaining tasks live in `docs/checklist.md`.
