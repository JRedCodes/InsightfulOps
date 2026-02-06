import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("POST /api/docs", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).post("/api/docs");
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

    const res = await request(app)
      .post("/api/docs")
      .set("Authorization", "Bearer fake")
      .field("visibility", "employee")
      .attach("file", Buffer.from("hello"), "test.txt");

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("FORBIDDEN");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when file missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      // requireUserContext -> profiles lookup (admin)
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

    const res = await request(app)
      .post("/api/docs")
      .set("Authorization", "Bearer fake")
      .field("visibility", "employee");

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("BAD_REQUEST");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("creates a doc row (processing)", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles lookup (admin)
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
      // createDocument -> POST /documents
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "22222222-2222-2222-8222-222222222222",
              title: "Employee Handbook",
              visibility: "employee",
              status: "processing",
              created_at: "2026-02-06T00:00:00.000Z",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      );

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .post("/api/docs")
      .set("Authorization", "Bearer fake")
      .field("title", "Employee Handbook")
      .field("visibility", "employee")
      .attach("file", Buffer.from("hello"), "handbook.txt");

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.doc.status).toBe("processing");
    expect(res.body.data.doc.visibility).toBe("employee");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
