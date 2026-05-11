import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// GET /api/problems — list problems
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', difficulty, topic } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (difficulty) {
      where.difficulty = Array.isArray(difficulty)
        ? difficulty[0]
        : difficulty;
    }
    if (topic) {
      where.topics = {
        has: Array.isArray(topic)
          ? topic[0]
          : topic
      };
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        select: {
          id: true, title: true, slug: true, difficulty: true,
          topics: true, companies: true,
          _count: { select: { submissions: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'asc' },
      }),
      prisma.problem.count({ where }),
    ]);

    res.json({ data: problems, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    logger.error('Failed to list problems:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// GET /api/problems/:slug — get problem by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      include: {
        testCases: {
          where: { isHidden: false },
          select: { id: true, input: true, expected: true, isHidden: true },
        },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ data: problem });
  } catch (error) {
    logger.error('Failed to get problem:', error);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

export { router as problemRoutes };
