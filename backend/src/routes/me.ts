import { Router } from "express";
import { ok, err } from "../http/response";
import { fetchMyProfile } from "../supabase/postgrest";

export function createMeRouter({
  supabaseUrl,
  supabaseAnonKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();

  router.get("/", async (req, res) => {
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

    return res.json(
      ok({
        user: {
          id: profile.user_id,
          email: profile.email ?? req.auth?.claims.email ?? null,
          role: profile.role,
          company_id: profile.company_id,
        },
      })
    );
  });

  return router;
}
