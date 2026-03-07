// Prompt 模板管理

import { promptTemplates as enhancedPromptTemplates } from './enhanced-resume-generation';

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
  resumeGeneration: `你是一位专业的简历写作专家。根据以下用户真实档案信息，生成一份针对目标岗位的专业简历。

【重要约束】
- 绝对禁止编造任何不存在的信息
- 只使用用户档案中提供的真实数据
- 可以优化表述方式，但不能添加虚假经历、技能或成果
- 如果某些岗位相关技能用户没有，不要虚构

用户档案（真实数据）：
{userProfile}

目标岗位要求：
{jobDescription}

【生成要求】
1. **个人简介**：根据岗位核心要求，突出用户与之匹配的经验和特质，控制在2-3句话
2. **技能排序**：按以下优先级排序
   - 与岗位核心技能完全匹配的放最前
   - 相关技能次之
   - 其他技能放后面
3. **工作经历**：
   - 使用 STAR 法则（情境-任务-行动-结果）重新组织描述
   - 尽量使用量化数据（如果用户提供了具体数字）
   - 每段经历2-4个要点，突出与岗位相关的成就
4. **项目经历**：选择与岗位最相关的2-3个项目，突出技术栈和成果
5. **教育经历**：简洁明了，如有相关课程或荣誉可补充

请以 JSON 格式返回简历内容：
{
  "summary": "针对该岗位的个人简介，突出匹配点",
  "matchedSkills": ["与岗位要求直接匹配的技能"],
  "experience": [
    {
      "company": "公司名称（来自用户档案）",
      "position": "职位（来自用户档案）",
      "location": "地点",
      "period": "时间范围",
      "highlights": ["使用STAR法则优化的工作成果1", "工作成果2"]
    }
  ],
  "skills": ["技能1（按匹配度排序）", "技能2", "技能3"],
  "projects": [
    {
      "name": "项目名称",
      "role": "角色",
      "techStack": ["技术1", "技术2"],
      "highlights": ["成果1", "成果2"]
    }
  ],
  "education": [
    {
      "school": "学校",
      "degree": "学位",
      "major": "专业",
      "period": "时间"
    }
  ],
  "matchAnalysis": {
    "score": 0-100的匹配度分数,
    "strengths": ["用户的优势1", "优势2"],
    "gaps": ["与岗位要求的差距1", "差距2"],
    "suggestions": ["简历优化建议1", "建议2"]
  }
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

【重要】你必须且只能返回一个纯 JSON 对象，不要包含任何其他文字、解释或 markdown 标记。
返回格式示例：
{"response":"你的回复内容","discoveredSkills":["技能1","技能2"],"isComplete":false}`,

  // 面试问题生成提示词
  interviewQuestionGeneration: `你是一位专业的面试官。根据以下岗位信息和候选人背景，生成针对性的面试问题。

岗位信息：
{jobInfo}

候选人简历摘要：
{resumeSummary}

【重要要求】
1. **问题必须与岗位高度相关**
   - 技术岗位（开发、测试、运维等）：技术问题占比 60%+
   - 管理岗位（经理、主管等）：管理/领导力问题占比 50%+
   - 产品/设计岗位：产品思维/设计能力问题占比 60%+
   - 销售/市场岗位：沟通/销售技巧问题占比 60%+

2. **问题类型分布**
   - 根据岗位类型调整技术问题 vs 行为问题的比例
   - 包含 1-2 个自我介绍/背景了解类问题
   - 包含 1-2 个职业规划/动机类问题

3. **问题深度**
   - 基础问题验证候选人基本能力
   - 进阶问题考察专业深度
   - 情景问题测试实际应用能力

请生成 5-8 个面试问题，返回 JSON 数组格式：
[
  {
    "id": "q1",
    "question": "问题内容（针对岗位定制）",
    "category": "问题类别（如：技术能力、项目经验、团队协作、领导力等）",
    "type": "technical|behavioral|situational|hr",
    "difficulty": "easy|medium|hard",
    "keypoints": ["评分要点1", "评分要点2"],
    "followUpQuestions": ["可能的追问1"],
    "relatedJobRequirement": "对应岗位的哪个要求"
  }
]`,

  // 面试评估提示词
  interviewEvaluation: `你是一位专业的面试评估专家。请客观、公正地评估以下面试回答。

问题：
{question}

候选人回答：
{answer}

【评分原则】
1. **客观公正**：基于回答内容本身评分，不受其他因素影响
2. **一致性**：相同质量的回答应得到相似分数
3. **可追溯**：每个分数必须有具体的评分依据
4. **透明**：明确指出得分和扣分的原因

【评分标准与锚点】（每项 0-25 分）

**内容完整性 (0-25)**
- 21-25分：完整回答问题所有要点，提供具体案例和数据支撑
- 16-20分：回答了主要要点，有案例但不够具体
- 11-15分：回答了部分要点，缺乏案例支撑
- 6-10分：回答不完整，遗漏关键要点
- 0-5分：回答与问题无关或严重不完整

**逻辑清晰度 (0-25)**
- 21-25分：结构清晰，因果关系明确，使用 STAR 框架
- 16-20分：有一定结构，逻辑基本连贯
- 11-15分：逻辑部分混乱，但能理解主要意思
- 6-10分：逻辑混乱，难以理解
- 0-5分：毫无逻辑，不知所云

**专业深度 (0-25)**
- 21-25分：展现深入专业见解，能分析复杂场景和权衡
- 16-20分：有一定专业深度，理解核心概念
- 11-15分：停留在表面，缺乏深入分析
- 6-10分：专业知识薄弱
- 0-5分：无相关专业体现

**表达能力 (0-25)**
- 21-25分：表达精准简洁，用词专业恰当
- 16-20分：表达清楚，用词基本准确
- 11-15分：表达一般，偶有词不达意
- 6-10分：表达困难，影响理解
- 0-5分：无法有效表达

请返回评估结果（JSON格式）：
{
  "overallScore": 0-100的总分,
  "criteria": [
    {
      "name": "内容完整性",
      "score": 0-25,
      "scoreAnchors": "选择的分数锚点（如：21-25分-完整回答...）",
      "feedback": "具体反馈，说明得分原因",
      "evidence": "回答中支持该评分的具体内容"
    },
    {
      "name": "逻辑清晰度",
      "score": 0-25,
      "scoreAnchors": "分数锚点",
      "feedback": "具体反馈",
      "evidence": "支持评分的具体内容"
    },
    {
      "name": "专业深度",
      "score": 0-25,
      "scoreAnchors": "分数锚点",
      "feedback": "具体反馈",
      "evidence": "支持评分的具体内容"
    },
    {
      "name": "表达能力",
      "score": 0-25,
      "scoreAnchors": "分数锚点",
      "feedback": "具体反馈",
      "evidence": "支持评分的具体内容"
    }
  ],
  "strengths": ["回答的优点1", "优点2"],
  "improvements": ["具体改进建议1", "建议2"],
  "suggestedAnswer": "参考答案要点（3-5个关键点）",
  "scoreConfidence": "high|medium|low（评分置信度）",
  "consistencyNote": "说明此评分如何保持与其他相似回答的一致性"
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

  // 增强的简历生成
  enhancedResumeGeneration: enhancedPromptTemplates.enhancedResumeGeneration,

  // AI 内容增强
  aiEnhancement: enhancedPromptTemplates.aiEnhancement,

  // 简历排版生成（带布局信息）
  resumeLayoutGeneration: enhancedPromptTemplates.resumeLayoutGeneration,
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
