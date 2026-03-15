import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type CheckInJobData } from "../queues.js";

export function createCheckInWorker(
  processJob: (data: CheckInJobData) => Promise<void>
): Worker<CheckInJobData> {
  const worker = new Worker<CheckInJobData>(
    QUEUE_NAMES.CHECK_IN,
    async (job: Job<CheckInJobData>) => {
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
    console.log(`[check-in] Completed job ${job.id} for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[check-in] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
