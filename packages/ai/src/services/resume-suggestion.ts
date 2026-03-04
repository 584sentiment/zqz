/**
 * 简历内容建议服务
 */

import { getAIManager } from '../providers';
import { withTimeoutAndMetrics } from './index';

export interface ResumeSuggestion {
  id: string;
  type: 'grammar' | 'content' | 'keyword' | 'format';
  section: string;
  sectionPath: string;
  original: string;
  suggestion: string;
  reason: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

export interface SectionOptimizeResult {
  optimized: string;
  changes: Array<{
    original: string;
    modified: string;
    reason: string;
  }>;
}

export interface JobKeywordExtraction {
  technicalSkills: string[];
  softSkills: string[];
  requirements: string[];
  responsibilities: string[];
  industry: string;
  experienceLevel: string;
}

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  recommended: string[];
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
          sectionPath: sectionType,
          severity: 'medium' as const,
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

  /**
   * 获取整份简历的全面优化建议
   */
  async getFullResumeSuggestions(
    resumeContent: Record<string, unknown>,
    jobContext?: string
  ): Promise<ResumeSuggestion[]> {
    const llm = getAIManager().getProvider('deepseek');

    // 将简历内容转为可读格式
    const contentSummary = this.formatResumeContent(resumeContent);

    const prompt = `你是一位资深的简历审核专家。请全面分析以下简历内容，找出需要改进的地方。

简历内容：
${contentSummary}

${jobContext ? `目标岗位要求：\n${jobContext}` : ''}

请以 JSON 数组格式返回建议，每条建议包含：
- type: grammar(语法问题) | content(内容优化) | keyword(关键词建议) | format(格式问题)
- section: 区块名称（如：个人简介、技能、工作经历等）
- sectionPath: 区块路径（如：summary、skills、experience.0.highlights.1）
- original: 原文中有问题的部分（简短引用，不超过50字）
- suggestion: 建议的修改内容
- reason: 修改原因（简短说明，不超过30字）
- confidence: 置信度 0-1 的数字
- severity: low(轻微) | medium(中等) | high(严重)

分析重点：
1. 语法错误和表达不当
2. 是否缺少岗位关键词
3. 内容是否具体、量化
4. 描述是否使用动词开头
5. 是否有冗余或重复

要求：
1. 只返回真正需要改进的内容，不要强行找问题
2. 建议要具体可操作
3. 如果内容已经很好，返回空数组 []
4. 最多返回 8 条建议
5. 按严重程度排序（high > medium > low）

直接返回 JSON 数组，不要包含其他文字：`;

    try {
      const { result } = await withTimeoutAndMetrics(
        '简历全面建议',
        llm.invoke(prompt),
        25000,
        5000
      );

      const text = result.content as string;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.map((s: Omit<ResumeSuggestion, 'id'>, i: number) => ({
          ...s,
          id: `sug-${Date.now()}-${i}`,
        }));
      }
      return [];
    } catch (error) {
      console.error('获取简历全面建议失败:', error);
      return [];
    }
  }

  /**
   * 重写指定区块内容
   */
  async rewriteSection(
    sectionType: string,
    content: string,
    style: 'professional' | 'concise' | 'detailed' = 'professional',
    jobContext?: string
  ): Promise<SectionOptimizeResult | null> {
    if (!content || content.length < 5) {
      return null;
    }

    const llm = getAIManager().getProvider('deepseek');

    const styleGuides = {
      professional: '使用专业、正式的商务语言，突出成就和影响力',
      concise: '简洁明了，去除冗余，每句话都有价值',
      detailed: '详细描述，包含具体情境、行动和结果',
    };

    const prompt = `你是一位专业的简历写作专家。请以${style === 'professional' ? '专业' : style === 'concise' ? '简洁' : '详细'}风格重写以下简历${sectionType}区块的内容。

原内容：
${content}

${jobContext ? `目标岗位要求：\n${jobContext}` : ''}

风格要求：${styleGuides[style]}

重写原则：
1. 使用动词开头，强调行动和结果
2. 尽量使用量化数据（如数字、百分比）
3. 突出与目标岗位匹配的关键词
4. 保持原有信息不变，只优化表达
5. 控制在合理字数范围内

请以 JSON 格式返回：
{
  "optimized": "重写后的完整内容",
  "changes": [
    {
      "original": "原文片段",
      "modified": "修改后",
      "reason": "修改原因"
    }
  ]
}

直接返回 JSON，不要包含其他文字：`;

    try {
      const { result } = await withTimeoutAndMetrics(
        '区块重写',
        llm.invoke(prompt),
        25000,
        5000
      );

      const text = result.content as string;
      const jsonMatch = text.match(/\{[\s\S]*"optimized"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // 如果优化后的内容和原文相同，返回 null
        if (parsed.optimized?.trim() === content.trim()) {
          return null;
        }
        return {
          optimized: parsed.optimized || content,
          changes: parsed.changes || [],
        };
      }
      return null;
    } catch (error) {
      console.error('重写区块内容失败:', error);
      return null;
    }
  }

  /**
   * 从岗位描述中提取关键词
   */
  async extractJobKeywords(jobDescription: string): Promise<JobKeywordExtraction | null> {
    if (!jobDescription || jobDescription.length < 20) {
      return null;
    }

    const llm = getAIManager().getProvider('deepseek');

    const prompt = `你是一位招聘专家。请从以下岗位描述中提取关键信息。

岗位描述：
${jobDescription}

请以 JSON 格式返回：
{
  "technicalSkills": ["技术技能1", "技术技能2"],
  "softSkills": ["软技能1", "软技能2"],
  "requirements": ["硬性要求1", "硬性要求2"],
  "responsibilities": ["核心职责1", "核心职责2"],
  "industry": "行业",
  "experienceLevel": "经验级别（entry/junior/mid/senior/lead）"
}

提取要求：
1. technicalSkills: 技术相关的硬技能（编程语言、框架、工具等）
2. softSkills: 软技能（沟通、团队协作、领导力等）
3. requirements: 硬性要求（学历、年限、证书等）
4. responsibilities: 核心工作职责
5. 每类最多提取 10 个最重要的关键词
6. 按重要性排序

直接返回 JSON，不要包含其他文字：`;

    try {
      const { result } = await withTimeoutAndMetrics(
        '岗位关键词提取',
        llm.invoke(prompt),
        20000,
        4000
      );

      const text = result.content as string;
      const jsonMatch = text.match(/\{[\s\S]*"technicalSkills"[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('提取岗位关键词失败:', error);
      return null;
    }
  }

  /**
   * 匹配简历技能与岗位关键词
   */
  matchSkills(
    resumeSkills: string[],
    jobKeywords: JobKeywordExtraction
  ): SkillMatchResult {
    const allJobSkills = [
      ...jobKeywords.technicalSkills,
      ...jobKeywords.softSkills,
    ].map((s) => s.toLowerCase());

    const resumeSkillsLower = resumeSkills.map((s) => s.toLowerCase());

    // 匹配的技能
    const matched: string[] = [];
    const missing: string[] = [];
    const recommended: string[] = [];

    // 检查匹配情况
    for (const jobSkill of allJobSkills) {
      const isMatched = resumeSkillsLower.some(
        (rs) => rs.includes(jobSkill) || jobSkill.includes(rs)
      );
      if (isMatched) {
        matched.push(jobSkill);
      } else {
        missing.push(jobSkill);
      }
    }

    // 推荐添加的技能（从缺失的技术技能中选择前5个）
    recommended.push(
      ...missing
        .filter((s) => jobKeywords.technicalSkills.map((t) => t.toLowerCase()).includes(s))
        .slice(0, 5)
    );

    return {
      matched: [...new Set(matched)],
      missing: [...new Set(missing)],
      recommended: [...new Set(recommended)],
    };
  }

  /**
   * 将简历内容格式化为可读文本
   */
  private formatResumeContent(content: Record<string, unknown>): string {
    const parts: string[] = [];

    // 个人简介
    const summary = content.summary;
    if (summary) {
      const summaryText = typeof summary === 'string' ? summary : (summary as Record<string, unknown>)?.text;
      if (summaryText) {
        parts.push(`【个人简介】\n${summaryText}`);
      }
    }

    // 技能
    const skills = content.skills;
    if (skills) {
      const skillsList = Array.isArray(skills) ? skills : (skills as Record<string, unknown>)?.list;
      if (Array.isArray(skillsList) && skillsList.length > 0) {
        parts.push(`【技能】\n${(skillsList as string[]).join('、')}`);
      }
    }

    // 工作经历
    const experience = content.experience;
    if (experience) {
      const expList = Array.isArray(experience) ? experience : (experience as Record<string, unknown>)?.list;
      if (Array.isArray(expList)) {
        const expTexts = expList.map((exp: Record<string, unknown>, i: number) => {
          const highlights = (exp.highlights as string[]) || [];
          return `${i + 1}. ${exp.company || ''} - ${exp.position || ''}\n   ${highlights.join('\n   ')}`;
        });
        parts.push(`【工作经历】\n${expTexts.join('\n')}`);
      }
    }

    // 项目经历
    const projects = content.projects;
    if (projects) {
      const projList = Array.isArray(projects) ? projects : (projects as Record<string, unknown>)?.list;
      if (Array.isArray(projList) && projList.length > 0) {
        const projTexts = projList.map((proj: Record<string, unknown>, i: number) => {
          const highlights = (proj.highlights as string[]) || [];
          const techStack = (proj.techStack as string[]) || [];
          return `${i + 1}. ${proj.name || ''} (${techStack.join(', ')})\n   ${highlights.join('\n   ')}`;
        });
        parts.push(`【项目经历】\n${projTexts.join('\n')}`);
      }
    }

    // 教育经历
    const education = content.education;
    if (education) {
      const eduList = Array.isArray(education) ? education : (education as Record<string, unknown>)?.list;
      if (Array.isArray(eduList) && eduList.length > 0) {
        const eduTexts = eduList.map((edu: Record<string, unknown>) =>
          `${edu.school || ''} - ${edu.major || ''} (${edu.degree || ''})`
        );
        parts.push(`【教育经历】\n${eduTexts.join('\n')}`);
      }
    }

    return parts.join('\n\n');
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
