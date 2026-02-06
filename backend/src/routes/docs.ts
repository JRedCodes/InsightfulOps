import { Router } from "express";
import { ok, err } from "../http/response";
import { fetchVisibleDocuments } from "../supabase/postgrest";

export function createDocsRouter({
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
    const accessToken = req.auth?.accessToken;

    if (!accessToken) {
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

    const docs = await fetchVisibleDocuments({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      fetchImpl,
    });

    return res.json(ok({ docs }));
  });

  return router;
}
