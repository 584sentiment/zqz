// AI 服务封装

import { getAIManager } from '../providers';
import { getPromptTemplate, fillPromptTemplate } from '../prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * 岗位解析服务
 */
export class JobParsingService {
  async parse(jobDescription: string): Promise<Record<string, unknown>> {
    const llm = getAIManager().getProvider('openai');
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
      throw new Error('Failed to parse job description');
    }
  }
}

/**
 * 简历生成服务
 */
export class ResumeGenerationService {
  async generate(userProfile: string, jobDescription: string): Promise<Record<string, unknown>> {
    const llm = getAIManager().getProvider('openai');
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
      throw new Error('Failed to generate resume');
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
    const llm = getAIManager().getProvider('openai');
    const systemPrompt = getPromptTemplate('skillDiscovery');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
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
  }
}

/**
 * 面试服务
 */
export class InterviewService {
  async generateQuestions(jobInfo: string, resumeSummary: string): Promise<unknown[]> {
    const llm = getAIManager().getProvider('openai');
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
      throw new Error('Failed to generate interview questions');
    }
  }

  async evaluateAnswer(question: string, answer: string): Promise<Record<string, unknown>> {
    const llm = getAIManager().getProvider('openai');
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
      throw new Error('Failed to evaluate answer');
    }
  }
}
