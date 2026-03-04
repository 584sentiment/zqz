/**
 * 简历内容建议服务
 */

import { getAIManager } from '../providers';
import { withTimeoutAndMetrics } from './index';

export interface ResumeSuggestion {
  id: string;
  type: 'grammar' | 'content' | 'keyword' | 'format';
  section: string;
  original: string;
  suggestion: string;
  reason: string;
  confidence: number;
}

export class ResumeSuggestionService {
  /**
   * 获取内容优化建议
   */
  async getSuggestions(
    sectionType: string,
    content: string,
    jobContext?: string
  ): Promise<ResumeSuggestion[]> {
    if (!content || content.length < 10) {
      return [];
    }

    const llm = getAIManager().getProvider('deepseek');

    const prompt = `你是一位专业的简历优化专家。请分析以下简历${sectionType}区块的内容，并提供具体的优化建议。

内容：
${content}

${jobContext ? `目标岗位要求：\n${jobContext}` : ''}

请以 JSON 数组格式返回建议，每条建议包含：
- type: grammar(语法问题) | content(内容优化) | keyword(关键词建议) | format(格式问题)
- original: 原文中有问题的部分（简短引用）
- suggestion: 建议的修改内容
- reason: 修改原因（简短说明）
- confidence: 置信度 0-1 的数字

要求：
1. 只返回真正需要改进的内容，不要强行找问题
2. 建议要具体可操作
3. 如果内容已经很好，返回空数组 []
4. 最多返回 3 条建议

直接返回 JSON 数组，不要包含其他文字：`;

    try {
      const { result } = await withTimeoutAndMetrics(
        '简历建议',
        llm.invoke(prompt),
        15000,
        3000
      );

      const text = result.content as string;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        // 为每个建议添加 ID
        return suggestions.map((s: Omit<ResumeSuggestion, 'id'>, i: number) => ({
          ...s,
          id: `sug-${Date.now()}-${i}`,
          section: sectionType,
        }));
      }
      return [];
    } catch (error) {
      console.error('获取简历建议失败:', error);
      return [];
    }
  }

  /**
   * 优化整段内容
   */
  async optimizeContent(
    sectionType: string,
    content: string,
    jobContext?: string
  ): Promise<string | null> {
    if (!content || content.length < 10) {
      return null;
    }

    const llm = getAIManager().getProvider('deepseek');

    const prompt = `你是一位专业的简历优化专家。请优化以下简历${sectionType}区块的内容。

原内容：
${content}

${jobContext ? `目标岗位要求：\n${jobContext}` : ''}

优化要求：
1. 使用更专业的表达方式
2. 突出关键成就和数据
3. 使用动词开头，强调行动和结果
4. 保持简洁，避免冗余
5. 保持原有信息不变，只优化表达

直接返回优化后的内容，不要包含其他文字或解释：`;

    try {
      const { result } = await withTimeoutAndMetrics(
        '简历内容优化',
        llm.invoke(prompt),
        20000,
        5000
      );

      const optimized = (result.content as string).trim();
      // 如果优化后的内容和原文相同，返回 null
      if (optimized === content.trim()) {
        return null;
      }
      return optimized;
    } catch (error) {
      console.error('优化简历内容失败:', error);
      return null;
    }
  }
}

// 单例
let suggestionService: ResumeSuggestionService | null = null;

export function getResumeSuggestionService(): ResumeSuggestionService {
  if (!suggestionService) {
    suggestionService = new ResumeSuggestionService();
  }
  return suggestionService;
}
