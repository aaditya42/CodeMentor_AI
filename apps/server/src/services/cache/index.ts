import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';

const DEFAULT_TTL = 3600; // 1 hour

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (err) {
      logger.error(`Cache get error for ${key}:`, err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (err) {
      logger.error(`Cache set error for ${key}:`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(`Cache del error for ${key}:`, err);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache invalidated ${keys.length} keys matching ${pattern}`);
      }
    } catch (err) {
      logger.error(`Cache invalidate error for ${pattern}:`, err);
    }
  }

  // Utility: cache-aside pattern
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

export const cacheService = new CacheService();

// Cache key generators
export const CacheKeys = {
  problem: (slug: string) => `problem:${slug}`,
  problemList: (page: number, limit: number) => `problems:list:${page}:${limit}`,
  userAnalytics: (userId: string) => `analytics:user:${userId}`,
  astAnalysis: (codeHash: string) => `ast:${codeHash}`,
  hintHistory: (userId: string, problemId: string) => `hints:${userId}:${problemId}`,
};
