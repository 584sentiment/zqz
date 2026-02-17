// AI 提供商管理

import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type AIProviderName = 'openai' | 'deepseek' | 'anthropic' | 'wenxin' | 'tongyi';

export interface AIProviderConfig {
  name: AIProviderName;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  timeout?: number; // 请求超时（毫秒）
  maxRetries?: number;
}

// 默认超时配置
const DEFAULT_TIMEOUT = 30000; // 30 秒
const DEFAULT_FIRST_BYTE_TIMEOUT = 3000; // 3 秒
const DEFAULT_MAX_RETRIES = 2;

export class AIProviderManager {
  private providers: Map<AIProviderName, BaseChatModel> = new Map();
  private defaultProvider: AIProviderName = 'deepseek';
  private configs: Partial<Record<AIProviderName, AIProviderConfig>> = {};

  constructor(configs: Partial<Record<AIProviderName, AIProviderConfig>> = {}) {
    this.configs = configs;
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
        timeout: configs.openai?.timeout ?? DEFAULT_TIMEOUT,
        maxRetries: configs.openai?.maxRetries ?? DEFAULT_MAX_RETRIES,
      }));
    }

    // 初始化 DeepSeek (使用 OpenAI 兼容 API)
    if (configs.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY) {
      this.providers.set('deepseek', new ChatOpenAI({
        modelName: configs.deepseek?.model || 'deepseek-chat',
        temperature: configs.deepseek?.temperature ?? 0.7,
        maxTokens: configs.deepseek?.maxTokens ?? 4096,
        openAIApiKey: configs.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY,
        timeout: configs.deepseek?.timeout ?? DEFAULT_TIMEOUT,
        maxRetries: configs.deepseek?.maxRetries ?? DEFAULT_MAX_RETRIES,
        configuration: {
          baseURL: configs.deepseek?.baseUrl || 'https://api.deepseek.com',
          timeout: configs.deepseek?.timeout ?? DEFAULT_TIMEOUT,
        },
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

  /**
   * 获取流式响应的 provider（用于更快的第一字节响应）
   */
  getStreamingProvider(name?: AIProviderName): BaseChatModel {
    const providerName = name || this.defaultProvider;
    const baseProvider = this.getProvider(providerName);

    // 返回支持流式的 provider
    // LangChain 的 ChatOpenAI 默认支持流式，无需额外配置
    return baseProvider;
  }

  /**
   * 获取超时配置
   */
  getTimeoutConfig(name?: AIProviderName): { timeout: number; firstByteTimeout: number } {
    const providerName = name || this.defaultProvider;
    const config = this.configs[providerName];
    return {
      timeout: config?.timeout ?? DEFAULT_TIMEOUT,
      firstByteTimeout: DEFAULT_FIRST_BYTE_TIMEOUT,
    };
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
