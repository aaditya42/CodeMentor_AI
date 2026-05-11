/**
 * Code Execution Service — Judge0 CE Integration
 * Provides secure, sandboxed code execution with async polling.
 * Abstracted behind an interface so the execution provider can be swapped.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

// --- Language ID mapping for Judge0 ---
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  PYTHON: 71,   // Python 3.8
  CPP: 54,      // C++ 17 (GCC 9.2)
  JAVA: 62,     // Java (OpenJDK 13)
  JAVASCRIPT: 63, // JavaScript (Node.js 12)
};

// --- Execution Provider Interface ---
export interface ExecutionResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'PENDING';
  stdout: string;
  stderr: string;
  compileOutput: string;
  time: string;
  memory: number;
  testCasesPassed?: number;
  totalTestCases?: number;
}

export interface ExecutionProvider {
  execute(code: string, language: string, stdin: string): Promise<ExecutionResult>;
  executeWithTestCases(
    code: string,
    language: string,
    testCases: Array<{ input: string; expected: string }>
  ): Promise<ExecutionResult>;
}

// --- Judge0 Provider ---

class Judge0Provider implements ExecutionProvider {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.JUDGE0_URL || 'http://localhost:2358';
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    logger.info(`Judge0 provider initialized: ${baseURL}`);
  }

  async execute(code: string, language: string, stdin: string = ''): Promise<ExecutionResult> {
    const languageId = JUDGE0_LANGUAGE_IDS[language];
    if (!languageId) {
      return {
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: `Unsupported language: ${language}`,
        compileOutput: '',
        time: '0',
        memory: 0,
      };
    }

    try {
      // Submit (async mode)
      const { data: submission } = await this.client.post('/submissions', {
        source_code: Buffer.from(code).toString('base64'),
        language_id: languageId,
        stdin: stdin ? Buffer.from(stdin).toString('base64') : '',
        cpu_time_limit: 5,     // 5 seconds
        memory_limit: 262144,  // 256 MB
        wall_time_limit: 10,
      }, {
        params: { base64_encoded: 'true', wait: 'false' },
      });

      const token = submission.token;
      logger.debug(`Judge0 submission created: ${token}`);

      // Poll for result
      return await this.pollResult(token);
    } catch (error: any) {
      logger.error(`Judge0 execution failed: ${error.message}`);
      return {
        status: 'RUNTIME_ERROR',
        stdout: '',
        stderr: `Execution service error: ${error.message}`,
        compileOutput: '',
        time: '0',
        memory: 0,
      };
    }
  }

  async executeWithTestCases(
    code: string,
    language: string,
    testCases: Array<{ input: string; expected: string }>
  ): Promise<ExecutionResult> {
    if (!testCases.length) {
      return this.execute(code, language, '');
    }

    let passed = 0;
    let lastResult: ExecutionResult | null = null;

    for (const tc of testCases) {
      const result = await this.execute(code, language, tc.input);
      lastResult = result;

      if (result.status !== 'ACCEPTED' && result.status !== 'PENDING') {
        // If non-AC status, return immediately
        if (result.status !== 'WRONG_ANSWER') {
          return { ...result, testCasesPassed: passed, totalTestCases: testCases.length };
        }
      }

      // Check output
      const actual = result.stdout.trim();
      const expected = tc.expected.trim();
      if (actual === expected) {
        passed++;
      } else {
        return {
          status: 'WRONG_ANSWER',
          stdout: actual,
          stderr: `Expected: ${expected}\nGot: ${actual}`,
          compileOutput: result.compileOutput,
          time: result.time,
          memory: result.memory,
          testCasesPassed: passed,
          totalTestCases: testCases.length,
        };
      }
    }

    return {
      status: 'ACCEPTED',
      stdout: lastResult?.stdout || '',
      stderr: '',
      compileOutput: '',
      time: lastResult?.time || '0',
      memory: lastResult?.memory || 0,
      testCasesPassed: passed,
      totalTestCases: testCases.length,
    };
  }

  private async pollResult(token: string, maxAttempts = 20): Promise<ExecutionResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 500)); // 500ms poll interval

      try {
        const { data } = await this.client.get(`/submissions/${token}`, {
          params: { base64_encoded: 'true', fields: '*' },
        });

        const statusId = data.status?.id;

        // Still processing
        if (statusId === 1 || statusId === 2) continue;

        return this.normalizeResult(data);
      } catch (error: any) {
        logger.warn(`Poll attempt ${i + 1} failed: ${error.message}`);
      }
    }

    return {
      status: 'TIME_LIMIT_EXCEEDED',
      stdout: '',
      stderr: 'Execution timed out while polling for results',
      compileOutput: '',
      time: '0',
      memory: 0,
    };
  }

  private normalizeResult(data: any): ExecutionResult {
    const statusId = data.status?.id;
    const decode = (b64: string | null) => b64 ? Buffer.from(b64, 'base64').toString('utf-8') : '';

    let status: ExecutionResult['status'];
    switch (statusId) {
      case 3: status = 'ACCEPTED'; break;
      case 4: status = 'WRONG_ANSWER'; break;
      case 5: status = 'TIME_LIMIT_EXCEEDED'; break;
      case 6: status = 'COMPILATION_ERROR'; break;
      default: status = statusId >= 7 ? 'RUNTIME_ERROR' : 'PENDING';
    }

    return {
      status,
      stdout: decode(data.stdout),
      stderr: decode(data.stderr),
      compileOutput: decode(data.compile_output),
      time: data.time || '0',
      memory: data.memory || 0,
    };
  }
}

// --- Singleton (swappable provider) ---
let provider: ExecutionProvider | null = null;

export function getExecutionProvider(): ExecutionProvider {
  if (!provider) {
    provider = new Judge0Provider();
  }
  return provider;
}

export function setExecutionProvider(p: ExecutionProvider) {
  provider = p;
}
