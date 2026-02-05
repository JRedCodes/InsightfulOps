# Product Requirements Document (PRD)

## Product Name

**InsightfulOps**

## One‑Line Description

InsightfulOps is an AI‑powered operations assistant for small and medium businesses that centralizes internal knowledge, scheduling, and operational insights into a single intelligent system.

---

## 1. Purpose & Vision

### Purpose

Small and medium businesses suffer from operational fragmentation:

- Internal knowledge is scattered across docs, chats, and people
- Scheduling decisions are reactive and manual
- Managers lack visibility into recurring operational issues

InsightfulOps exists to act as a **single intelligent assistant** that understands how a business operates and helps users make better decisions across internal ops, scheduling, and future operational modules.

### Long‑Term Vision

InsightfulOps evolves into an **AI operations control system** that:

- Knows company rules and workflows
- Assists with daily operational decisions
- Surfaces insights before problems occur
- Scales modularly (labor, procurement, compliance, analytics)

---

## 2. Target Users

### Primary Users

- **SMB Owners** (5–200 employees)
- **Operations Managers**
- **Store / Department Managers**

### Secondary Users

- Employees (read‑only / limited interaction)
- Contractors / part‑time staff (future)

---

## 3. User Roles & Permissions

### Employee

- Access AI assistant
- View personal schedule
- View allowed internal documentation

### Manager

- All employee permissions
- View team schedules
- Access analytics & AI insights
- Suggest schedule changes

### Admin

- Full system access
- Manage users and roles
- Upload and manage internal docs
- Configure business settings
- View organization‑wide analytics

Role enforcement is handled at both the **UI** and **backend (RLS / guards)** levels.

---

## 4. Core Product Pillars (Phase 1)

### Pillar 1: AI Internal Ops Assistant (Core)

The assistant is the **primary interface** for InsightfulOps.

#### Capabilities

- Answer questions using internal company docs only
- Provide cited, confidence‑scored responses
- Respect role‑based document visibility
- Maintain conversation history

#### Example Questions

- "How do I request PTO?"
- "Who approves overtime?"
- "What’s the procedure for shift swaps?"

---

### Pillar 2: Internal Knowledge Management

#### Admin Capabilities

- Upload documents (PDF, DOCX, Markdown)
- Set document visibility (employee / manager / admin)
- Version and re‑index documents

#### System Behavior

- Documents are chunked and embedded asynchronously
- Embeddings are isolated per company (tenant)
- Assistant retrieves only authorized content

---

### Pillar 3: Scheduling (Initial Scope)

#### Employee

- View assigned schedule

#### Manager

- View team daily schedule
- Propose schedule changes (modal)

#### AI Insights

- Highlight patterns (call‑outs, understaffing)
- Provide non‑blocking recommendations

Scheduling logic remains **assistive**, not autonomous, in Phase 1.

---

## 5. User Flows (High‑Level)

### Authentication Flow

1. Landing Page → Auth Screen
2. Login / Signup (OAuth or email)
3. Email confirmation (if required)
4. Auth Guard decision:
   - Needs onboarding → onboarding
   - Verified & onboarded → app shell

### Post‑Login Flow

- User enters app via global navigation shell
- AI Assistant is default landing page

---

## 6. Application Structure

### Global (Persistent)

- Navigation Bar
- Auth session state

### Main Sections

- AI Assistant
- Scheduling Module
- Manager Dashboard
- Admin Console

### Admin Console Subsections

- Employee Management
- Internal Docs
- Business Settings

---

## 7. Non‑Goals (Phase 1)

To avoid over‑engineering, InsightfulOps will NOT initially include:

- Payroll processing
- POS integrations
- Fully autonomous scheduling
- Billing / subscription management
- Mobile apps

---

## 8. Success Metrics

### Product Metrics

- Weekly active users (WAU)
- Questions answered by assistant
- % of queries with valid citations

### Business Metrics

- Reduction in repeated manager questions
- Time saved per onboarding employee

### Technical Metrics

- Query latency
- Embedding job success rate
- Error rate

---

## 9. Risks & Mitigations

| Risk              | Mitigation                        |
| ----------------- | --------------------------------- |
| AI hallucinations | Strict RAG + citation requirement |
| Data leakage      | Tenant isolation + RLS            |
| Feature creep     | Phase‑based roadmap               |
| Low trust in AI   | Confidence scores + sources       |

---

## 10. Future Expansion (Post‑Traction)

- Smart scheduling optimization
- Vendor invoice analysis
- Cost anomaly detection
- Compliance monitoring
- Slack / Teams integrations
- Stripe billing

---

## 11. Technical Summary

- Frontend: React + TypeScript
- Backend: Node + Express
- Database: PostgreSQL (Supabase)
- Vector Search: pgvector
- AI: OpenAI API
- Jobs: BullMQ + Redis
- Analytics: PostHog

---

## 12. Positioning Statement

> InsightfulOps is an AI‑driven operations assistant that gives small and medium businesses clarity, structure, and actionable insight across internal processes and workforce operations.

---

## 13. Status

**Phase:** Resume‑grade MVP

**Confidence:** High

**Next Step:** API design + schema definition
