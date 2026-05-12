import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import * as aiClient from '../../services/ai-client.js';
import { SSEHandler } from '../../services/ai/streaming.js';

const router = Router();

// POST /api/hints/generate — generate a hint (non-streaming)
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { problemId, code, language, conversationId, requestedLevel, userMessage } = req.body;

    if (!problemId || !code || !language) {
      return res.status(400).json({ error: 'problemId, code, and language are required' });
    }

    // AST analysis
    logger.info('Starting AST analysis');
    const analysis = await aiClient.analyzeCode(code, language);
    logger.info('AST analysis completed');

    // Complexity analysis
    logger.info('Starting complexity analysis');
    const complexity = await aiClient.analyzeComplexity(code, language);
    logger.info('Complexity analysis completed');

    // Generate hint
    logger.info('Starting hint generation');
    const hint = await aiClient.generateHint({
      problemId,
      problemTitle: '', // Would be fetched from DB in full integration
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
    res.status(500).json({ error: 'Failed to generate hint' });
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
    sse.sendError('Failed to stream hint');
  }
});

export { router as hintRoutes };