import React from "react";
import { useAuth } from "./useAuth";
import type { AppRole } from "./types";

export function RequireRole({
  allowed,
  children,
}: {
  allowed: AppRole[];
  children: React.ReactNode;
}) {
  const { role } = useAuth();

  if (!role || !allowed.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
        Not authorized.
      </div>
    );
  }

  return <>{children}</>;
}
