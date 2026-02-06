import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import { fetchCompanyUsers } from "../supabase/postgrest";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function createUsersRouter({
  supabaseUrl,
  supabaseAnonKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();

  router.get("/", requireRole(["admin"]), async (req, res) => {
    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json(err({ code: "BAD_REQUEST", message: "Invalid query parameters" }));
    }

    const users = await fetchCompanyUsers({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      limit: parsed.data.limit ?? 25,
      fetchImpl,
    });

    return res.json(ok({ users }));
  });

  return router;
}
