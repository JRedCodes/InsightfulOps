import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /api/me", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns user payload from profile", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
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
      config: {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
      },
      verifyAccessToken: async () => ({
        sub: "00000000-0000-0000-0000-000000000000",
        email: "x@y.com",
      }),
      fetchImpl,
    });

    const res = await request(app).get("/api/me").set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user).toEqual({
      id: "00000000-0000-0000-0000-000000000000",
      email: "a_employee@example.com",
      role: "employee",
      company_id: "11111111-1111-1111-8111-111111111111",
    });
  });
});
