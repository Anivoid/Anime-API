import { prisma } from "./prisma";

// ═══════════════════════════════════════════════════════════
// Background Queue Processor
// ═══════════════════════════════════════════════════════════

interface QueueJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  attempts: number;
  maxAttempts: number;
}

type JobProcessor = (payload: Record<string, unknown>) => Promise<boolean>;

const processors = new Map<string, JobProcessor>();
let isProcessing = false;
let processingInterval: ReturnType<typeof setInterval> | null = null;

export function registerProcessor(type: string, processor: JobProcessor) {
  processors.set(type, processor);
}

export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  priority = 0,
  scheduledAt?: Date
): Promise<string> {
  const job = await prisma.importQueue.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      priority,
      scheduledAt: scheduledAt || new Date(),
    },
  });
  return job.id;
}

export async function processNextJob(): Promise<boolean> {
  const job = await prisma.importQueue.findFirst({
    where: {
      status: "pending",
      attempts: { lt: prisma.importQueue.fields.maxAttempts },
      scheduledAt: { lte: new Date() },
    },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
  });

  if (!job) return false;

  const processor = processors.get(job.type);
  if (!processor) {
    await prisma.importQueue.update({
      where: { id: job.id },
      data: { status: "failed", lastError: `No processor for type: ${job.type}` },
    });
    return false;
  }

  // Mark as processing
  await prisma.importQueue.update({
    where: { id: job.id },
    data: { status: "processing", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const payload = JSON.parse(job.payload);
    const success = await processor(payload);

    await prisma.importQueue.update({
      where: { id: job.id },
      data: {
        status: success ? "completed" : "failed",
        completedAt: success ? new Date() : undefined,
        lastError: success ? null : "Processor returned false",
      },
    });
    return success;
  } catch (error) {
    await prisma.importQueue.update({
      where: { id: job.id },
      data: {
        status: job.attempts + 1 >= job.maxAttempts ? "failed" : "pending",
        lastError: error instanceof Error ? error.message : String(error),
      },
    });
    return false;
  }
}

export async function processQueue(batchSize = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < batchSize; i++) {
    const result = await processNextJob();
    if (!result && processed === 0) break; // No more jobs
    processed++;
    if (result) succeeded++;
    else failed++;
  }

  return { processed, succeeded, failed };
}

export function startQueueWorker(intervalMs = 5000) {
  if (processingInterval) return;

  isProcessing = true;
  processingInterval = setInterval(async () => {
    if (!isProcessing) return;
    try {
      await processQueue(5);
    } catch (error) {
      console.error("Queue worker error:", error);
    }
  }, intervalMs);
}

export function stopQueueWorker() {
  isProcessing = false;
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
}

export async function getQueueStats() {
  const [pending, processing, completed, failed] = await Promise.all([
    prisma.importQueue.count({ where: { status: "pending" } }),
    prisma.importQueue.count({ where: { status: "processing" } }),
    prisma.importQueue.count({ where: { status: "completed" } }),
    prisma.importQueue.count({ where: { status: "failed" } }),
  ]);

  const recentJobs = await prisma.importQueue.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      status: true,
      attempts: true,
      lastError: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return { pending, processing, completed, failed, recentJobs };
}

// Register default processors
registerProcessor("anime_metadata", async (payload) => {
  const { smartImportAnime, fetchFullMedia } = await import("./anilist-metadata");
  const media = await fetchFullMedia(payload.search as string, payload.anilistId as number);
  if (!media) return false;
  const result = await smartImportAnime(media);
  return result.errors.length === 0 || result.created || result.updated;
});

registerProcessor("full_rescan", async (payload) => {
  const { syncAnimeMetadata } = await import("./anilist-metadata");
  return await syncAnimeMetadata(payload.animeId as string);
});

registerProcessor("feed_sync", async (payload) => {
  const { importFromFeed } = await import("./rss-importer");
  const result = await importFromFeed(payload.feedSourceId as string);
  return result.failed === 0;
});
