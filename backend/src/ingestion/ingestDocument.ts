import { chunkText } from "./chunking.js";
import { extractTextFromFile } from "./extractText.js";
import { downloadFromSupabaseStorage } from "../supabase/storage.js";
import {
  adminDeleteChunksForDocument,
  adminInsertDocumentChunks,
  adminUpdateDocumentStatus,
} from "../supabase/adminPostgrest.js";
import type { DocIngestJobPayload } from "./queue.js";

const COMPANY_DOCS_BUCKET = "company-docs";

export async function ingestDocumentJob({
  payload,
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
}: {
  payload: DocIngestJobPayload;
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ chunkCount: number }> {
  // 1) Download file from Storage
  const { body } = await downloadFromSupabaseStorage({
    supabaseUrl,
    serviceRoleKey,
    bucket: COMPANY_DOCS_BUCKET,
    objectPath: payload.filePath,
    fetchImpl,
  });

  // 2) Extract text (MVP: txt/markdown only)
  const { text } = extractTextFromFile({ filePath: payload.filePath, bytes: body });

  // 3) Chunk
  const chunks = chunkText({ text, maxTokens: 400, overlapTokens: 50 });

  // 4) Write chunks + mark indexed (service role bypasses RLS)
  // Idempotency: delete existing chunks for this document first.
  await adminDeleteChunksForDocument({
    supabaseUrl,
    serviceRoleKey,
    docId: payload.docId,
    fetchImpl,
  });

  await adminInsertDocumentChunks({
    supabaseUrl,
    serviceRoleKey,
    chunks: chunks.map((c) => ({
      company_id: payload.companyId,
      document_id: payload.docId,
      chunk_index: c.index,
      content: c.content,
      token_count: c.token_count,
    })),
    fetchImpl,
  });

  await adminUpdateDocumentStatus({
    supabaseUrl,
    serviceRoleKey,
    docId: payload.docId,
    status: "indexed",
    fetchImpl,
  });

  return { chunkCount: chunks.length };
}

export async function failDocumentJob({
  payload,
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
}: {
  payload: DocIngestJobPayload;
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  await adminUpdateDocumentStatus({
    supabaseUrl,
    serviceRoleKey,
    docId: payload.docId,
    status: "failed",
    fetchImpl,
  });
}

