import { createChatModel } from '../ai/provider.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { EVALUATION_PROMPT } from '../ai/prompts.js';

interface EvaluationInput {
  hintId: string;
  hintContent: string;
  problemDescription: string;
  userCode: string;
  hintLevel: number;
}

interface EvaluationResult {
  relevanceScore: number;
  hallucination: boolean;
  solutionLeakage: boolean;
  pedagogicalQuality: number;
  reasoning: string;
}

export class EvaluationPipeline {
  async evaluateHint(input: EvaluationInput): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      const model = createChatModel({ temperature: 0, maxTokens: 500 });

      const prompt = EVALUATION_PROMPT
        .replace('{hint}', input.hintContent)
        .replace('{problem}', input.problemDescription)
        .replace('{code}', input.userCode);

      const response = await model.invoke([
        new SystemMessage('You are an expert evaluator. Respond only with valid JSON.'),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' ? response.content : '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        logger.warn('Evaluation response was not valid JSON');
        return this.defaultEvaluation();
      }

      const result: EvaluationResult = JSON.parse(jsonMatch[0]);
      const latencyMs = Date.now() - startTime;

      // Persist evaluation
      await prisma.evaluation.create({
        data: {
          hintId: input.hintId,
          relevanceScore: result.relevanceScore,
          hallucination: result.hallucination,
          solutionLeakage: result.solutionLeakage,
          responseLatencyMs: latencyMs,
        },
      });

      logger.info(`Hint ${input.hintId} evaluated: relevance=${result.relevanceScore}, leakage=${result.solutionLeakage}`);
      return result;
    } catch (err) {
      logger.error('Evaluation failed:', err);
      return this.defaultEvaluation();
    }
  }

  private defaultEvaluation(): EvaluationResult {
    return {
      relevanceScore: 0.5,
      hallucination: false,
      solutionLeakage: false,
      pedagogicalQuality: 0.5,
      reasoning: 'Evaluation could not be completed',
    };
  }

  // Aggregate evaluation metrics for admin dashboard
  async getAggregateMetrics() {
    const evaluations = await prisma.evaluation.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    if (evaluations.length === 0) {
      return { avgRelevance: 0, hallucinationRate: 0, leakageRate: 0, avgLatency: 0, totalEvaluated: 0 };
    }

    const totalEvaluated = evaluations.length;
    const avgRelevance = evaluations.reduce((sum, e) => sum + e.relevanceScore, 0) / totalEvaluated;
    const hallucinationRate = evaluations.filter(e => e.hallucination).length / totalEvaluated;
    const leakageRate = evaluations.filter(e => e.solutionLeakage).length / totalEvaluated;
    const avgLatency = evaluations.reduce((sum, e) => sum + e.responseLatencyMs, 0) / totalEvaluated;

    return { avgRelevance, hallucinationRate, leakageRate, avgLatency, totalEvaluated };
  }
}

export const evaluationPipeline = new EvaluationPipeline();
