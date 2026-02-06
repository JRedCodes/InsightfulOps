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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load env from repo root (InsightfulOps/.env), even when running from backend/ workspace.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("Missing REDIS_URL (required to run worker)");
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker<DocIngestJobPayload>(
  DOC_INGEST_QUEUE_NAME,
  async (job) => {
    // MVP stub: Milestone 3 will add extraction + chunking + embeddings here.
    // For now, we just log and succeed so the queue wiring is exercised end-to-end.
    console.log(`[worker] ${DOC_INGEST_JOB_NAME} job started`, {
      id: job.id,
      docId: job.data.docId,
      companyId: job.data.companyId,
    });
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

