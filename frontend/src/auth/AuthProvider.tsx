import type { Session, User } from "@supabase/supabase-js";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/auth";
import { AuthContext, type AuthState } from "./authContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      if (!supabase) {
        // Auth wiring exists but configuration is missing. Treat as logged out.
        if (!isMounted) return;
        setIsLoading(false);
        setSession(null);
        setUser(null);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      });

      return () => sub.subscription.unsubscribe();
    }

    const cleanupPromise = boot();
    return () => {
      isMounted = false;
      void cleanupPromise;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      session,
      user,
      role: null,
      companyId: null,
    }),
    [isLoading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
