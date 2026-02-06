import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /api/docs", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/docs");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns docs list", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "22222222-2222-2222-8222-222222222222",
            title: "Employee Handbook",
            visibility: "employee",
            status: "indexed",
            created_at: "2026-02-06T00:00:00.000Z",
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
      }),
      fetchImpl,
    });

    const res = await request(app).get("/api/docs").set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.docs).toHaveLength(1);
    expect(res.body.data.docs[0].title).toBe("Employee Handbook");
  });
});
