import type { Session, User } from "@supabase/supabase-js";
import { createContext } from "react";
import type { AppRole } from "./types";

export type AuthState = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  // Loaded later from `/me`
  role: AppRole | null;
  companyId: string | null;
};

export const AuthContext = createContext<AuthState | null>(null);
