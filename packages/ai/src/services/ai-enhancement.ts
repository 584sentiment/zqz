/**
 * AI 内容增强服务
 * 用于在用户数据不足时进行智能扩充
 */

import { getAIManager } from '../providers';
import { withTimeoutAndMetrics, AIServiceError, AIServiceErrorCode } from './index';

export interface EnhancementSuggestion {
  summary: {
    suggestions: string[];
    enhancedVersion: string;
  };
  skills: {
    missing: string[];
    suggestedAdditions: Array<{
      baseSkill: string;
      relatedSkills: string[];
      reason: string;
    }>;
  };
  experience: {
    needsEnhancement: Array<{
      index: number;
      company: string;
      position: string;
      issues: string[];
      suggestions: string[];
    }>;
  };
  projects: {
    suggestedProjects: Array<{
      name: string;
      description: string;
      techStack: string[];
      reason: string;
    }>;
  };
  education: {
    suggestions: string[];
  };
  priority: string[];
}

export class AIEnhancementService {
  /**
   * 生成内容增强建议
   */
  async generateEnhancement(
    userProfile: string,
    jobRequirements: string
  ): Promise<EnhancementSuggestion> {
    try {
      const llm = getAIManager().getProvider('deepseek');

      // 构建增强提示词
      const prompt = `你是一位专业的职业发展顾问。请分析以下用户档案，识别需要扩充的内容并提供智能建议。

用户档案：
${userProfile}

目标岗位要求：
${jobRequirements}

【任务】
1. 识别用户档案中缺失或不足的关键信息
2. 为缺失的信息提供合理的扩充建议（基于行业常识和岗位要求）
3. 对于描述过于简单的部分，提供更专业的优化建议
4. 确保所有建议都是基于行业标准和常见实践

【扩充规则】
- ✅ 可以建议补充行业通用的技术栈（如用户写"React"，可建议补充"TypeScript, Redux"）
- ✅ 可以建议优化职责描述（如将简单的描述优化为更专业的表达）
- ✅ 可以建议补充常见的项目类型和工作内容
- ❌ 绝对禁止建议编造不存在的工作或项目
- ❌ 绝对禁止建议虚构的证书或奖项
- ❌ 绝对禁止建议不存在的量化数据

请以严格的 JSON 格式返回扩充建议：

{
  "summary": {
    "suggestions": [
      "个人简介可以补充的方向1",
      "方向2"
    ],
    "enhancedVersion": "优化后的个人简介示例"
  },
  "skills": {
    "missing": ["岗位要求的缺失技能1", "技能2"],
    "suggestedAdditions": [
      {
        "baseSkill": "用户已有的技能",
        "relatedSkills": ["相关技能1", "相关技能2"],
        "reason": "建议添加的原因"
      }
    ]
  },
  "experience": {
    "needsEnhancement": [
      {
        "index": 0,
        "company": "公司名",
        "position": "职位",
        "issues": ["问题1", "问题2"],
        "suggestions": ["改进建议1", "建议2"]
      }
    ]
  },
  "projects": {
    "suggestedProjects": [
      {
        "name": "建议的项目类型",
        "description": "项目描述",
        "techStack": ["技术1", "技术2"],
        "reason": "建议添加的原因"
      }
    ]
  },
  "education": {
    "suggestions": ["教育背景可以补充的内容"]
  },
  "priority": "按重要性排序，建议用户优先完善哪些部分：[部分1, 部分2, 部分3]"
}`;

      // 调用 AI
      const { result } = await withTimeoutAndMetrics(
        'AI 内容增强',
        llm.invoke(prompt),
        45000, // 45 秒超时
        5000 // 5 秒首字节阈值
      );

      const text = result.content as string;

      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError(
          'AI 内容增强失败，返回格式异常',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      console.error('[AI Enhancement] 原始错误:', error);
      throw new AIServiceError(
        'AI 内容增强失败，请稍后重试',
        AIServiceErrorCode.UNKNOWN,
        true,
        error
      );
    }
  }
}

// 单例
let enhancementService: AIEnhancementService | null = null;

export function getAIEnhancementService(): AIEnhancementService {
  if (!enhancementService) {
    enhancementService = new AIEnhancementService();
  }
  return enhancementService;
}
