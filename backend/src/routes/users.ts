import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import { fetchCompanyUsers, updateUserRole } from "../supabase/postgrest";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const roleSchema = z.enum(["employee", "manager", "admin"]);
const updateRoleBodySchema = z.object({
  role: roleSchema,
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

  router.patch("/:id/role", requireRole(["admin"]), async (req, res) => {
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

    const userId = req.params.id;
    const parsedUserId = z.string().uuid().safeParse(userId);
    if (!parsedUserId.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid user id" }));
    }

    const parsedBody = updateRoleBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
    }

    const user = await updateUserRole({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      userId: parsedUserId.data,
      role: parsedBody.data.role,
      fetchImpl,
    });

    if (!user) {
      return res.status(404).json(err({ code: "NOT_FOUND", message: "User not found" }));
    }

    return res.json(ok({ user }));
  });

  return router;
}
