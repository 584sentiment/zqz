// AI 服务封装

import { getAIManager } from '../providers';
import { getPromptTemplate } from '../prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

/**
 * AI 服务错误类型
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AIServiceErrorCode,
    public readonly retryable: boolean = true,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export enum AIServiceErrorCode {
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 解析错误并返回友好的错误信息
 */
function handleAIError(error: unknown, operation: string): never {
  if (error instanceof AIServiceError) {
    throw error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  // 根据错误类型返回特定错误码
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    throw new AIServiceError(
      'AI 服务请求过于频繁，请稍后再试',
      AIServiceErrorCode.RATE_LIMIT_EXCEEDED,
      true,
      error
    );
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    throw new AIServiceError(
      'AI 服务响应超时，请检查网络连接后重试',
      AIServiceErrorCode.TIMEOUT,
      true,
      error
    );
  }

  if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
    throw new AIServiceError(
      '网络连接失败，请检查网络设置',
      AIServiceErrorCode.NETWORK_ERROR,
      true,
      error
    );
  }

  if (errorMessage.includes('not configured') || errorMessage.includes('API key')) {
    throw new AIServiceError(
      'AI 服务未正确配置',
      AIServiceErrorCode.PROVIDER_NOT_CONFIGURED,
      false,
      error
    );
  }

  if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
    throw new AIServiceError(
      'AI 服务暂时不可用，请稍后再试',
      AIServiceErrorCode.SERVICE_UNAVAILABLE,
      true,
      error
    );
  }

  // 默认错误
  throw new AIServiceError(
    `${operation}失败，请稍后重试`,
    AIServiceErrorCode.UNKNOWN,
    true,
    error
  );
}

/**
 * 岗位解析服务
 */
export class JobParsingService {
  async parse(jobDescription: string): Promise<Record<string, unknown>> {
    try {
      const llm = getAIManager().getProvider('deepseek');
      const prompt = PromptTemplate.fromTemplate(getPromptTemplate('jobParsing'));

      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      const result = await chain.invoke({ jobDescription });

      try {
        return JSON.parse(result);
      } catch {
        // 如果返回的不是纯 JSON，尝试提取 JSON 部分
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new AIServiceError(
          '岗位描述解析失败，请检查格式后重试',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }
    } catch (error) {
      handleAIError(error, '岗位解析');
    }
  }
}

/**
 * 简历生成服务
 */
export class ResumeGenerationService {
  async generate(userProfile: string, jobDescription: string): Promise<Record<string, unknown>> {
    try {
      const llm = getAIManager().getProvider('deepseek');
      const prompt = PromptTemplate.fromTemplate(getPromptTemplate('resumeGeneration'));

      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      const result = await chain.invoke({ userProfile, jobDescription });

      try {
        return JSON.parse(result);
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new AIServiceError(
          '简历生成失败，请稍后重试',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }
    } catch (error) {
      handleAIError(error, '简历生成');
    }
  }
}

/**
 * 技能发掘服务
 */
export class SkillDiscoveryService {
  async chat(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<{
    response: string;
    discoveredSkills: string[];
    isComplete: boolean;
  }> {
    try {
      const llm = getAIManager().getProvider('deepseek');
      const systemPrompt = getPromptTemplate('skillDiscovery');

      const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        ...conversationHistory.map((msg) =>
          msg.role === 'user'
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
        new HumanMessage(message),
      ];

      const result = await llm.invoke(messages);

      try {
        const parsed = JSON.parse(result.content as string);
        return {
          response: parsed.response || result.content,
          discoveredSkills: parsed.discoveredSkills || [],
          isComplete: parsed.isComplete || false,
        };
      } catch {
        return {
          response: result.content as string,
          discoveredSkills: [],
          isComplete: false,
        };
      }
    } catch (error) {
      handleAIError(error, '技能发掘');
    }
  }
}

/**
 * 面试服务
 */
export class InterviewService {
  async generateQuestions(jobInfo: string, resumeSummary: string): Promise<unknown[]> {
    try {
      const llm = getAIManager().getProvider('deepseek');
      const prompt = PromptTemplate.fromTemplate(getPromptTemplate('interviewQuestionGeneration'));

      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      const result = await chain.invoke({ jobInfo, resumeSummary });

      try {
        return JSON.parse(result);
      } catch {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new AIServiceError(
          '面试问题生成失败，请稍后重试',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }
    } catch (error) {
      handleAIError(error, '面试问题生成');
    }
  }

  async evaluateAnswer(question: string, answer: string): Promise<Record<string, unknown>> {
    try {
      const llm = getAIManager().getProvider('deepseek');
      const prompt = PromptTemplate.fromTemplate(getPromptTemplate('interviewEvaluation'));

      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      const result = await chain.invoke({ question, answer });

      try {
        return JSON.parse(result);
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new AIServiceError(
          '答案评估失败，请稍后重试',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }
    } catch (error) {
      handleAIError(error, '答案评估');
    }
  }
}
