import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  DOC_INGEST_JOB_NAME,
  DOC_INGEST_QUEUE_NAME,
  type DocIngestJobPayload,
} from "./ingestion/queue.js";
import { failDocumentJob, ingestDocumentJob } from "./ingestion/ingestDocument.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load env from repo root (InsightfulOps/.env), even when running from backend/ workspace.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("Missing REDIS_URL (required to run worker)");
}
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required to run worker)");
}
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("Missing OPENAI_API_KEY (required to run worker)");
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker<DocIngestJobPayload>(
  DOC_INGEST_QUEUE_NAME,
  async (job) => {
    console.log(`[worker] ${DOC_INGEST_JOB_NAME} job started`, {
      id: job.id,
      docId: job.data.docId,
      companyId: job.data.companyId,
    });

    try {
      const result = await ingestDocumentJob({
        payload: job.data,
        supabaseUrl,
        serviceRoleKey,
        openaiApiKey,
      });
      console.log("[worker] ingest complete", {
        id: job.id,
        docId: job.data.docId,
        chunkCount: result.chunkCount,
      });
    } catch (err) {
      console.error("[worker] ingest failed", { id: job.id, docId: job.data.docId, err });
      await failDocumentJob({ payload: job.data, supabaseUrl, serviceRoleKey }).catch(() => null);
      throw err;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[worker] job completed`, { id: job.id, name: job.name });
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job failed`, { id: job?.id, name: job?.name, err });
});

console.log("[worker] started");

