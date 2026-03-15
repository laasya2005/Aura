import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type EveningRecapJobData } from "../queues.js";

export function createEveningRecapWorker(
  processJob: (data: EveningRecapJobData) => Promise<void>
): Worker<EveningRecapJobData> {
  const worker = new Worker<EveningRecapJobData>(
    QUEUE_NAMES.EVENING_RECAP,
    async (job: Job<EveningRecapJobData>) => {
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
    console.log(`[evening-recap] Completed job ${job.id} for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[evening-recap] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
