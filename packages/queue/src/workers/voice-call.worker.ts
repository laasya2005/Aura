import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getConnection, type VoiceCallJobData } from "../queues.js";

export function createVoiceCallWorker(
  processJob: (data: VoiceCallJobData) => Promise<void>
): Worker<VoiceCallJobData> {
  const worker = new Worker<VoiceCallJobData>(
    QUEUE_NAMES.VOICE_CALL,
    async (job: Job<VoiceCallJobData>) => {
      await processJob(job.data);
    },
    {
      connection: getConnection(),
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[voice-call] Completed job ${job.id} for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[voice-call] Failed job ${job?.id}: ${err.message}`);
  });

  return worker;
}
