import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type ProgressReportJobData } from "../queues.js";

export function createProgressReportWorker(
  processJob: (data: ProgressReportJobData) => Promise<void>
): Worker<ProgressReportJobData> {
  const worker = new Worker<ProgressReportJobData>(
    QUEUE_NAMES.PROGRESS_REPORT,
    async (job: Job<ProgressReportJobData>) => {
      await processJob(job.data);
    },
    {
      connection: getConnection(),
      concurrency: 3,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[progress-report] Completed job ${job.id} for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[progress-report] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
