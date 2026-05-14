import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import * as aiClient from '../../services/ai-client.js';
import { SSEHandler } from '../../services/ai/streaming.js';

const router = Router();

// POST /api/hints/generate — generate a hint (non-streaming)
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { problemId, code, language, requestedLevel, userMessage } = req.body;

    if (!problemId || !code || !language) {
      return res.status(400).json({
        error: 'problemId, code, and language are required',
      });
    }

    // ---------------- AST ANALYSIS ----------------
    let analysis = null;

    try {
      logger.info('Starting AST analysis');

      analysis = await Promise.race([
        aiClient.analyzeCode(code, language),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AST timeout')), 20000)
        ),
      ]);

      logger.info('AST analysis completed');
    } catch (err) {
      logger.error('AST analysis failed:', err);
    }

    // ---------------- COMPLEXITY ANALYSIS ----------------
    let complexity = null;

    try {
      logger.info('Starting complexity analysis');

      complexity = await Promise.race([
        aiClient.analyzeComplexity(code, language),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Complexity timeout')), 20000)
        ),
      ]);

      logger.info('Complexity analysis completed');
    } catch (err) {
      logger.error('Complexity analysis failed:', err);
    }

    // ---------------- HINT GENERATION ----------------
    logger.info('Starting hint generation');

    const hint = await aiClient.generateHint({
      problemId,
      problemTitle: '',
      problemDescription: '',
      code,
      language,
      hintLevel: requestedLevel || 1,
      userMessage,
    });

    logger.info('Hint generation completed');

    res.json({
      data: {
        content: hint.content,
        hintLevel: hint.hintLevel,
        analysis,
        complexity,
        metadata: hint.metadata,
      },
    });
  } catch (error: any) {
    logger.error('Hint generation failed:', error);

    // AI service cold start / temporary upstream issue
    if (
      error?.response?.status === 502 ||
      error?.message?.includes('timeout')
    ) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable. Please retry shortly.',
      });
    }

    return res.status(500).json({
      error: 'AI service temporarily unavailable. Please retry shortly.',
    });
  }
});

// GET /api/hints/stream — SSE streaming hint
router.get('/stream', async (req: Request, res: Response) => {
  const sse = new SSEHandler(res);

  try {
    const { problemId, code, language, requestedLevel } = req.query;

    if (!problemId || !code || !language) {
      sse.sendError('Missing required parameters');
      return;
    }

    // Stream from Python service
    const stream = aiClient.streamHint({
      problemId: String(problemId),
      problemTitle: '',
      problemDescription: '',
      code: String(code),
      language: String(language),
      hintLevel: Number(requestedLevel) || 1,
    });

    for await (const chunk of stream) {
      if (sse.isClosed) break;

      try {
        const parsed = JSON.parse(chunk);

        if (parsed.type === 'hint_chunk') {
          sse.sendChunk(parsed.content);
        } else if (parsed.type === 'analysis') {
          sse.sendAnalysis(parsed.data);
        } else if (parsed.type === 'complexity') {
          sse.sendComplexity(parsed.data);
        } else if (parsed.type === 'provider_status') {
          sse.sendProviderStatus(parsed.content);
        } else if (parsed.type === 'hint_complete') {
          sse.sendComplete('');
        }
      } catch {
        sse.sendChunk(chunk);
      }
    }

    if (!sse.isClosed) {
      sse.sendComplete('');
    }
  } catch (error: any) {
    logger.error('Streaming hint failed:', error);
    sse.sendError('AI service temporarily unavailable. Please retry shortly.');
  }
});

// POST /api/hints/stream — SSE streaming hint via POST (for large payloads)
router.post('/stream', async (req: Request, res: Response) => {
  const sse = new SSEHandler(res);

  try {
    const { problemId, code, language, requestedLevel, userMessage } = req.body;

    if (!problemId || !code || !language) {
      sse.sendError('Missing required parameters');
      return;
    }

    // Stream from Python service
    const stream = aiClient.streamHint({
      problemId: String(problemId),
      problemTitle: '',
      problemDescription: '',
      code: String(code),
      language: String(language),
      hintLevel: Number(requestedLevel) || 1,
      userMessage,
    });

    for await (const chunk of stream) {
      if (sse.isClosed) break;

      try {
        const parsed = JSON.parse(chunk);

        if (parsed.type === 'hint_chunk') {
          sse.sendChunk(parsed.content);
        } else if (parsed.type === 'analysis') {
          sse.sendAnalysis(parsed.data);
        } else if (parsed.type === 'complexity') {
          sse.sendComplexity(parsed.data);
        } else if (parsed.type === 'provider_status') {
          sse.sendProviderStatus(parsed.content);
        } else if (parsed.type === 'hint_complete') {
          sse.sendComplete('');
        }
      } catch {
        sse.sendChunk(chunk);
      }
    }

    if (!sse.isClosed) {
      sse.sendComplete('');
    }
  } catch (error: any) {
    logger.error('Streaming hint failed:', error);
    sse.sendError('AI service temporarily unavailable. Please retry shortly.');
  }
});

export { router as hintRoutes };