import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type MemorySummaryJobData } from "../queues.js";

export function createMemorySummaryWorker(
  processJob: (data: MemorySummaryJobData) => Promise<void>
): Worker<MemorySummaryJobData> {
  const worker = new Worker<MemorySummaryJobData>(
    QUEUE_NAMES.MEMORY_SUMMARY,
    async (job: Job<MemorySummaryJobData>) => {
      await processJob(job.data);
    },
    {
      connection: getConnection(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[memory-summary] Completed ${job.data.type} summary for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[memory-summary] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
