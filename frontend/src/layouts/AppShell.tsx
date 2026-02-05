import { Link, NavLink, Outlet } from "react-router-dom";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-2 rounded-md text-sm font-medium",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app/assistant" className="font-semibold text-slate-900">
            InsightfulOps
          </Link>
          <nav className="flex items-center gap-2">
            <NavItem to="/app/assistant" label="Assistant" />
            <NavItem to="/app/schedule" label="Schedule" />
            <NavItem to="/app/history" label="History" />
            <NavItem to="/app/admin" label="Admin" />
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
