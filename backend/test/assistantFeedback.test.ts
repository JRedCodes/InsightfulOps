import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("POST /api/assistant/feedback", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/assistant/feedback")
      .send({ message_id: "00000000-0000-0000-0000-000000000000", rating: "up" });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns 400 for invalid body", async () => {
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
      .post("/api/assistant/feedback")
      .set("Authorization", "Bearer fake")
      .send({ rating: "up" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("BAD_REQUEST");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("creates feedback row", async () => {
    const fetchImpl = vi
      .fn()
      // requireUserContext -> profiles lookup
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
      // createAssistantFeedback -> POST /assistant_feedback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "22222222-2222-2222-8222-222222222222",
              message_id: "33333333-3333-3333-8333-333333333333",
              rating: "up",
              comment: "Helpful",
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
      .post("/api/assistant/feedback")
      .set("Authorization", "Bearer fake")
      .send({
        message_id: "33333333-3333-3333-8333-333333333333",
        rating: "up",
        comment: "Helpful",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.feedback.rating).toBe("up");
    expect(res.body.data.feedback.message_id).toBe("33333333-3333-3333-8333-333333333333");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
