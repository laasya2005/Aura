export {
  QUEUE_NAMES,
  getQueue,
  getConnection,
  closeAllQueues,
  type QueueName,
  type MorningTextJobData,
  type CheckInJobData,
  type EveningRecapJobData,
  type MemorySummaryJobData,
  type StreakUpdateJobData,
  type ProgressReportJobData,
} from "./queues.js";

export {
  addScheduleJob,
  removeScheduleJob,
  addMemorySummaryJob,
  addStreakUpdateJob,
  addProgressReportJob,
  setupSystemJobs,
  rehydrateSchedules,
} from "./scheduler.js";

export { createMorningTextWorker } from "./workers/morning-text.worker.js";
export { createCheckInWorker } from "./workers/check-in.worker.js";
export { createMemorySummaryWorker } from "./workers/memory-summary.worker.js";
export { createStreakUpdateWorker } from "./workers/streak-update.worker.js";
export { createEveningRecapWorker } from "./workers/evening-recap.worker.js";
export { createProgressReportWorker } from "./workers/progress-report.worker.js";
