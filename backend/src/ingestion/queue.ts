import { Queue } from "bullmq";
import IORedis from "ioredis";

export const DOC_INGEST_QUEUE_NAME = "doc_ingest";
export const DOC_INGEST_JOB_NAME = "ingest";

export type DocIngestJobPayload = {
  docId: string;
  companyId: string;
  filePath: string;
  visibility: "employee" | "manager" | "admin";
  uploadedByUserId: string;
  title: string;
};

export type EnqueueDocIngestJob = (payload: DocIngestJobPayload) => Promise<void>;

export function createDocIngestEnqueuer({
  redisUrl,
}: {
  redisUrl?: string;
}): { enabled: boolean; enqueue: EnqueueDocIngestJob } {
  if (!redisUrl) {
    return {
      enabled: false,
      enqueue: async () => {
        // No-op when REDIS_URL is not configured.
      },
    };
  }

  // Important: BullMQ uses ioredis. We create a single connection for this process.
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<DocIngestJobPayload>(DOC_INGEST_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });

  return {
    enabled: true,
    enqueue: async (payload) => {
      await queue.add(DOC_INGEST_JOB_NAME, payload, {
        // Stable jobId keeps retries/idempotency simple.
        jobId: payload.docId,
      });
    },
  };
}

