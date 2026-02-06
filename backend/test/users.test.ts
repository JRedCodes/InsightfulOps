import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /api/users", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 for non-admin", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      // requireUserContext -> profiles lookup
      new Response(
        JSON.stringify([
          {
            user_id: "00000000-0000-0000-0000-000000000000",
            company_id: "11111111-1111-1111-8111-111111111111",
            email: "a_employee@example.com",
            role: "employee",
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

    const res = await request(app).get("/api/users").set("Authorization", "Bearer fake");
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("FORBIDDEN");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid limit", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      // requireUserContext -> profiles lookup
      new Response(
        JSON.stringify([
          {
            user_id: "00000000-0000-0000-0000-000000000000",
            company_id: "11111111-1111-1111-8111-111111111111",
            email: "a_admin@example.com",
            role: "admin",
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

    const res = await request(app).get("/api/users?limit=1000").set("Authorization", "Bearer fake");

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("BAD_REQUEST");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns users list for admin", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles lookup
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              user_id: "00000000-0000-0000-0000-000000000000",
              company_id: "11111111-1111-1111-8111-111111111111",
              email: "a_admin@example.com",
              role: "admin",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      // users list -> profiles query
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              user_id: "00000000-0000-0000-0000-000000000000",
              email: "a_admin@example.com",
              full_name: "A Admin",
              role: "admin",
              is_active: true,
              created_at: "2026-02-06T00:00:00.000Z",
            },
            {
              user_id: "99999999-9999-4999-8999-999999999999",
              email: "a_employee@example.com",
              full_name: "A Employee",
              role: "employee",
              is_active: true,
              created_at: "2026-02-06T00:00:01.000Z",
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

    const res = await request(app).get("/api/users?limit=10").set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.users).toHaveLength(2);
    expect(res.body.data.users[0].role).toBe("admin");
  });
});
