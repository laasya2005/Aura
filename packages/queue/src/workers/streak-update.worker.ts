import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type StreakUpdateJobData } from "../queues.js";

export function createStreakUpdateWorker(
  processJob: (data: StreakUpdateJobData) => Promise<void>
): Worker<StreakUpdateJobData> {
  const worker = new Worker<StreakUpdateJobData>(
    QUEUE_NAMES.STREAK_UPDATE,
    async (job: Job<StreakUpdateJobData>) => {
      await processJob(job.data);
    },
    {
      connection: getConnection(),
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[streak-update] Completed for user ${job.data.userId} goal ${job.data.goalId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[streak-update] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
