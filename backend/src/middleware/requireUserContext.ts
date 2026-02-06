import type { NextFunction, Request, Response } from "express";
import { err } from "../http/response";
import { fetchMyProfile } from "../supabase/postgrest";

export type UserContext = {
  userId: string;
  companyId: string;
  role: "employee" | "manager" | "admin";
  email: string | null;
};

export function requireUserContext({
  supabaseUrl,
  supabaseAnonKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchImpl?: typeof fetch;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth?.claims.sub;
    const accessToken = req.auth?.accessToken;

    if (!userId || !accessToken) {
      return res.status(500).json(
        err({
          code: "INTERNAL",
          message: "Auth context missing on request",
        })
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const profile = await fetchMyProfile({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      userId,
      fetchImpl,
    });

    if (!profile) {
      return res.status(404).json(
        err({
          code: "PROFILE_NOT_FOUND",
          message: "No profile found for user (onboarding required)",
        })
      );
    }

    req.userContext = {
      userId: profile.user_id,
      companyId: profile.company_id,
      role: profile.role,
      email: profile.email ?? req.auth?.claims.email ?? null,
    };

    return next();
  };
}
