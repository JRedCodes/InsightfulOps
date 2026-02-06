import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("POST /api/docs/:id/reindex", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).post("/api/docs/22222222-2222-2222-8222-222222222222/reindex");
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
      .post("/api/docs/22222222-2222-2222-8222-222222222222/reindex")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("FORBIDDEN");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid id", async () => {
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
      .post("/api/docs/not-a-uuid/reindex")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("BAD_REQUEST");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when doc not found", async () => {
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
      // updateDocumentStatus -> PATCH /documents returns []
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
      .post("/api/docs/22222222-2222-2222-8222-222222222222/reindex")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("NOT_FOUND");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("sets doc status to processing", async () => {
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
      // updateDocumentStatus -> PATCH /documents returns updated doc
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
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .post("/api/docs/22222222-2222-2222-8222-222222222222/reindex")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.doc.status).toBe("processing");
  });
});

describe("DELETE /api/docs/:id", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).delete("/api/docs/22222222-2222-2222-8222-222222222222");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 for non-admin", async () => {
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
      config: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .delete("/api/docs/22222222-2222-2222-8222-222222222222")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("FORBIDDEN");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("archives doc (status archived)", async () => {
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
      // updateDocumentStatus -> PATCH /documents returns updated doc
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "22222222-2222-2222-8222-222222222222",
              title: "Employee Handbook",
              visibility: "employee",
              status: "archived",
              created_at: "2026-02-06T00:00:00.000Z",
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
      .delete("/api/docs/22222222-2222-2222-8222-222222222222")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.doc.status).toBe("archived");
  });
});
