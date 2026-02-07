# InsightfulOps

AI-powered operations assistant for SMBs: **assistant-first**, **role-aware**, and **multi-tenant safe** (tenant isolation + RLS).

## Repo docs (start here)

- `docs/workflow_context.md` (how we work)
- `docs/deployment.md` (how to deploy)
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

### Get a Supabase access token (for curl testing)

If you call endpoints like `/api/me` or `/api/docs` you must replace `<access_token>` with a **real Supabase JWT**.

This uses the Supabase Auth password grant (for local testing only):

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon public key>"

# Avoid committing or pasting passwords into git. Use a throwaway test user.
read -s SUPABASE_EMAIL
read -s SUPABASE_PASSWORD

curl -sS "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPABASE_EMAIL\",\"password\":\"$SUPABASE_PASSWORD\"}"
```

Then use the returned `access_token`:

```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:4000/api/me
curl -H "Authorization: Bearer <access_token>" http://localhost:4000/api/docs
```

## Environment variables (names only)

Copy `.env.example` to `.env` (never commit `.env`).

### Frontend (`frontend/`)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Backend (`backend/`)

- `PORT` (default `4000`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENAI_API_KEY`
- `REDIS_URL` (required for running the ingestion worker; optional for API in dev)

## Status

Roadmap and current milestone live in `docs/gameplan.md`. Shipped/remaining tasks live in `docs/checklist.md`.
