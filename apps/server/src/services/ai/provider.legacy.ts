import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { config } from '../../config/index.js';
import { AIProviderError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export type ProviderName = 'openai' | 'anthropic';

interface ProviderConfig {
  provider: ProviderName;
  model: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export function createChatModel(overrides?: Partial<ProviderConfig>): BaseChatModel {
  const providerName = overrides?.provider || config.AI_PROVIDER;
  const model = overrides?.model || config.AI_MODEL;
  const temperature = overrides?.temperature ?? 0.3;
  const maxTokens = overrides?.maxTokens ?? 2048;
  const streaming = overrides?.streaming ?? false;

  logger.debug(`Creating AI model: ${providerName}/${model}`);

  switch (providerName) {
    case 'openai': {
      if (!config.OPENAI_API_KEY) {
        throw new AIProviderError('openai', 'OPENAI_API_KEY not configured');
      }
      return new ChatOpenAI({
        openAIApiKey: config.OPENAI_API_KEY,
        modelName: model,
        temperature,
        maxTokens,
        streaming,
      });
    }

    case 'anthropic': {
      if (!config.ANTHROPIC_API_KEY) {
        throw new AIProviderError('anthropic', 'ANTHROPIC_API_KEY not configured');
      }
      return new ChatAnthropic({
        anthropicApiKey: config.ANTHROPIC_API_KEY,
        modelName: model,
        temperature,
        maxTokens,
        streaming,
      });
    }

    default:
      throw new AIProviderError(providerName, `Unsupported provider: ${providerName}`);
  }
}

// Create embedding model (OpenAI only for now, as it has the best embedding models)
export function createEmbeddingModel() {
  const { OpenAIEmbeddings } = require('@langchain/openai');

  if (!config.OPENAI_API_KEY) {
    throw new AIProviderError('openai', 'OPENAI_API_KEY required for embeddings');
  }

  return new OpenAIEmbeddings({
    openAIApiKey: config.OPENAI_API_KEY,
    modelName: config.EMBEDDING_MODEL,
    dimensions: config.EMBEDDING_DIMENSIONS,
  });
}
