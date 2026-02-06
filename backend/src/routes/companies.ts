import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import {
  adminCreateCompany,
  adminFetchProfileByUserId,
  adminUpsertProfile,
} from "../supabase/adminPostgrest";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
});

export function createCompaniesRouter({
  supabaseUrl,
  supabaseServiceRoleKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
    }

    const userId = req.auth?.claims.sub;
    const email = req.auth?.claims.email;
    if (!userId) {
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        })
      );
    }

    // Prevent accidental re-onboarding; if a profile exists, we consider the user already onboarded.
    const existingProfile = await adminFetchProfileByUserId({
      supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      userId,
      fetchImpl,
    });

    if (existingProfile) {
      return res.status(409).json(
        err({
          code: "ALREADY_ONBOARDED",
          message: "User already has a profile/company",
        })
      );
    }

    const company = await adminCreateCompany({
      supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      name: parsed.data.name,
      fetchImpl,
    });

    await adminUpsertProfile({
      supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      profile: {
        user_id: userId,
        company_id: company.id,
        role: "admin",
        email: email ?? null,
        is_active: true,
      },
      fetchImpl,
    });

    return res.status(201).json(ok({ company }));
  });

  return router;
}
