import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createChatModel } from './provider.js';
import { SYSTEM_PROMPT, buildHintPrompt } from './prompts.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import type { HintLevel } from '@codementor/shared';

interface GenerateHintParams {
  userId: string;
  problemId: string;
  code: string;
  language: string;
  conversationId?: string;
  requestedLevel?: HintLevel;
  astAnalysis?: string;
  complexityAnalysis?: string;
  retrievalContext?: string[];
  userMessage?: string;
}

interface HintResult {
  content: string;
  hintLevel: number;
  conversationId: string;
  messageId: string;
}

export class HintGenerator {
  async generateHint(params: GenerateHintParams): Promise<HintResult> {
    const {
      userId,
      problemId,
      code,
      language,
      requestedLevel,
      astAnalysis,
      complexityAnalysis,
      retrievalContext,
      userMessage,
    } = params;

    // Get or create conversation
    let conversation = params.conversationId
      ? await prisma.conversation.findUnique({
          where: { id: params.conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        })
      : await prisma.conversation.findUnique({
          where: { userId_problemId: { userId, problemId } },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          problemId,
          hintLevel: 1,
        },
        include: { messages: true },
      });
    }

    // Determine hint level
    const hintLevel = requestedLevel || Math.min(conversation.hintLevel, 5) as HintLevel;

    // Fetch problem details
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      throw new Error('Problem not found');
    }

    // Build the prompt
    const conversationHistory = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const prompt = buildHintPrompt({
      hintLevel,
      problemTitle: problem.title,
      problemDescription: problem.description,
      userCode: code,
      language,
      astAnalysis,
      complexityAnalysis,
      retrievalContext,
      conversationHistory,
      userMessage,
    });

    // Save user's message
    if (userMessage) {
      await prisma.message.create({
        data: {
          role: 'USER',
          content: userMessage,
          conversationId: conversation.id,
        },
      });
    }

    // Generate hint with AI
    const model = createChatModel({ temperature: 0.4, maxTokens: 1500 });
    const startTime = Date.now();

    const response = await model.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(prompt),
    ]);

    const latencyMs = Date.now() - startTime;
    const hintContent = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    logger.info(`Hint generated in ${latencyMs}ms for problem ${problem.slug} at level ${hintLevel}`);

    // Save assistant's response
    const message = await prisma.message.create({
      data: {
        role: 'ASSISTANT',
        content: hintContent,
        hintLevel,
        metadata: {
          latencyMs,
          astUsed: !!astAnalysis,
          complexityUsed: !!complexityAnalysis,
          retrievalDocsCount: retrievalContext?.length || 0,
        },
        conversationId: conversation.id,
      },
    });

    // Update conversation hint level (only advance if they requested current level)
    const nextLevel = Math.min(hintLevel + 1, 5);
    if (hintLevel >= conversation.hintLevel) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { hintLevel: nextLevel },
      });
    }

    // Save to hint history
    await prisma.hintHistory.create({
      data: {
        hintLevel,
        content: hintContent,
        userId,
        problemId,
      },
    });

    return {
      content: hintContent,
      hintLevel,
      conversationId: conversation.id,
      messageId: message.id,
    };
  }

  async generateStreamingHint(
    params: GenerateHintParams,
    onChunk: (chunk: string) => void,
    onComplete: (result: HintResult) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const {
      userId,
      problemId,
      code,
      language,
      requestedLevel,
      astAnalysis,
      complexityAnalysis,
      retrievalContext,
      userMessage,
    } = params;

    try {
      // Get or create conversation
      let conversation = params.conversationId
        ? await prisma.conversation.findUnique({
            where: { id: params.conversationId },
            include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
          })
        : await prisma.conversation.findUnique({
            where: { userId_problemId: { userId, problemId } },
            include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
          });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { userId, problemId, hintLevel: 1 },
          include: { messages: true },
        });
      }

      const hintLevel = requestedLevel || Math.min(conversation.hintLevel, 5) as HintLevel;

      const problem = await prisma.problem.findUnique({ where: { id: problemId } });
      if (!problem) throw new Error('Problem not found');

      const conversationHistory = conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const prompt = buildHintPrompt({
        hintLevel,
        problemTitle: problem.title,
        problemDescription: problem.description,
        userCode: code,
        language,
        astAnalysis,
        complexityAnalysis,
        retrievalContext,
        conversationHistory,
        userMessage,
      });

      // Save user message
      if (userMessage) {
        await prisma.message.create({
          data: { role: 'USER', content: userMessage, conversationId: conversation.id },
        });
      }

      // Stream the response
      const model = createChatModel({ temperature: 0.4, maxTokens: 1500, streaming: true });
      const startTime = Date.now();
      let fullContent = '';

      const stream = await model.stream([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(prompt),
      ]);

      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        fullContent += text;
        onChunk(text);
      }

      const latencyMs = Date.now() - startTime;

      // Save the complete message
      const message = await prisma.message.create({
        data: {
          role: 'ASSISTANT',
          content: fullContent,
          hintLevel,
          metadata: { latencyMs, astUsed: !!astAnalysis, complexityUsed: !!complexityAnalysis },
          conversationId: conversation.id,
        },
      });

      // Advance hint level
      const nextLevel = Math.min(hintLevel + 1, 5);
      if (hintLevel >= conversation.hintLevel) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { hintLevel: nextLevel },
        });
      }

      await prisma.hintHistory.create({
        data: { hintLevel, content: fullContent, userId, problemId },
      });

      onComplete({
        content: fullContent,
        hintLevel,
        conversationId: conversation.id,
        messageId: message.id,
      });
    } catch (err) {
      onError(err as Error);
    }
  }
}

export const hintGenerator = new HintGenerator();
