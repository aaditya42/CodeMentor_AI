import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import * as aiClient from '../ai-client.js';

const connection = createRedisConnection();

// --- Queue Definitions ---

export const hintQueue = new Queue('hint-generation', { connection });
export const evaluationQueue = new Queue('hint-evaluation', { connection });
export const analyticsQueue = new Queue('analytics-update', { connection });

// --- Job Types ---

export interface HintJobData {
  userId: string;
  problemId: string;
  problemTitle: string;
  problemDescription: string;
  code: string;
  language: string;
  conversationId?: string;
  requestedLevel?: number;
  userMessage?: string;
}

export interface EvaluationJobData {
  hintId: string;
  hintContent: string;
  hintLevel: number;
  problemDescription: string;
  userCode: string;
}

export interface AnalyticsJobData {
  userId: string;
  eventType: 'submission' | 'hint_used' | 'problem_solved';
  metadata?: Record<string, unknown>;
}

// --- Add Job Helpers ---

export async function enqueueHintGeneration(data: HintJobData) {
  const job = await hintQueue.add('generate', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  logger.info(`Enqueued hint generation job ${job.id}`);
  return job;
}

export async function enqueueEvaluation(data: EvaluationJobData) {
  const job = await evaluationQueue.add('evaluate', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  });
  return job;
}

export async function enqueueAnalyticsUpdate(data: AnalyticsJobData) {
  const job = await analyticsQueue.add('update', data, {
    attempts: 3,
    removeOnComplete: 500,
    removeOnFail: 100,
  });
  return job;
}

// --- Workers (process jobs by calling Python AI service) ---

export function startWorkers() {
  const hintWorker = new Worker(
    'hint-generation',
    async (job: Job<HintJobData>) => {
      logger.info(`Processing hint job ${job.id}`);
      const result = await aiClient.generateHint({
        problemId: job.data.problemId,
        problemTitle: job.data.problemTitle,
        problemDescription: job.data.problemDescription,
        code: job.data.code,
        language: job.data.language,
        hintLevel: job.data.requestedLevel,
        userMessage: job.data.userMessage,
      });
      logger.info(`Hint job ${job.id} completed`);
      return result;
    },
    { connection, concurrency: 3 }
  );

  const evalWorker = new Worker(
    'hint-evaluation',
    async (job: Job<EvaluationJobData>) => {
      logger.info(`Processing evaluation job ${job.id}`);
      const result = await aiClient.evaluateHint({
        hintId: job.data.hintId,
        hintContent: job.data.hintContent,
        hintLevel: job.data.hintLevel,
        problemDescription: job.data.problemDescription,
        userCode: job.data.userCode,
      });
      logger.info(`Evaluation job ${job.id} completed`);
      return result;
    },
    { connection, concurrency: 2 }
  );

  hintWorker.on('failed', (job, err) => {
    logger.error(`Hint job ${job?.id} failed:`, err);
  });

  evalWorker.on('failed', (job, err) => {
    logger.error(`Eval job ${job?.id} failed:`, err);
  });

  logger.info('BullMQ workers started (hint-generation, hint-evaluation)');
}
