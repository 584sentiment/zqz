/**
 * 简历形状生成器
 * 根据 AI 生成的内容创建 tldraw 形状
 */

import { getAIManager } from '../providers';
import { withTimeoutAndMetrics, AIServiceError, AIServiceErrorCode } from '../services';

/**
 * 颜色主题配置
 */
export interface ResumeTheme {
  primary: string;
  secondary: string;
  text: string;
}

/**
 * 预定义主题
 */
export const RESUME_THEMES: Record<string, ResumeTheme> = {
  modern: {
    primary: 'black',
    secondary: 'grey',
    text: 'black',
  },
  classic: {
    primary: 'blue',
    secondary: 'light-blue',
    text: 'black',
  },
  creative: {
    primary: 'violet',
    secondary: 'light-violet',
    text: 'black',
  },
  minimal: {
    primary: 'black',
    secondary: 'grey',
    text: 'black',
  },
};

/**
 * 简历内容接口
 */
export interface ResumeContent {
  name: string;
  title?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
  };
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    period: string;
    location?: string;
    highlights: string[];
  }>;
  skills: string[];
  matchedSkills?: string[];
  projects?: Array<{
    name: string;
    role: string;
    period?: string;
    techStack?: string[];
    highlights: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    major: string;
    period: string;
    gpa?: string;
  }>;
}

/**
 * 形状生成器
 */
export class ResumeShapeGenerator {
  /**
   * 生成简历形状
   */
  async generateResumeShapes(
    userProfile: any,
    jobDescription: string,
    template: string = 'modern'
  ): Promise<ResumeContent> {
    // 1. 调用 AI 生成简历内容
    const resumeContent = await this.generateResumeContent(userProfile, jobDescription);

    return resumeContent;
  }

  /**
   * AI 生成简历内容
   */
  private async generateResumeContent(
    userProfile: any,
    jobDescription: string
  ): Promise<ResumeContent> {
    try {
      const llm = getAIManager().getProvider('deepseek');

      const prompt = `你是一位专业的简历撰写专家。根据用户资料和目标岗位，生成一份定制简历。

用户资料：
${JSON.stringify(userProfile, null, 2)}

目标岗位：
${jobDescription}

【任务】
1. 分析岗位要求
2. 突出用户与岗位匹配的经验和技能
3. 使用专业、简洁的语言
4. 确保内容真实可信，不要虚构

请以严格的 JSON 格式返回简历内容：

{
  "name": "姓名",
  "title": "职位",
  "contact": {
    "email": "邮箱",
    "phone": "电话",
    "location": "地点"
  },
  "summary": "个人简介（2-3句话，突出核心竞争力）",
  "experience": [
    {
      "company": "公司名",
      "position": "职位",
      "period": "时间段（如 2020.03 - 2023.06）",
      "location": "地点（可选）",
      "highlights": [
        "成就1（使用动词开头，尽量量化）",
        "成就2"
      ]
    }
  ],
  "skills": ["技能1", "技能2", "技能3"],
  "matchedSkills": ["与岗位匹配的技能1", "技能2"],
  "education": [
    {
      "school": "学校名",
      "degree": "学位",
      "major": "专业",
      "period": "时间段（如 2016.09 - 2020.06）"
    }
  ]
}`;

      const { result } = await withTimeoutAndMetrics(
        '简历生成',
        llm.invoke(prompt),
        60000, // 60 秒超时
        10000 // 10 秒首字节阈值
      );

      const text = result.content as string;

      // 提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError(
          'AI 生成简历失败，返回格式异常',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }

      const content = JSON.parse(jsonMatch[0]) as ResumeContent;

      // 验证必需字段
      if (!content.name || !content.experience || !content.skills) {
        throw new AIServiceError(
          'AI 生成简历缺少必需字段',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }

      return content;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      console.error('[Resume Generator] 原始错误:', error);
      throw new AIServiceError(
        'AI 生成简历失败，请稍后重试',
        AIServiceErrorCode.UNKNOWN,
        true,
        error
      );
    }
  }

  /**
   * 获取主题配置
   */
  getTheme(template: string): ResumeTheme {
    return RESUME_THEMES[template] || RESUME_THEMES.modern;
  }
}

// 单例
let shapeGenerator: ResumeShapeGenerator | null = null;

export function getResumeShapeGenerator(): ResumeShapeGenerator {
  if (!shapeGenerator) {
    shapeGenerator = new ResumeShapeGenerator();
  }
  return shapeGenerator;
}
