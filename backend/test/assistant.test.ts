import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("POST /api/assistant/chat", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).post("/api/assistant/chat").send({ message: "hi" });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("creates conversation and returns stubbed assistant response", async () => {
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
      // createConversation -> POST /conversations
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "22222222-2222-2222-8222-222222222222",
              title: null,
              created_at: "2026-02-06T00:00:00.000Z",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      // createMessage (user) -> POST /messages
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "33333333-3333-3333-8333-333333333333",
              sender: "user",
              content: "Hello",
              confidence: null,
              no_sufficient_sources: false,
              needs_admin_review: false,
              created_at: "2026-02-06T00:00:01.000Z",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      // createMessage (assistant) -> POST /messages
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "44444444-4444-4444-8444-444444444444",
              sender: "assistant",
              content: "stubbed answer",
              confidence: null,
              no_sufficient_sources: true,
              needs_admin_review: false,
              created_at: "2026-02-06T00:00:02.000Z",
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
      .post("/api/assistant/chat")
      .set("Authorization", "Bearer fake")
      .send({ conversation_id: null, message: "Hello" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.conversation_id).toBe("22222222-2222-2222-8222-222222222222");
    expect(res.body.data.assistant_message.id).toBe("44444444-4444-4444-8444-444444444444");
    expect(Array.isArray(res.body.data.assistant_message.citations)).toBe(true);
    expect(res.body.data.flags.no_sufficient_sources).toBe(true);
  });
});
