// AI 服务封装

import { getAIManager } from '../providers';
import { getPromptTemplate } from '../prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

/**
 * 性能监控结果
 */
export interface PerformanceMetrics {
  firstByteTime: number; // 首字节时间（毫秒）
  totalTime: number; // 总响应时间（毫秒）
  success: boolean;
  error?: string;
}

/**
 * AI 调用性能监控器
 */
export class AIPerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000;

  /**
   * 记录性能指标
   */
  static recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    // 保持最近 1000 条记录
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * 获取平均性能指标
   */
  static getAverageMetrics(): {
    avgFirstByteTime: number;
    avgTotalTime: number;
    successRate: number;
    p95TotalTime: number;
  } {
    if (this.metrics.length === 0) {
      return { avgFirstByteTime: 0, avgTotalTime: 0, successRate: 0, p95TotalTime: 0 };
    }

    const successMetrics = this.metrics.filter((m) => m.success);
    const totalFirstByte = successMetrics.reduce((sum, m) => sum + m.firstByteTime, 0);
    const totalTime = successMetrics.reduce((sum, m) => sum + m.totalTime, 0);

    // 计算 P95
    const sortedTimes = [...successMetrics.map((m) => m.totalTime)].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95TotalTime = sortedTimes[p95Index] || 0;

    return {
      avgFirstByteTime: successMetrics.length > 0 ? totalFirstByte / successMetrics.length : 0,
      avgTotalTime: successMetrics.length > 0 ? totalTime / successMetrics.length : 0,
      successRate: this.metrics.filter((m) => m.success).length / this.metrics.length,
      p95TotalTime,
    };
  }

  /**
   * 清除历史指标
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * 带超时和性能监控的 AI 调用包装器
 */
export async function withTimeoutAndMetrics<T>(
  operation: string,
  promise: Promise<T>,
  timeout: number = 30000,
  firstByteTimeout: number = 3000
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const startTime = Date.now();
  let firstByteTime = 0;

  // 创建超时 Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AIServiceError(
        `${operation}超时（${timeout}ms）`,
        AIServiceErrorCode.TIMEOUT,
        true
      ));
    }, timeout);
  });

  try {
    // 竞速执行
    const result = await Promise.race([promise, timeoutPromise]);

    // 记录首字节时间（对于流式响应，这应该是第一个数据块到达的时间）
    firstByteTime = Date.now() - startTime;
    const totalTime = Date.now() - startTime;

    const metrics: PerformanceMetrics = {
      firstByteTime,
      totalTime,
      success: true,
    };

    // 检查首字节时间
    if (firstByteTime > firstByteTimeout) {
      console.warn(`[AI Performance] ${operation} 首字节响应时间过长: ${firstByteTime}ms (阈值: ${firstByteTimeout}ms)`);
    }

    // 检查总响应时间
    if (totalTime > timeout * 0.8) {
      console.warn(`[AI Performance] ${operation} 总响应时间接近超时: ${totalTime}ms (阈值: ${timeout}ms)`);
    }

    AIPerformanceMonitor.recordMetric(metrics);

    return { result, metrics };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const metrics: PerformanceMetrics = {
      firstByteTime: totalTime,
      totalTime,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    AIPerformanceMonitor.recordMetric(metrics);
    throw error;
  }
}

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
  CONTENT_UNSAFE = 'CONTENT_UNSAFE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 内容安全检查结果
 */
export interface ContentSafetyResult {
  isSafe: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  flaggedContent?: string;
  suggestion?: string;
}

/**
 * 内容安全服务
 * 用于检测和过滤敏感内容
 */
export class ContentSafetyService {
  // 敏感词列表（基础版）
  private static readonly SENSITIVE_PATTERNS: Array<{
    pattern: RegExp;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    // 暴力相关
    { pattern: /暴力|杀戮|凶杀|谋杀|恐怖袭击/i, category: 'violence', severity: 'high' },
    { pattern: /炸弹|爆炸|武器|枪支|弹药/i, category: 'violence', severity: 'high' },

    // 违法内容
    { pattern: /毒品|贩毒|走私|洗钱|诈骗/i, category: 'illegal', severity: 'critical' },
    { pattern: /赌博|博彩|非法集资/i, category: 'illegal', severity: 'high' },

    // 个人信息泄露
    { pattern: /身份证号[：:]\s*\d{17}[\dXx]/i, category: 'privacy', severity: 'medium' },
    { pattern: /银行卡[号]?[：:]\s*\d{16,19}/i, category: 'privacy', severity: 'high' },
    { pattern: /密码[：:]\s*\S{6,}/i, category: 'privacy', severity: 'high' },

    // 歧视性内容
    { pattern: /种族歧视|民族歧视|地域歧视/i, category: 'discrimination', severity: 'high' },

    // 骚扰内容
    { pattern: /性骚扰|骚扰电话|恶意骚扰/i, category: 'harassment', severity: 'medium' },
  ];

  // PII 检测模式
  private static readonly PII_PATTERNS = [
    { pattern: /\b\d{17}[\dXx]\b/g, type: 'chinese_id', description: '中国身份证号' },
    { pattern: /\b1[3-9]\d{9}\b/g, type: 'phone', description: '手机号码' },
    { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/g, type: 'email', description: '邮箱地址' },
    { pattern: /\b\d{16,19}\b/g, type: 'bank_card', description: '银行卡号' },
  ];

  /**
   * 检查内容安全性
   */
  checkContent(content: string): ContentSafetyResult {
    if (!content || content.trim().length === 0) {
      return {
        isSafe: true,
        severity: 'none',
        categories: [],
      };
    }

    const flaggedCategories: string[] = [];
    let maxSeverity: ContentSafetyResult['severity'] = 'none';
    let flaggedContent = '';

    // 检查敏感词
    for (const { pattern, category, severity } of ContentSafetyService.SENSITIVE_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        flaggedCategories.push(category);
        if (this.severityLevel(severity) > this.severityLevel(maxSeverity)) {
          maxSeverity = severity;
          flaggedContent = match[0];
        }
      }
    }

    // 检查 PII 泄露风险
    const piiCheck = this.checkPII(content);
    if (piiCheck.hasPII) {
      flaggedCategories.push('pii_risk');
      if (this.severityLevel('medium') > this.severityLevel(maxSeverity)) {
        maxSeverity = 'medium';
        flaggedContent = piiCheck.detected;
      }
    }

    const isSafe = maxSeverity === 'none' || maxSeverity === 'low';

    return {
      isSafe,
      severity: maxSeverity,
      categories: [...new Set(flaggedCategories)],
      flaggedContent: flaggedContent || undefined,
      suggestion: this.getSuggestion(maxSeverity),
    };
  }

  /**
   * 检查 PII（个人身份信息）
   */
  private checkPII(content: string): { hasPII: boolean; detected: string } {
    for (const { pattern, type } of ContentSafetyService.PII_PATTERNS) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // 排除邮箱（在求职场景中邮箱是正常的）
        if (type === 'email') continue;
        return { hasPII: true, detected: `[${type}]: ${matches[0].substring(0, 4)}...` };
      }
    }
    return { hasPII: false, detected: '' };
  }

  /**
   * 脱敏处理
   */
  sanitizeContent(content: string): string {
    let sanitized = content;

    // 脱敏身份证号
    sanitized = sanitized.replace(
      /\b(\d{6})\d{8}(\d{4})\b/g,
      '$1********$2'
    );

    // 脱敏手机号
    sanitized = sanitized.replace(
      /\b(\d{3})\d{4}(\d{4})\b/g,
      '$1****$2'
    );

    // 脱敏银行卡号
    sanitized = sanitized.replace(
      /\b(\d{4})\d{8,12}(\d{4})\b/g,
      '$1********$2'
    );

    return sanitized;
  }

  /**
   * 获取严重程度等级数值
   */
  private severityLevel(severity: ContentSafetyResult['severity']): number {
    const levels: Record<ContentSafetyResult['severity'], number> = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return levels[severity] || 0;
  }

  /**
   * 获取建议
   */
  private getSuggestion(severity: ContentSafetyResult['severity']): string | undefined {
    const suggestions: Record<string, string> = {
      low: '内容可能包含敏感信息，建议检查',
      medium: '内容包含可能敏感的信息，请检查是否需要修改',
      high: '内容包含敏感信息，请修改后再提交',
      critical: '内容包含严重违规信息，禁止提交',
    };
    return suggestions[severity];
  }
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

      // 使用性能监控包装
      const { result } = await withTimeoutAndMetrics(
        '岗位解析',
        chain.invoke({ jobDescription }),
        30000, // 30 秒超时
        3000   // 3 秒首字节阈值
      );

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
      const manager = getAIManager();

      // 检查 provider 是否可用
      if (!manager.hasProvider('deepseek')) {
        console.error('[ResumeGeneration] DeepSeek provider 未配置，检查环境变量 DEEPSEEK_API_KEY');
        throw new AIServiceError(
          'AI 服务未正确配置，请检查 DEEPSEEK_API_KEY 环境变量',
          AIServiceErrorCode.PROVIDER_NOT_CONFIGURED,
          false
        );
      }

      const llm = manager.getProvider('deepseek');
      const prompt = PromptTemplate.fromTemplate(getPromptTemplate('resumeGeneration'));

      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      console.log('[ResumeGeneration] 开始调用 AI 服务...');

      // 使用性能监控包装
      const { result } = await withTimeoutAndMetrics(
        '简历生成',
        chain.invoke({ userProfile, jobDescription }),
        90000, // 90 秒超时（简历生成是复杂任务）
        5000   // 5 秒首字节阈值
      );

      console.log('[ResumeGeneration] AI 响应长度:', result?.length || 0);

      try {
        return JSON.parse(result);
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        console.error('[ResumeGeneration] JSON 解析失败，响应内容:', result.substring(0, 500));
        throw new AIServiceError(
          '简历生成失败，AI 返回格式异常',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }
    } catch (error) {
      // 如果已经是 AIServiceError，直接抛出
      if (error instanceof AIServiceError) {
        throw error;
      }
      // 记录原始错误
      console.error('[ResumeGeneration] 原始错误:', error);
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

      // 使用性能监控包装
      const { result } = await withTimeoutAndMetrics(
        '技能发掘',
        llm.invoke(messages),
        30000, // 30 秒超时
        3000   // 3 秒首字节阈值
      );

      const content = result.content as string;

      // 尝试从响应中提取 JSON
      try {
        // 首先尝试直接解析
        const parsed = JSON.parse(content);
        return {
          response: parsed.response || content,
          discoveredSkills: parsed.discoveredSkills || [],
          isComplete: parsed.isComplete || false,
        };
      } catch {
        // 尝试提取 JSON 块
        const jsonMatch = content.match(/\{[\s\S]*"response"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              response: parsed.response || content,
              discoveredSkills: parsed.discoveredSkills || [],
              isComplete: parsed.isComplete || false,
            };
          } catch {
            // JSON 提取失败，返回原始内容
          }
        }

        // 如果无法解析 JSON，返回原始内容作为响应
        return {
          response: content,
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

      // 使用性能监控包装
      const { result } = await withTimeoutAndMetrics(
        '面试问题生成',
        chain.invoke({ jobInfo, resumeSummary }),
        30000, // 30 秒超时
        3000   // 3 秒首字节阈值
      );

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

      // 使用性能监控包装
      const { result } = await withTimeoutAndMetrics(
        '答案评估',
        chain.invoke({ question, answer }),
        30000, // 30 秒超时
        3000   // 3 秒首字节阈值
      );

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

// 导出简历建议服务
export {
  ResumeSuggestionService,
  getResumeSuggestionService,
} from './resume-suggestion';
export type {
  ResumeSuggestion,
  SectionOptimizeResult,
  JobKeywordExtraction,
  SkillMatchResult,
} from './resume-suggestion';
