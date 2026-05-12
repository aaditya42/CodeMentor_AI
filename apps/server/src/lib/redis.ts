// import Redis from 'ioredis';
// import { config } from '../config/index.js';
// import { logger } from './logger.js';

// export const redis = new Redis(config.REDIS_URL, {
//   maxRetriesPerRequest: null, // Required for BullMQ compatibility
//   retryStrategy(times: number) {
//     const delay = Math.min(times * 50, 2000);
//     return delay;
//   },
// });

// redis.on('connect', () => {
//   logger.info('Redis connected');
// });

// redis.on('error', (err) => {
//   logger.error('Redis connection error:', err);
// });

// // Create a duplicate connection for subscribers (BullMQ needs separate connections)
// export function createRedisConnection() {
//   return new Redis(config.REDIS_URL, {
//     maxRetriesPerRequest: null,
//   });
// }

import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,

  retryStrategy(times: number) {
    if (times > 5) {
      logger.error('Redis reconnect limit reached');
      return null;
    }

    const delay = Math.min(times * 2000, 10000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err.message);
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Create a duplicate connection for BullMQ workers
export function createRedisConnection() {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,

    retryStrategy(times: number) {
      if (times > 5) {
        logger.error('Worker Redis reconnect limit reached');
        return null;
      }

      return Math.min(times * 2000, 10000);
    },
  });
}
