# InsightfulOps API (`api.md`)

This document defines the initial HTTP API for **InsightfulOps** (Resume-grade MVP). The API supports a multi-tenant, role-based SaaS with an AI assistant, internal docs ingestion (RAG), and basic scheduling.

**Key principles**

- **Tenant isolation:** Every request is scoped to a `company_id` derived from the authenticated user.
- **RBAC:** Roles: `employee`, `manager`, `admin`.
- **Defense in depth:** UI role gating + server route guards + database RLS.
- **Async by default:** Document ingestion/embedding runs via background jobs.
- **Citations required:** Assistant responses must include citations when possible; otherwise return an explicit “no sufficient sources” result.

---

## 1. Conventions

### Base URL

- Local: `http://localhost:4000/api`
- Production: `https://api.<domain>/api`

### Auth

- Client authenticates with **Supabase Auth**.
- Backend expects a Supabase JWT on each request:
  - `Authorization: Bearer <access_token>`

The backend verifies the token and derives:

- `user_id`
- `company_id`
- `role`

### Standard Response Shape

All endpoints return JSON.

Success:

```json
{ "ok": true, "data": {} }
```

Error:

```json
{ "ok": false, "error": { "code": "STRING", "message": "Human readable" } }
```

### Pagination

List endpoints accept:

- `limit` (default 25, max 100)
- `cursor` (opaque)

### Rate Limiting (MVP)

- Per-user + per-company limits, implemented with Redis.

---

## 2. Roles & Access Matrix (MVP)

| Area                        | Employee | Manager | Admin |
| --------------------------- | -------: | ------: | ----: |
| AI Assistant chat           |       ✅ |      ✅ |    ✅ |
| Conversation history (self) |       ✅ |      ✅ |    ✅ |
| Team schedule view          |       ❌ |      ✅ |    ✅ |
| Propose schedule change     |       ❌ |      ✅ |    ✅ |
| Doc upload / reindex        |       ❌ |      ❌ |    ✅ |
| User management             |       ❌ |      ❌ |    ✅ |
| Business settings           |       ❌ |      ❌ |    ✅ |

---

## 3. Entities (Conceptual)

- `Company`
- `User` (role)
- `Document` (visibility level)
- `DocumentVersion` (optional in MVP)
- `EmbeddingChunk`
- `Conversation`
- `Message`
- `QueryLog`
- `Schedule`
- `Shift`
- `ScheduleChangeRequest` (optional)

---

## 4. Endpoints

### 4.1 Health

#### `GET /health`

Public.

Response:

```json
{ "ok": true, "data": { "status": "up" } }
```

---

### 4.2 Auth & Session

> Supabase handles auth; backend provides a session “whoami” for convenience.

#### `GET /me`

Roles: any authenticated.

Response:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "role": "employee",
      "company_id": "uuid"
    }
  }
}
```

---

### 4.3 Companies (Onboarding)

#### `POST /companies`

Creates a company workspace (first admin).

Roles: authenticated user (during onboarding). Server will assign caller as `admin`.

Body:

```json
{ "name": "Acme Markets" }
```

Response:

```json
{ "ok": true, "data": { "company": { "id": "uuid", "name": "Acme Markets" } } }
```

#### `PATCH /companies/settings`

Update business settings.

Roles: `admin`.

Body (example):

```json
{
  "timezone": "America/Los_Angeles",
  "week_start": "MONDAY",
  "shift_min_minutes": 60
}
```

---

### 4.4 Users (Admin)

#### `GET /users`

List users in company.

Roles: `admin`.

Query:

- `limit`, `cursor`

#### `POST /users/invite`

Invite a user (email). MVP can be “create user record + send email”.

Roles: `admin`.

Body:

```json
{ "email": "new@company.com", "role": "employee" }
```

#### `PATCH /users/:id/role`

Change a user role.

Roles: `admin`.

Body:

```json
{ "role": "manager" }
```

#### `DELETE /users/:id`

Deactivate user (soft delete).

Roles: `admin`.

---

### 4.5 Documents (Knowledge Base)

#### `GET /docs`

List documents.

Roles:

- `admin`: all docs
- `manager`: manager + employee-visible
- `employee`: employee-visible

Query:

- `visibility` (optional)
- `status` (optional: `processing|indexed|failed`)
- `limit`, `cursor`

#### `POST /docs`

Upload a document and enqueue ingestion.

Roles: `admin`.

Content-Type: `multipart/form-data`
Fields:

- `file` (required)
- `title` (optional)
- `visibility` (required: `employee|manager|admin`)

Response:

```json
{
  "ok": true,
  "data": {
    "doc": {
      "id": "uuid",
      "title": "Employee Handbook",
      "visibility": "employee",
      "status": "processing"
    }
  }
}
```

#### `GET /docs/:id`

Get doc metadata.

Roles: visibility-scoped.

#### `POST /docs/:id/reindex`

Re-run ingestion/embedding.

Roles: `admin`.

#### `DELETE /docs/:id`

Archive doc (soft delete).

Roles: `admin`.

#### `GET /docs/:id/chunks`

Returns chunks/snippets for citations and debugging.

Roles:

- `admin`: all
- `manager/employee`: only if doc is visible to them

---

### 4.6 AI Assistant

#### `POST /assistant/chat`

Primary endpoint for the assistant.

Roles: any authenticated.

Body:

```json
{
  "conversation_id": "uuid-or-null",
  "message": "How do I request PTO?",
  "context": {
    "module": "assistant",
    "page": "/app/assistant"
  }
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "conversation_id": "uuid",
    "assistant_message": {
      "id": "uuid",
      "text": "...answer...",
      "confidence": 0.82,
      "citations": [
        {
          "doc_id": "uuid",
          "title": "Employee Handbook",
          "chunk_id": "uuid",
          "excerpt": "...short excerpt..."
        }
      ]
    },
    "flags": {
      "needs_admin_review": false,
      "no_sufficient_sources": false
    }
  }
}
```

Behavior:

- Retrieval filters by `company_id` and by `visibility <= user.role`.
- If retrieval yields weak evidence, return `no_sufficient_sources: true` and a safe response.

#### `POST /assistant/feedback`

Thumbs up/down + optional text.

Roles: any authenticated.

Body:

```json
{
  "message_id": "uuid",
  "rating": "up",
  "comment": "This seems outdated."
}
```

---

### 4.7 Conversations

#### `GET /conversations`

List user’s conversations.

Roles: any authenticated.

Query:

- `limit`, `cursor`

#### `GET /conversations/:id`

Get conversation + messages.

Roles: owner only (MVP).

---

### 4.8 Scheduling

#### `GET /schedule/me`

Employee schedule view.

Roles: any authenticated.

Query:

- `date` (YYYY-MM-DD)
- `range` (optional: `day|week`, default `week`)

#### `GET /schedule/team`

Team schedule view.

Roles: `manager` or `admin`.

Query:

- `date`
- `range`
- `department_id` (optional)

#### `POST /schedule/shifts`

Create or assign a shift.

Roles: `manager` or `admin`.

Body:

```json
{
  "user_id": "uuid",
  "starts_at": "2026-02-04T09:00:00-08:00",
  "ends_at": "2026-02-04T17:00:00-08:00",
  "role_label": "Cashier",
  "notes": "Optional"
}
```

#### `PATCH /schedule/shifts/:id`

Update shift.

Roles: `manager` or `admin`.

#### `DELETE /schedule/shifts/:id`

Delete shift.

Roles: `manager` or `admin`.

#### `POST /schedule/change-requests`

Employee requests a change (optional for MVP; can be Phase 1.5).

Roles: `employee`.

Body:

```json
{ "shift_id": "uuid", "requested_change": "Swap with Alex" }
```

---

### 4.9 Insights (MVP-lite)

#### `GET /insights/scheduling`

Returns AI-driven scheduling insights (non-blocking). MVP can be heuristic + optional LLM summary.

Roles: `manager` or `admin`.

Query:

- `date`, `range`

Response:

```json
{
  "ok": true,
  "data": {
    "insights": [
      {
        "type": "understaffed",
        "severity": "medium",
        "message": "Tuesday 2–5pm appears understaffed compared to last 4 weeks.",
        "evidence": { "metric": "avg_labor_hours", "value": 12.3 }
      }
    ]
  }
}
```

---

### 4.10 Admin Analytics

#### `GET /admin/analytics/qa`

Top questions, unanswered rate, confidence distribution.

Roles: `admin`.

Query:

- `from` (date)
- `to` (date)

#### `GET /admin/analytics/knowledge-gaps`

List queries that returned `no_sufficient_sources=true`.

Roles: `admin`.

---

## 5. Webhooks / Jobs (Internal)

These are internal worker responsibilities (not public endpoints).

### 5.1 Document Ingestion Job

Trigger: `POST /docs` or `/docs/:id/reindex`
Steps:

1. Download file from storage
2. Extract text (PDF/DOCX/MD)
3. Chunk text (size + overlap)
4. Generate embeddings
5. Store `EmbeddingChunk` rows
6. Mark doc status `indexed` or `failed`

### 5.2 Optional: Insight Generation Job

- Daily/weekly aggregation for scheduling insights

---

## 6. Security Notes

- All endpoints require verified JWT except `/health`.
- Role enforcement in API handlers.
- Tenant scoping from JWT; never trust `company_id` from client.
- Document visibility enforced during retrieval.
- Store raw docs in tenant-scoped paths.

---

## 7. MVP Scope Checklist

**Must ship**

- `/me`
- `/docs` upload + list + reindex
- `/assistant/chat` with citations
- `/conversations` list + view
- `/schedule/me` and `/schedule/team`

**Nice to have (Phase 1.5)**

- change requests
- manager analytics
- knowledge gaps dashboard

---

## 8. Future Modules (Placeholder)

When adding new modules (procurement/invoice checking), follow the same patterns:

- tenant-scoped tables
- role-gated endpoints
- async jobs for heavy processing
- assistant integrates via retrieval + citations
