import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

function asUrlString(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("POST /api/assistant/chat (retrieval)", () => {
  it("returns citations when sources exist", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const u = new URL(asUrlString(input));

      // requireUserContext -> profiles lookup
      if (u.pathname === "/rest/v1/profiles" && init?.method === "GET") {
        return new Response(
          JSON.stringify([
            {
              user_id: "00000000-0000-0000-0000-000000000000",
              company_id: "11111111-1111-1111-8111-111111111111",
              email: "a_employee@example.com",
              role: "employee",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // createConversation
      if (u.pathname === "/rest/v1/conversations" && init?.method === "POST") {
        return new Response(
          JSON.stringify([
            { id: "22222222-2222-2222-8222-222222222222", title: null, created_at: "2026-02-06T00:00:00Z" },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      }

      // createMessage (user + assistant)
      if (u.pathname === "/rest/v1/messages" && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}")) as { sender: string; content: string };
        const id =
          body.sender === "user"
            ? "33333333-3333-3333-8333-333333333333"
            : "44444444-4444-4444-8444-444444444444";
        return new Response(
          JSON.stringify([
            {
              id,
              sender: body.sender,
              content: body.content,
              confidence: null,
              no_sufficient_sources: body.sender === "assistant" ? false : false,
              needs_admin_review: false,
              created_at: "2026-02-06T00:00:01Z",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      }

      // OpenAI embeddings
      if (u.hostname === "api.openai.com" && u.pathname === "/v1/embeddings" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // match_chunks rpc
      if (u.pathname === "/rest/v1/rpc/match_chunks" && init?.method === "POST") {
        return new Response(
          JSON.stringify([
            {
              chunk_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              document_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              title: "Employee Handbook",
              visibility: "employee",
              content: "Use PTO by submitting a request in the HR system.",
              similarity: 0.9,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // OpenAI chat completion
      if (u.hostname === "api.openai.com" && u.pathname === "/v1/chat/completions" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Submit a PTO request in the HR system." } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${u.pathname}`);
    });

    const app = createApp({
      config: {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        openaiApiKey: "sk-test",
      },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .post("/api/assistant/chat")
      .set("Authorization", "Bearer fake")
      .send({ conversation_id: null, message: "How do I request PTO?" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.flags.no_sufficient_sources).toBe(false);
    expect(res.body.data.assistant_message.citations.length).toBeGreaterThan(0);
    expect(res.body.data.assistant_message.text).toContain("PTO");
  });
});

