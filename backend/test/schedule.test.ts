import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

function profileResponse(role: "employee" | "manager" | "admin") {
  return new Response(
    JSON.stringify([
      {
        user_id: "00000000-0000-0000-0000-000000000000",
        company_id: "11111111-1111-1111-8111-111111111111",
        email: "a_employee@example.com",
        role,
      },
    ]),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

describe("GET /api/schedule/me", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/schedule/me?date=2026-02-06&range=week");
    expect(res.status).toBe(401);
  });

  it("returns shifts for self", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles
      .mockResolvedValueOnce(profileResponse("employee"))
      // shifts query
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "55555555-5555-5555-8555-555555555555",
              user_id: "00000000-0000-0000-0000-000000000000",
              starts_at: "2026-02-06T09:00:00.000Z",
              ends_at: "2026-02-06T17:00:00.000Z",
              role_label: "Cashier",
              notes: null,
              created_at: "2026-02-01T00:00:00.000Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .get("/api/schedule/me?date=2026-02-06&range=day")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.shifts).toHaveLength(1);
  });
});

describe("GET /api/schedule/team", () => {
  it("returns 403 for employee", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(profileResponse("employee"));

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .get("/api/schedule/team?date=2026-02-06&range=week")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("returns shifts for manager/admin", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(profileResponse("manager"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .get("/api/schedule/team?date=2026-02-06&range=week")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("Shift CRUD", () => {
  it("forbids employee creating shifts", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(profileResponse("employee"));

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .post("/api/schedule/shifts")
      .set("Authorization", "Bearer fake")
      .send({
        user_id: "00000000-0000-0000-0000-000000000000",
        starts_at: "2026-02-06T09:00:00.000Z",
        ends_at: "2026-02-06T17:00:00.000Z",
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("allows manager to create/update/delete shifts", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles
      .mockResolvedValueOnce(profileResponse("manager"))
      // createShift -> POST /shifts
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "66666666-6666-6666-8666-666666666666",
              user_id: "00000000-0000-0000-0000-000000000000",
              starts_at: "2026-02-06T09:00:00.000Z",
              ends_at: "2026-02-06T17:00:00.000Z",
              role_label: "Cashier",
              notes: null,
              created_at: "2026-02-01T00:00:00.000Z",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      // requireUserContext -> profiles (new request)
      .mockResolvedValueOnce(profileResponse("manager"))
      // updateShift -> PATCH /shifts
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "66666666-6666-6666-8666-666666666666",
              user_id: "00000000-0000-0000-0000-000000000000",
              starts_at: "2026-02-06T09:00:00.000Z",
              ends_at: "2026-02-06T17:00:00.000Z",
              role_label: "Lead",
              notes: null,
              created_at: "2026-02-01T00:00:00.000Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      // requireUserContext -> profiles (new request)
      .mockResolvedValueOnce(profileResponse("manager"))
      // deleteShift -> DELETE /shifts
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const createRes = await request(app)
      .post("/api/schedule/shifts")
      .set("Authorization", "Bearer fake")
      .send({
        user_id: "00000000-0000-0000-0000-000000000000",
        starts_at: "2026-02-06T09:00:00.000Z",
        ends_at: "2026-02-06T17:00:00.000Z",
        role_label: "Cashier",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.ok).toBe(true);

    const patchRes = await request(app)
      .patch("/api/schedule/shifts/66666666-6666-6666-8666-666666666666")
      .set("Authorization", "Bearer fake")
      .send({ role_label: "Lead" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.ok).toBe(true);

    const delRes = await request(app)
      .delete("/api/schedule/shifts/66666666-6666-6666-8666-666666666666")
      .set("Authorization", "Bearer fake");

    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);
  });
});
