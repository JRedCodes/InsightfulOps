import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("POST /api/companies", () => {
  it("returns 401 without auth header", async () => {
    const app = createApp();
    const res = await request(app).post("/api/companies").send({ name: "Acme" });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns 500 when service role key missing", async () => {
    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
    });

    const res = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer fake")
      .send({ name: "Acme" });

    expect(res.status).toBe(500);
    expect(res.body.error?.code).toBe("SERVER_MISCONFIGURED");
  });

  it("returns 409 when profile already exists", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            user_id: "00000000-0000-0000-0000-000000000000",
            company_id: "11111111-1111-1111-8111-111111111111",
            role: "employee",
            email: "a_employee@example.com",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseServiceRoleKey: "service" },
      verifyAccessToken: async () => ({ sub: "00000000-0000-0000-0000-000000000000" }),
      fetchImpl,
    });

    const res = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer fake")
      .send({ name: "Acme" });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("ALREADY_ONBOARDED");
  });

  it("creates company and profile", async () => {
    const fetchImpl = vi
      .fn()
      // existing profile check -> empty
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      // create company
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "22222222-2222-2222-8222-222222222222", name: "Acme" }]),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      // upsert profile
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              user_id: "00000000-0000-0000-0000-000000000000",
              company_id: "22222222-2222-2222-8222-222222222222",
              role: "admin",
              email: "a_admin@example.com",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      );

    const app = createApp({
      config: { supabaseUrl: "https://example.supabase.co", supabaseServiceRoleKey: "service" },
      verifyAccessToken: async () => ({
        sub: "00000000-0000-0000-0000-000000000000",
        email: "a_admin@example.com",
      }),
      fetchImpl,
    });

    const res = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer fake")
      .send({ name: "Acme" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.company.name).toBe("Acme");
  });
});
