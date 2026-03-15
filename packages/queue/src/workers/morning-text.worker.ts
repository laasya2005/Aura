import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type MorningTextJobData } from "../queues.js";

export function createMorningTextWorker(
  processJob: (data: MorningTextJobData) => Promise<void>
): Worker<MorningTextJobData> {
  const worker = new Worker<MorningTextJobData>(
    QUEUE_NAMES.MORNING_TEXT,
    async (job: Job<MorningTextJobData>) => {
      await processJob(job.data);
    },
    {
      connection: getConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[morning-text] Completed job ${job.id} for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[morning-text] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
