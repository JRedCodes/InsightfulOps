import { NavLink, Outlet } from "react-router-dom";

function SideItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "block px-3 py-2 rounded-md text-sm",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export function AdminShell() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      <aside className="border border-slate-200 rounded-lg p-3 h-fit">
        <div className="text-xs uppercase tracking-wide text-slate-500 px-3 py-2">Admin</div>
        <nav className="space-y-1">
          <SideItem to="/app/admin" label="Dashboard" />
          <SideItem to="/app/admin/users" label="Users" />
          <SideItem to="/app/admin/docs" label="Docs" />
          <SideItem to="/app/admin/settings" label="Settings" />
        </nav>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
