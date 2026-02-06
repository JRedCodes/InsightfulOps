import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /api/conversations", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/conversations");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns conversation list", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles
      .mockResolvedValueOnce(
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
      )
      // conversations list
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "33333333-3333-3333-8333-333333333333",
              title: "Test convo",
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
      .get("/api/conversations?limit=10")
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.conversations).toHaveLength(1);
  });
});

describe("GET /api/conversations/:id", () => {
  it("returns messages", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles
      .mockResolvedValueOnce(
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
      )
      // messages list
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "44444444-4444-4444-8444-444444444444",
              sender: "user",
              content: "hello",
              confidence: null,
              no_sufficient_sources: false,
              needs_admin_review: false,
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

    const conversationId = "33333333-3333-3333-8333-333333333333";
    const res = await request(app)
      .get(`/api/conversations/${conversationId}`)
      .set("Authorization", "Bearer fake");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.conversation_id).toBe(conversationId);
    expect(res.body.data.messages).toHaveLength(1);
  });
});
