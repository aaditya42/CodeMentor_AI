import { Router, Request, Response } from 'express';
import { getExecutionProvider } from '../../services/executor.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// POST /api/execute/run — run code against test cases
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { code, language, testCases } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'code and language are required' });
    }

    const executor = getExecutionProvider();

    if (testCases && testCases.length > 0) {
      const result = await executor.executeWithTestCases(code, language, testCases);
      return res.json({ data: result });
    } else {
      const result = await executor.execute(code, language, '');
      return res.json({ data: result });
    }
  } catch (error: any) {
    logger.error('Code execution failed:', error);
    res.status(500).json({ error: 'Execution failed' });
  }
});

// POST /api/execute/submit — submit solution for full evaluation
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { code, language, problemId } = req.body;

    if (!code || !language || !problemId) {
      return res.status(400).json({ error: 'code, language, and problemId are required' });
    }

    // In full integration, would fetch all test cases (including hidden) from DB
    const executor = getExecutionProvider();
    const result = await executor.execute(code, language, '');

    res.json({ data: result });
  } catch (error: any) {
    logger.error('Submission failed:', error);
    res.status(500).json({ error: 'Submission failed' });
  }
});

export { router as executionRoutes };
