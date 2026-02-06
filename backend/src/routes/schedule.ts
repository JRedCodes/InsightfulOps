import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import { createShift, deleteShift, fetchShifts, updateShift } from "../supabase/postgrest";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  range: z.enum(["day", "week"]).optional(),
});

const shiftCreateSchema = z
  .object({
    user_id: z.string().uuid(),
    starts_at: z.string(),
    ends_at: z.string(),
    role_label: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), {
    message: "ends_at must be after starts_at",
  });

const shiftUpdateSchema = z
  .object({
    user_id: z.string().uuid().optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    role_label: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" })
  .refine(
    (v) =>
      v.starts_at && v.ends_at
        ? new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime()
        : true,
    { message: "ends_at must be after starts_at" }
  );

function rangeToWindow({ date, range }: { date: string; range: "day" | "week" }) {
  // MVP: treat provided date as UTC date and build an inclusive [start, end] window.
  // We can later improve this using company timezone + week_start.
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid date");

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (range === "day" ? 1 : 7));

  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function createScheduleRouter({
  supabaseUrl,
  supabaseAnonKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();

  router.get("/me", async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json(err({ code: "BAD_REQUEST", message: "Invalid query parameters" }));
    }

    const accessToken = req.auth?.accessToken;
    const userId = req.userContext?.userId;
    if (!accessToken || !userId) {
      return res.status(500).json(err({ code: "INTERNAL", message: "User context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const { startsAt, endsAt } = rangeToWindow({
      date: parsed.data.date,
      range: parsed.data.range ?? "week",
    });

    const shifts = await fetchShifts({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      startsAt,
      endsAt,
      userId,
      fetchImpl,
    });

    return res.json(ok({ shifts }));
  });

  router.get("/team", requireRole(["manager", "admin"]), async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json(err({ code: "BAD_REQUEST", message: "Invalid query parameters" }));
    }

    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const { startsAt, endsAt } = rangeToWindow({
      date: parsed.data.date,
      range: parsed.data.range ?? "week",
    });

    const shifts = await fetchShifts({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      startsAt,
      endsAt,
      fetchImpl,
    });

    return res.json(ok({ shifts }));
  });

  router.post("/shifts", requireRole(["manager", "admin"]), async (req, res) => {
    const parsed = shiftCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
    }

    const accessToken = req.auth?.accessToken;
    const companyId = req.userContext?.companyId;
    const createdBy = req.userContext?.userId;
    if (!accessToken || !companyId || !createdBy) {
      return res.status(500).json(err({ code: "INTERNAL", message: "User context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const shift = await createShift({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      shift: {
        company_id: companyId,
        user_id: parsed.data.user_id,
        starts_at: parsed.data.starts_at,
        ends_at: parsed.data.ends_at,
        role_label: parsed.data.role_label ?? null,
        notes: parsed.data.notes ?? null,
        created_by: createdBy,
      },
      fetchImpl,
    });

    return res.status(201).json(ok({ shift }));
  });

  router.patch("/shifts/:id", requireRole(["manager", "admin"]), async (req, res) => {
    const parsed = shiftUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
    }

    const shiftIdParam = req.params.id;
    if (!shiftIdParam || Array.isArray(shiftIdParam)) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Missing id" }));
    }
    const shiftId = shiftIdParam;

    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const shift = await updateShift({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      shiftId,
      patch: parsed.data,
      fetchImpl,
    });

    if (!shift) {
      return res.status(404).json(err({ code: "NOT_FOUND", message: "Shift not found" }));
    }

    return res.json(ok({ shift }));
  });

  router.delete("/shifts/:id", requireRole(["manager", "admin"]), async (req, res) => {
    const shiftIdParam = req.params.id;
    if (!shiftIdParam || Array.isArray(shiftIdParam)) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Missing id" }));
    }
    const shiftId = shiftIdParam;

    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    await deleteShift({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      shiftId,
      fetchImpl,
    });

    return res.json(ok({ deleted: true }));
  });

  return router;
}
