import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ compatibility
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});

// Create a duplicate connection for subscribers (BullMQ needs separate connections)
export function createRedisConnection() {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}
