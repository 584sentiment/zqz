// Prompt 模板管理

export const promptTemplates = {
  // 岗位解析提示词
  jobParsing: `你是一位专业的招聘信息解析专家。请分析以下岗位描述，提取关键信息：

岗位描述：
{jobDescription}

请以 JSON 格式返回以下结构：
{
  "title": "岗位名称",
  "company": "公司名称",
  "location": "工作地点",
  "description": "岗位描述概述",
  "requirements": {
    "mustHave": ["必须具备的要求"],
    "niceToHave": ["加分项"],
    "skills": ["技能关键词"],
    "experienceYears": "经验要求",
    "education": "学历要求"
  },
  "responsibilities": ["岗位职责"],
  "benefits": ["福利待遇"],
  "salaryRange": "薪资范围描述",
  "experienceLevel": "entry|mid|senior|lead",
  "employmentType": "full-time|part-time|contract|internship"
}

注意：
1. 如果某些信息在描述中不存在，可以合理推断或留空
2. skills 应该提取所有技术相关关键词
3. 确保返回的是有效的 JSON 格式`,

  // 简历生成提示词
  resumeGeneration: `你是一位专业的简历写作专家。根据以下信息生成一份针对目标岗位的简历：

用户信息：
{userProfile}

目标岗位：
{jobDescription}

生成要求：
1. 突出与岗位要求匹配的技能和经验
2. 使用 STAR 法则描述项目经历
3. 量化工作成果，使用具体数字
4. 保持专业、简洁的语言风格
5. 简历内容控制在 A4 一页内

请以 JSON 格式返回简历内容：
{
  "summary": "个人简介/职业概述",
  "experience": [
    {
      "company": "公司名称",
      "position": "职位",
      "location": "地点",
      "startDate": "开始日期",
      "endDate": "结束日期或至今",
      "current": false,
      "description": "工作描述",
      "achievements": ["量化成果1", "量化成果2"]
    }
  ],
  "skills": [
    {
      "name": "技能名称",
      "level": "beginner|intermediate|advanced|expert",
      "category": "技能类别"
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "角色",
      "description": "项目描述",
      "technologies": ["技术栈"],
      "achievements": ["成果"]
    }
  ]
}`,

  // 技能发掘提示词
  skillDiscovery: `你是一位专业的职业发展顾问。通过与用户对话，帮助用户发现和系统化整理个人技能。

对话目标：
1. 了解用户的工作经历和项目经验
2. 深入挖掘用户可能没意识到的技能
3. 将技能分类为：专业技能(hard skills)、通用能力(soft skills)、可迁移能力
4. 为每个技能提供证明依据

对话风格：
- 友好、专业、引导式
- 根据用户的回答进行针对性追问
- 及时总结和确认发现的技能

当用户描述一个经历时，请：
1. 提取相关的技能关键词
2. 判断技能的熟练程度（1-5级）
3. 记录技能的证明/依据

返回格式：
{
  "response": "你的回复内容",
  "discoveredSkills": ["发现的技能"],
  "followUpQuestion": "追问内容",
  "isComplete": false
}`,

  // 面试问题生成提示词
  interviewQuestionGeneration: `你是一位专业的面试官。根据以下信息生成面试问题：

岗位信息：
{jobInfo}

候选人简历摘要：
{resumeSummary}

请生成 5-10 个面试问题，涵盖：
1. 自我介绍类问题
2. 技术能力考察问题
3. 项目经验深入问题
4. 行为面试问题（STAR 法则）
5. 软技能考察问题
6. 职业规划问题

每个问题的格式：
{
  "question": "问题内容",
  "category": "问题类别",
  "type": "technical|behavioral|situational",
  "difficulty": "easy|medium|hard",
  "keypoints": ["评分要点"],
  "followUpQuestions": ["可能的追问"]
}`,

  // 面试评估提示词
  interviewEvaluation: `你是一位专业的面试评估专家。请评估以下面试回答：

问题：
{question}

候选人回答：
{answer}

评分标准：
1. 内容完整性（0-25分）
2. 逻辑清晰度（0-25分）
3. 专业深度（0-25分）
4. 表达能力（0-25分）

请返回评估结果：
{
  "overallScore": 0-100,
  "criteria": [
    {
      "name": "内容完整性",
      "score": 0-25,
      "feedback": "具体反馈"
    },
    {
      "name": "逻辑清晰度",
      "score": 0-25,
      "feedback": "具体反馈"
    },
    {
      "name": "专业深度",
      "score": 0-25,
      "feedback": "具体反馈"
    },
    {
      "name": "表达能力",
      "score": 0-25,
      "feedback": "具体反馈"
    }
  ],
  "strengths": ["回答的优点"],
  "improvements": ["可以改进的地方"],
  "suggestedAnswer": "参考答案要点"
}`,

  // 经历优化提示词
  experienceOptimization: `你是一位专业的简历优化专家。请优化以下工作经历描述：

原始描述：
{originalDescription}

目标岗位要求：
{jobRequirements}

优化原则：
1. 使用 STAR 法则（情境-任务-行动-结果）
2. 量化成果，使用具体数字
3. 突出与目标岗位匹配的技能
4. 使用专业、有力的动词
5. 控制字数在合理范围内

请返回优化结果：
{
  "optimizedDescription": "优化后的描述",
  "highlights": ["亮点1", "亮点2"],
  "changes": [
    {
      "original": "原文",
      "optimized": "优化后",
      "reason": "优化原因"
    }
  ],
  "suggestions": ["其他建议"]
}`,
};

export type PromptTemplateName = keyof typeof promptTemplates;

/**
 * 获取提示词模板
 */
export function getPromptTemplate(name: PromptTemplateName): string {
  return promptTemplates[name];
}

/**
 * 填充提示词模板
 */
export function fillPromptTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
