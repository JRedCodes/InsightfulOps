## Deployment guide (MVP)

This repo has **two backend processes**:

- **API**: Express server (`backend/src/server.ts`)
- **Worker**: BullMQ worker (`backend/src/worker.ts`) for doc ingestion

And a **frontend**:

- React + Vite (`frontend/`)

Supabase hosts the database, auth, and storage.

---

## Recommended production setup

### Services

- **Frontend**: static hosting (e.g. Vercel/Netlify/Cloudflare Pages)
- **Backend API**: Node service (e.g. Render/Fly/Railway)
- **Worker**: Node service (same image/repo, different start command)
- **Redis**: managed Redis with TLS (Upstash / Redis Cloud / Railway Redis)
- **Supabase**: your existing project (DB + Auth + Storage)

---

## Environment variables

### Backend (API + Worker)

- `PORT` (platform-provided; default 4000 locally)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (used for user-scoped PostgREST requests)
- `SUPABASE_SERVICE_ROLE_KEY` (**server-only**, required for:
  - Storage upload/download
  - ingestion writes to `documents`/`document_chunks` bypassing RLS
)
- `REDIS_URL` (**required for worker**, optional for API in dev)
- `OPENAI_API_KEY` (required once embeddings/chat are enabled)

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Build + start commands

### Backend

- **Build**: `npm -w backend run build`
- **Start API**: `npm -w backend run start`
- **Start worker**: `npm -w backend run worker`

> Local dev uses watchers:
> - API: `npm -w backend run dev`
> - Worker: `npm -w backend run dev:worker`

### Frontend

- **Build**: `npm -w frontend run build`
- **Preview locally**: `npm -w frontend run preview`

---

## Supabase setup checks (production)

### Storage

- Create bucket: **`company-docs`** (private)
- Ensure storage policies align with tenant isolation:
  - Writes restricted (admin-only or service-role only)
  - Reads restricted by tenant (or use signed URLs later)

### DB + RLS

- `pgvector` extension enabled (`create extension if not exists vector;`)
- Table exists: `public.document_chunks` with `embedding vector(1536)` column
- Function exists: `public.match_chunks(...)`
- RLS enabled and policies applied (see `docs/insightful_ops_db_schema_rls.md`)

---

## Codebase changes needed for production

These are the common adjustments you will likely make before going live:

### 1) Tighten CORS

Right now the backend allows all origins via default `cors()` settings.
In production, restrict to your frontend origin:

- Allowlist your deployed frontend URL(s)
- Allow credentials only if needed

### 2) Production env (don’t rely on `.env` files)

The backend loads `.env` for local dev convenience. In production:

- set environment variables in your hosting provider
- do **not** upload `.env`

### 3) Run the worker as a separate process

Your hosting should run two processes:

- API: `npm -w backend run start`
- Worker: `npm -w backend run worker`

Both need the same backend env vars; the worker additionally requires `REDIS_URL`.

### 4) Health checks

- API health endpoint: `GET /api/health`
- Consider adding a simple worker “alive” log or metric (optional)

---

## Example: “same repo, two services” pattern

Most platforms support two services pointing at the same repo:

- **Service A (API)**: build → `npm -w backend run build`, start → `npm -w backend run start`
- **Service B (Worker)**: build → `npm -w backend run build`, start → `npm -w backend run worker`

And one managed Redis + one Supabase project.

