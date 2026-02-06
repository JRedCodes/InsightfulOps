import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import { fetchShifts } from "../supabase/postgrest";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  range: z.enum(["day", "week"]).optional(),
});

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

  return router;
}
