# InsightfulOps Frontend (`frontend.md`)

This document defines the **frontend architecture, routing, state management, and UI conventions** for the InsightfulOps MVP. The frontend is designed to be **role-aware**, **assistant-first**, and **scalable** without splitting into multiple apps.

---

## 1. Frontend Goals

- Make the **AI Assistant the primary experience**
- Support **role-based views** (employee / manager / admin)
- Keep a **single UI shell** with gated routes
- Be simple enough for MVP, structured enough for scale

Non-goals (MVP):

- Mobile app
- Complex design system
- Heavy animations

---

## 2. Tech Stack

- **React + TypeScript**
- **Vite** (build tool)
- **React Router** (routing)
- **TanStack Query** (server state)
- **Tailwind CSS** (styling)
- **Zod** (schema validation)
- **Supabase JS Client** (auth only)

---

## 3. High-Level App Structure

```txt
src/
├── app/                # App-level wiring
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── auth/               # Auth & onboarding
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── OnboardingPage.tsx
│   └── RequireAuth.tsx
│
├── layouts/            # Persistent layouts
│   ├── AppShell.tsx
│   └── AdminShell.tsx
│
├── assistant/          # AI Assistant feature
│   ├── AssistantPage.tsx
│   ├── ChatInput.tsx
│   ├── MessageList.tsx
│   ├── Citation.tsx
│   └── hooks.ts
│
├── scheduling/         # Scheduling module
│   ├── SchedulePage.tsx
│   ├── TeamSchedule.tsx
│   ├── ShiftModal.tsx
│   └── hooks.ts
│
├── admin/              # Admin console
│   ├── AdminDashboard.tsx
│   ├── UsersPage.tsx
│   ├── DocsPage.tsx
│   └── SettingsPage.tsx
│
├── components/         # Shared components
│   ├── Navbar.tsx
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── EmptyState.tsx
│
├── lib/                # Utilities
│   ├── api.ts          # API client wrapper
│   ├── auth.ts         # Supabase helpers
│   └── roles.ts        # Role helpers
│
├── styles/
│   └── globals.css
│
└── main.tsx
```

---

## 4. Routing Strategy

### Public Routes

- `/` → Landing
- `/login`
- `/signup`

### Protected Routes (RequireAuth)

- `/app/assistant` (default entry)
- `/app/schedule`
- `/app/history`

### Admin Routes (role = admin)

- `/app/admin`
- `/app/admin/users`
- `/app/admin/docs`
- `/app/admin/settings`

Routing rules:

- Employees never see admin routes
- Managers see schedule + insights
- Admins see everything

---

## 5. Layouts

### AppShell

- Persistent NavBar
- Main content outlet
- Used by all authenticated users

### AdminShell

- Nested inside AppShell
- Adds admin-specific sidebar

This avoids separate apps while keeping concerns clean.

---

## 6. State Management

### Auth State

- Managed by Supabase client
- Stored in React Context
- Exposes: `user`, `role`, `company_id`

### Server State

- Managed by **TanStack Query**
- Queries:
  - `/me`
  - `/docs`
  - `/conversations`
  - `/schedule`

### Local UI State

- Component-level (`useState`)
- Modals, inputs, filters

---

## 7. AI Assistant UX

### Core Principles

- Assistant is the **home page**
- Responses must show **citations**
- Confidence score visible (subtle)
- Safe fallback when no sources exist

### Message Types

- User message
- Assistant message
- System warning ("No sufficient sources")

---

## 8. Scheduling UX (MVP)

### Employee

- Weekly schedule view (read-only)

### Manager

- Team schedule view
- Create / edit shift (modal)
- AI insights panel (non-blocking)

---

## 9. Admin UX

### Users

- List users
- Change role
- Deactivate user

### Docs

- Upload doc
- Set visibility
- View indexing status

### Settings

- Business timezone
- Week start
- Shift minimum duration

---

## 10. Error Handling & Loading States

- Skeleton loaders for pages
- Inline spinners for actions
- Toast notifications for errors
- Global error boundary

---

## 11. Styling Conventions

- Tailwind utility-first
- Minimal color palette
- Role cues via subtle badges
- Avoid heavy theming for MVP

---

## 12. Frontend Security Notes

- Never trust role checks alone
- Backend + RLS enforce truth
- Frontend gating is UX only

---

## 13. MVP Checklist (Frontend)

- [ ] Auth + onboarding flow
- [ ] Assistant page
- [ ] Docs upload UI (admin)
- [ ] Schedule view (employee)
- [ ] Team schedule (manager)
- [ ] Admin console

---

## 14. Future Enhancements

- Command palette (⌘K)
- Slack-style assistant sidebar
- Inline assistant suggestions in scheduling
- Mobile-responsive refinements

---

## 15. Summary

The InsightfulOps frontend is a **single, role-aware application** built around an assistant-first experience. It balances speed, clarity, and scalability while staying within MVP scope.
