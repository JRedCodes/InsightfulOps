import type { RouteObject } from "react-router-dom";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AdminDashboard } from "../admin/AdminDashboard";
import { DocsPage } from "../admin/DocsPage";
import { SettingsPage } from "../admin/SettingsPage";
import { UsersPage } from "../admin/UsersPage";
import { AssistantPage } from "../assistant/AssistantPage";
import { LoginPage } from "../auth/LoginPage";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { SignupPage } from "../auth/SignupPage";
import { AdminShell } from "../layouts/AdminShell";
import { AppShell } from "../layouts/AppShell";
import { SchedulePage } from "../scheduling/SchedulePage";
import { HistoryPage } from "./HistoryPage";
import { LandingPage } from "./LandingPage";

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/assistant" replace /> },
      { path: "assistant", element: <AssistantPage /> },
      { path: "schedule", element: <SchedulePage /> },
      { path: "history", element: <HistoryPage /> },
      {
        path: "admin",
        element: (
          <RequireRole allowed={["admin"]}>
            <AdminShell />
          </RequireRole>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "users", element: <UsersPage /> },
          { path: "docs", element: <DocsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
