import { describe, expect, it, vi } from "vitest";
import { ingestDocumentJob } from "../src/ingestion/ingestDocument";

function asUrlString(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("ingestDocumentJob", () => {
  it("downloads txt file, chunks it, inserts chunks, and marks indexed", async () => {
    type InsertedChunk = {
      company_id: string;
      document_id: string;
      chunk_index: number;
      content: string;
      token_count?: number | null;
      embedding?: number[] | null;
    };

    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const u = new URL(asUrlString(input));

      // OpenAI embeddings
      if (u.hostname === "api.openai.com" && u.pathname === "/v1/embeddings" && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}")) as { input?: string[] };
        const inputs = body.input ?? [];
        return new Response(
          JSON.stringify({
            data: inputs.map((_s, idx) => ({
              index: idx,
              embedding: Array.from({ length: 3 }, () => idx + 0.1), // small stub vector
            })),
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // Storage download
      if (u.pathname.startsWith("/storage/v1/object/company-docs/") && init?.method === "GET") {
        return new Response("hello world\n\nsecond para", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      }

      // Delete existing chunks
      if (u.pathname === "/rest/v1/document_chunks" && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      // Insert chunks
      if (u.pathname === "/rest/v1/document_chunks" && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "[]")) as InsertedChunk[];
        // Ensure embeddings were included for each chunk.
        expect(body.every((c) => Array.isArray(c.embedding))).toBe(true);
        // Return representation skeleton
        return new Response(
          JSON.stringify(
            body.map((c, idx) => ({
              id: `00000000-0000-0000-0000-00000000000${idx}`,
              document_id: c.document_id,
              chunk_index: c.chunk_index,
              token_count: c.token_count ?? null,
              created_at: "2026-02-06T00:00:00.000Z",
            }))
          ),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      }

      // Mark document indexed
      if (u.pathname === "/rest/v1/documents" && init?.method === "PATCH") {
        return new Response(
          JSON.stringify([
            {
              id: "22222222-2222-2222-8222-222222222222",
              company_id: "11111111-1111-1111-8111-111111111111",
              title: "Test Doc",
              file_path: "11111111-1111-1111-8111-111111111111/2222/test.txt",
              visibility: "employee",
              status: "indexed",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${u.pathname}`);
    });

    const res = await ingestDocumentJob({
      payload: {
        docId: "22222222-2222-2222-8222-222222222222",
        companyId: "11111111-1111-1111-8111-111111111111",
        filePath: "11111111-1111-1111-8111-111111111111/22222222-2222-2222-8222-222222222222/test.txt",
        visibility: "employee",
        uploadedByUserId: "00000000-0000-0000-0000-000000000000",
        title: "Test Doc",
      },
      supabaseUrl: "https://example.supabase.co",
      serviceRoleKey: "service",
      openaiApiKey: "sk-test",
      fetchImpl,
    });

    expect(res.chunkCount).toBeGreaterThan(0);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("throws for unsupported file types", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const u = new URL(asUrlString(input));
      if (u.pathname.startsWith("/storage/v1/object/company-docs/") && init?.method === "GET") {
        return new Response("%PDF-1.4...", { status: 200, headers: { "content-type": "application/pdf" } });
      }
      throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${u.pathname}`);
    });

    await expect(
      ingestDocumentJob({
        payload: {
          docId: "22222222-2222-2222-8222-222222222222",
          companyId: "11111111-1111-1111-8111-111111111111",
          filePath: "11111111-1111-1111-8111-111111111111/22222222-2222-2222-8222-222222222222/file.pdf",
          visibility: "employee",
          uploadedByUserId: "00000000-0000-0000-0000-000000000000",
          title: "Test Doc",
        },
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service",
        openaiApiKey: "sk-test",
        fetchImpl,
      })
    ).rejects.toThrow(/UNSUPPORTED_FILE_TYPE/);
  });
});

