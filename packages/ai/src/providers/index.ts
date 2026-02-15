// AI 提供商管理

import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type AIProviderName = 'openai' | 'anthropic' | 'wenxin' | 'tongyi';

export interface AIProviderConfig {
  name: AIProviderName;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIProviderManager {
  private providers: Map<AIProviderName, BaseChatModel> = new Map();
  private defaultProvider: AIProviderName = 'openai';

  constructor(configs: Partial<Record<AIProviderName, AIProviderConfig>> = {}) {
    this.initializeProviders(configs);
  }

  private initializeProviders(configs: Partial<Record<AIProviderName, AIProviderConfig>>) {
    // 初始化 OpenAI
    if (configs.openai?.apiKey || process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new ChatOpenAI({
        modelName: configs.openai?.model || 'gpt-4-turbo-preview',
        temperature: configs.openai?.temperature ?? 0.7,
        maxTokens: configs.openai?.maxTokens ?? 4096,
        openAIApiKey: configs.openai?.apiKey || process.env.OPENAI_API_KEY,
      }));
    }
  }

  getProvider(name?: AIProviderName): BaseChatModel {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI provider '${providerName}' is not configured`);
    }
    return provider;
  }

  setDefaultProvider(name: AIProviderName): void {
    if (!this.providers.has(name)) {
      throw new Error(`AI provider '${name}' is not configured`);
    }
    this.defaultProvider = name;
  }

  hasProvider(name: AIProviderName): boolean {
    return this.providers.has(name);
  }
}

// 全局单例
let globalManager: AIProviderManager | null = null;

export function getAIManager(): AIProviderManager {
  if (!globalManager) {
    globalManager = new AIProviderManager();
  }
  return globalManager;
}

export function initializeAI(configs: Partial<Record<AIProviderName, AIProviderConfig>>): AIProviderManager {
  globalManager = new AIProviderManager(configs);
  return globalManager;
}
