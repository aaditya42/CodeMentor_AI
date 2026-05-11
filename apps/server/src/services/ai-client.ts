/**
 * AI Service Client — HTTP proxy to Python FastAPI AI service.
 * All AI intelligence is delegated to the Python service.
 * This module handles HTTP communication, streaming, retries, and caching.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { cacheService, CacheKeys } from './cache/index.js';
import type {
  ASTAnalysis,
  ComplexityAnalysis,
  HintResponse,
  RetrievalResult,
  HintEvaluation,
} from '@codementor/shared';

// --- Axios Instance with Retry ---

const aiClient: AxiosInstance = axios.create({
  baseURL: `${config.AI_SERVICE_URL}/api/v1`,
  timeout: 90000, // 90s for LLM operations
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging
aiClient.interceptors.request.use((req) => {
  logger.debug(`→ AI Service: ${req.method?.toUpperCase()} ${req.url}`);
  return req;
});

// Response interceptor with retry logic
aiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config;
    if (!config) throw error;

    const retryCount = (config as any).__retryCount || 0;
    const maxRetries = 2;

    if (retryCount < maxRetries && error.response?.status && error.response.status >= 500) {
      (config as any).__retryCount = retryCount + 1;
      const delay = Math.pow(2, retryCount) * 1000;
      logger.warn(`AI Service error ${error.response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return aiClient.request(config);
    }

    throw error;
  }
);

// --- Service Methods ---

/**
 * Analyze code using Python AI service's tree-sitter AST engine.
 */
export async function analyzeCode(
  code: string,
  language: string,
  problemContext?: string,
): Promise<ASTAnalysis> {
  // Check cache
  const crypto = await import('crypto');
  const codeHash = crypto.createHash('md5').update(code + language).digest('hex');
  const cacheKey = CacheKeys.astAnalysis(codeHash);
  const cached = await cacheService.get<ASTAnalysis>(cacheKey);
  if (cached) return cached;

  const { data } = await aiClient.post('/analyze-code', {
    code,
    language,
    problem_context: problemContext,
  });

  const analysis = data.analysis;
  await cacheService.set(cacheKey, analysis, 1800); // 30 min cache
  return analysis;
}

/**
 * Analyze code complexity using hybrid static + LLM analysis.
 */
export async function analyzeComplexity(
  code: string,
  language: string,
  useLlm: boolean = false,
): Promise<ComplexityAnalysis> {
  const { data } = await aiClient.post('/complexity-analysis', {
    code,
    language,
    use_llm: useLlm,
  });
  return data.analysis;
}

/**
 * Generate a progressive hint via the Python AI service.
 */
export async function generateHint(params: {
  problemId: string;
  problemTitle: string;
  problemDescription: string;
  code: string;
  language: string;
  hintLevel?: number;
  conversationHistory?: Array<{ role: string; content: string }>;
  userMessage?: string;
}): Promise<HintResponse> {
  const { data } = await aiClient.post('/generate-hint', {
    problem_id: params.problemId,
    problem_title: params.problemTitle,
    problem_description: params.problemDescription,
    code: params.code,
    language: params.language,
    hint_level: params.hintLevel || 1,
    conversation_history: params.conversationHistory || [],
    user_message: params.userMessage,
    stream: false,
  });

  return {
    id: '',  // Populated by Node backend after DB persist
    content: data.content,
    hintLevel: data.hint_level,
    conversationId: '',  // Populated by Node backend
    metadata: data.metadata,
  };
}

/**
 * Stream hint generation from Python AI service.
 * Calls the streaming endpoint and yields SSE chunks.
 */
export async function* streamHint(params: {
  problemId: string;
  problemTitle: string;
  problemDescription: string;
  code: string;
  language: string;
  hintLevel?: number;
  conversationHistory?: Array<{ role: string; content: string }>;
  userMessage?: string;
}): AsyncGenerator<string> {
  const response = await aiClient.post(
    '/generate-hint',
    {
      problem_id: params.problemId,
      problem_title: params.problemTitle,
      problem_description: params.problemDescription,
      code: params.code,
      language: params.language,
      hint_level: params.hintLevel || 1,
      conversation_history: params.conversationHistory || [],
      user_message: params.userMessage,
      stream: true,
    },
    { responseType: 'stream' }
  );

  const stream = response.data;
  let buffer = '';

  for await (const chunk of stream) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield line.slice(6);
      }
    }
  }
}

/**
 * Retrieve relevant context from the knowledge base.
 */
export async function retrieveContext(
  query: string,
  options?: {
    topK?: number;
    difficulty?: string;
    topics?: string[];
    type?: string;
  },
): Promise<RetrievalResult[]> {
  const { data } = await aiClient.post('/retrieve-context', {
    query,
    top_k: options?.topK || 5,
    difficulty: options?.difficulty,
    topics: options?.topics,
    doc_type: options?.type,
  });
  return data.results;
}

/**
 * Evaluate a generated hint for quality.
 */
export async function evaluateHint(params: {
  hintId: string;
  hintContent: string;
  hintLevel: number;
  problemDescription: string;
  userCode: string;
}): Promise<HintEvaluation> {
  const { data } = await aiClient.post('/evaluate-hint', {
    hint_id: params.hintId,
    hint_content: params.hintContent,
    hint_level: params.hintLevel,
    problem_description: params.problemDescription,
    user_code: params.userCode,
  });

  return {
    id: '',
    hintId: params.hintId,
    relevanceScore: data.evaluation.relevance_score,
    hallucination: data.evaluation.hallucination,
    solutionLeakage: data.evaluation.solution_leakage,
    responseLatencyMs: 0,
    userRating: null,
  };
}

/**
 * Check Python AI service health.
 */
export async function checkAIServiceHealth(): Promise<{
  healthy: boolean;
  providers: Record<string, boolean>;
  faissLoaded: boolean;
}> {
  try {
    const { data } = await axios.get(`${config.AI_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    return {
      healthy: data.status === 'healthy',
      providers: data.providers,
      faissLoaded: data.faiss_loaded,
    };
  } catch {
    return { healthy: false, providers: {}, faissLoaded: false };
  }
}
