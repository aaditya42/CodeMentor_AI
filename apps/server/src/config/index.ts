import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../../.env' });

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // AI Service (Python FastAPI)
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_SERVICE_TIMEOUT: z.coerce.number().default(90000), // 90s for LLM ops

  // Legacy AI Keys (kept for fallback — used by Python service via shared .env)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Code Execution (Judge0 CE)
  JUDGE0_URL: z.string().default('http://localhost:2358'),

  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.string().default('debug'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof envSchema>;
