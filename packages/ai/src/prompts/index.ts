// Prompt 模板管理
import { promptTemplates as enhancedPromptTemplates } from './enhanced-resume-generation';

export type PromptTemplates = {
  // 岗位解析提示词
  jobParsing: string;
  // 简历生成提示词
  resumeGeneration: string;
  // 技能发掘提示词
  skillDiscovery: string;
  // 增强的简历生成
  enhancedResumeGeneration: string;
  // AI 内容增强
  aiEnhancement: string;
  // 简历排版生成(带布局信息)
  resumeLayoutGeneration: string;
};

// 基础模板（使用 f-string 语法，大括号需要转义）
const JOB_PARSING_PROMPT = `你是一位专业的招聘信息解析专家。请分析以下岗位描述，提取关键信息。
岗位描述:
{jobDescription}
请以 JSON 格式返回以下结构:
{{{{"title": "岗位名称", "company": "公司名称", "location": "工作地点", "description": "岗位描述概述", "requirements": {{"mustHave": ["必须具备的要求"], "niceToHave": ["加分项"], "skills": ["技能关键词"], "experienceYears": "经验要求", "education": "学历要求"}}, "responsibilities": ["岗位职责"], "benefits": ["福利待遇"], "salaryRange": "薪资范围描述", "experienceLevel": "entry|mid|senior|lead", "employmentType": "full-time|part-time|contract|internship"}}}
注意:
1. 如果某些信息在描述中不存在,可以合理推断或留空
2. skills 应该提取所有技术相关关键词
3. 确保返回的是有效的 JSON 格式
`;

const RESUME_GENERATION_PROMPT = `你是一位专业的简历写作专家。根据以下用户真实档案信息,生成一份针对目标岗位的专业简历。
【重要约束】
- 绝对禁止编造任何不存在的信息
- 只使用用户档案中提供的真实数据
- 可以优化表达方式,但不能添加虚假经历、技能、成果
- 如果某些岗位相关技能用户没有,不要虚构
用户档案(真实数据):
{userProfile}
目标岗位要求:
{jobDescription}
【生成要求】
1. **个人简介**: 根据岗位核心要求,突出用户与之匹配的经验和特质,控制在2-3句话
2. **技能排序**: 按以下优先级排序
   - 与岗位核心技能完全匹配的放最前
   - 相关技能次之
   - 其他技能放后面
3. **工作经历**:
   - 使用 STAR 法则(情境-任务-行动-结果)重新组织描述
   - 尽量使用量化数据(如果用户提供了具体数字)
   - 每段经历2-4个要点,突出与岗位相关的成就
4. **项目经历**: 选择与岗位最相关的2-3个项目,突出技术栈和成果
5. **教育经历**: 简洁明了,如有相关课程或荣誉可补充
请以 JSON 格式返回简历内容:
{{{{"summary": "针对该岗位的个人简介,突出匹配点", "matchedSkills": ["与岗位要求直接匹配的技能"], "experience": [{{"company": "公司名称(来自用户档案)", "position": "职位(来自用户档案)", "location": "地点", "period": "时间范围", "highlights": ["使用STAR法则优化的工作成果1", "工作成果2"]}}], "skills": ["技能1(按匹配度排序)", "技能2", "技能3"], "projects": [{{"name": "项目名称", "role": "角色", "techStack": ["技术1", "技术2"], "highlights": ["成果1", "成果2"]}}], "education": [{{"school": "学校", "degree": "学位", "major": "专业", "period": "时间"}}], "matchAnalysis": {{"score": 0-100的匹配度分数, "strengths": ["用户的优势1", "优势2"], "gaps": ["与岗位要求的差距1", "差距2"], "suggestions": ["简历优化建议1", "建议2"]}}}}
`;

const SKILL_DISCOVERY_PROMPT = `你是一位专业的职业发展顾问。通过与用户对话,帮助用户发现和系统化整理个人技能。
对话目标:
1. 了解用户的工作经历和项目经验
2. 深入挖掘用户可能没意识到的技能
3. 将技能分类为:专业技能(hard skills)、通用能力(soft skills)、可迁移能力
4. 为每个技能提供证明依据
对话风格:
- 友好、专业、引导式
- 根据用户的回答进行针对性追问
- 及时总结和确认发现的技能
当用户描述一个经历时,请:
1. 提取相关的技能关键词
2. 判断技能的熟练程度(1-5级)
3. 记录技能的证明/依据
【重要】必须且只能返回一个纯 JSON 对象,不要包含任何其他文字、解释或 markdown 标记。
返回格式示例:
{{{{"response": "你的回复内容", "discoveredSkills": ["技能1", "技能2"], "isComplete": false}}}}
`;

// 合并所有模板
export const promptTemplates: PromptTemplates = {
  jobParsing: JOB_PARSING_PROMPT,
  resumeGeneration: RESUME_GENERATION_PROMPT,
  skillDiscovery: SKILL_DISCOVERY_PROMPT,
  enhancedResumeGeneration: enhancedPromptTemplates.enhancedResumeGeneration,
  aiEnhancement: enhancedPromptTemplates.aiEnhancement,
  resumeLayoutGeneration: enhancedPromptTemplates.resumeLayoutGeneration,
};

// 模板名称映射（用于兼容旧代码）
const TEMPLATE_NAME_MAP: Record<string, keyof PromptTemplates> = {
  jobParsing: 'jobParsing',
  resumeGeneration: 'resumeGeneration',
  skillDiscovery: 'skillDiscovery',
  interviewQuestionGeneration: 'resumeGeneration', // 兼容旧名称
  interviewEvaluation: 'resumeGeneration', // 兼容旧名称
};

/**
 * 获取指定的提示词模板
 */
export function getPromptTemplate(name: string): string {
  // 先尝试直接匹配
  if (name in promptTemplates) {
    return promptTemplates[name as keyof PromptTemplates];
  }
  // 再尝试通过映射表查找
  const mappedName = TEMPLATE_NAME_MAP[name];
  if (mappedName) {
    return promptTemplates[mappedName];
  }
  throw new Error(`未找到模板: ${name}`);
}
