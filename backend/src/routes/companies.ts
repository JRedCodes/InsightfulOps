import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import { requireUserContext } from "../middleware/requireUserContext";
import {
  adminCreateCompany,
  adminFetchProfileByUserId,
  adminUpsertProfile,
} from "../supabase/adminPostgrest";
import { updateCompanySettings } from "../supabase/postgrest";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
});

const weekStartSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const settingsSchema = z
  .object({
    timezone: z.string().min(1).optional(),
    week_start: weekStartSchema.optional(),
    shift_min_minutes: z
      .number()
      .int()
      .min(15)
      .max(24 * 60)
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export function createCompaniesRouter({
  supabaseUrl,
  supabaseServiceRoleKey,
  supabaseAnonKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseAnonKey?: string;
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

  router.patch(
    "/settings",
    requireUserContext({ supabaseUrl, supabaseAnonKey, fetchImpl }),
    requireRole(["admin"]),
    async (req, res) => {
      const parsed = settingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
      }

      const accessToken = req.auth?.accessToken;
      const companyId = req.userContext?.companyId;
      if (!accessToken || !companyId) {
        return res
          .status(500)
          .json(err({ code: "INTERNAL", message: "User context missing on request" }));
      }
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json(
          err({
            code: "SERVER_MISCONFIGURED",
            message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
          })
        );
      }

      const company = await updateCompanySettings({
        supabaseUrl,
        supabaseAnonKey,
        accessToken,
        companyId,
        patch: parsed.data,
        fetchImpl,
      });

      if (!company) {
        return res.status(404).json(err({ code: "NOT_FOUND", message: "Company not found" }));
      }

      return res.json(ok({ company }));
    }
  );

  return router;
}
