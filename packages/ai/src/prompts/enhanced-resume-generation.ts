/**
 * 增强的简历生成 Prompt 模板
 * 支持数据自动扩充和更丰富的内容生成
 */

// 模板字符串 - 必须在导出之前定义
const ENHANCED_RESUME_GENERATION_TEMPLATE = `你是一位资深的简历写作专家。根据用户档案和目标岗位，生成一份**针对该目标岗位**的专业简历。

## 第一步：识别岗位类型（必须首先完成）

**仔细分析目标岗位信息，首先确定岗位类型：**

### 常见岗位类型及其核心技能：

| 岗位类型 | 核心技能关键词（必须包含） | 禁止技能（绝对不能包含） |
|---------|-------------------------|----------------------|
| 前端开发 | React, Vue, JavaScript, TypeScript, CSS, HTML, Webpack, 前端性能优化, 响应式设计 | Java, Spring, MySQL, Redis, 后端, 服务端 |
| 后端开发 | Java, Spring, MySQL, Redis, 微服务, API设计, 后端架构, 数据库优化 | React, Vue, CSS, 前端, 浏览器, DOM |
| 全栈开发 | 前端+后端技能的组合 | 无特别禁止 |
| 移动开发 | iOS, Android, Flutter, React Native, Swift, Kotlin | Web前端, 浏览器兼容性 |
| 测试工程师 | 测试用例, 自动化测试, Selenium, JMeter, 性能测试, 测试框架 | 前端开发, 后端开发的生产代码 |
| 运维工程师 | Docker, K8s, CI/CD, Linux, 监控, 自动化部署 | 业务代码开发 |
| 数据分析师 | Python, SQL, Pandas, 数据可视化, 统计分析 | 前端框架, 后端框架 |
| 算法工程师 | 机器学习, 深度学习, Python, TensorFlow, PyTorch | 前端开发, 测试 |
| 产品经理 | 需求分析, 用户调研, 原型设计, 数据分析 | 编程语言, 技术实现细节 |
| UI/UX设计 | Figma, Sketch, 设计系统, 交互设计, 用户体验 | 编程语言, 后端技术 |

**识别步骤：**
1. 从岗位标题中提取关键词
2. 从岗位描述中提取技术栈要求
3. 确定唯一的岗位类型
4. **记住这个岗位类型，后续所有内容生成都必须匹配！**

## 第二步：内容生成规则

### 【最重要原则 - 岗位匹配】

**所有生成的内容必须与识别出的岗位类型高度匹配！**

1. **技能筛选规则**：
   - 只选择与岗位类型直接相关的技能
   - 从用户档案中筛选匹配的技能
   - 补充岗位类型的常见技能（参考上表）
   - **禁止**添加与岗位类型冲突的技能

2. **工作经历筛选规则**：
   - 优先展示与岗位类型相关的工作经历
   - 优化亮点描述时，突出与岗位类型相关的成就
   - 如果用户有多个工作经历，选择最相关的进行重点描述

3. **项目经历筛选规则**：
   - 只选择与岗位类型技术栈相关的项目
   - 项目技术栈必须与岗位类型匹配
   - **禁止**选择与岗位类型冲突的项目

### 【真实性原则】

1. 核心信息（公司、职位、学校、时间）必须来自用户档案
2. 可以优化表达方式，但不能编造不存在的工作或项目
3. 智能扩充仅限于：
   - ✅ 根据工作职位推断合理的职责描述
   - ✅ 将简单的描述扩充为更专业的表达
   - ✅ 补充与岗位类型相关的技术栈技能
   - ❌ 绝对禁止编造不存在的工作经历、项目、奖项
   - ❌ 绝对禁止编造不存在的技能或证书

用户档案:
{{userProfile}}

目标岗位信息:
{{jobDescription}}

## 第三步：生成简历内容

### 生成要求

1. **个人简介**（必须与岗位类型匹配）:
   - 第1句：总结从业年限和与岗位类型相关的专业领域
   - 第2句：突出与岗位类型最匹配的核心能力
   - 第3-4句：说明职业定位和求职动机
   - 控制在 3-4 句话

2. **技能列表**（必须与岗位类型匹配）:
   - 从用户档案中筛选与岗位类型相关的技能
   - 按重要性排序：岗位核心技能 > 相关技能 > 基础技能
   - 技能标签控制在 15-20 个
   - 每个技能最多 2-3 个词

3. **工作经历**（优先展示与岗位类型相关的经历）:
   - 使用 STAR 法则优化每个亮点
   - 优先突出与岗位类型相关的工作经验
   - 每段经历控制在 3-5 个亮点
   - 每个亮点控制在 1-2 句话

4. **项目经历**（选择与岗位类型相关的项目）:
   - 选择与岗位类型最相关的 2-3 个项目
   - 技术栈必须与岗位类型匹配
   - 突出可量化的成就

5. **教育经历**:
   - 简洁呈现学校、专业、学位、时间

### 输出格式

请以严格的 JSON 格式返回简历内容：
{{{{"jobTypeIdentified": "识别出的岗位类型（如：前端开发）", "summary": "个人简介，必须与岗位类型匹配", "skills": ["技能1（与岗位类型相关）", "技能2", "..."], "experience": [{{"company": "公司名称", "position": "职位", "location": "地点", "period": "时间范围", "highlights": ["与岗位类型相关的亮点1", "亮点2"]}}], "projects": [{{"name": "项目名称（与岗位类型相关）", "role": "角色", "period": "时间", "techStack": ["与岗位类型相关的技术1", "技术2"], "highlights": ["项目成果1", "成果2"]}}], "education": [{{"school": "学校", "degree": "学位", "major": "专业", "period": "时间"}}], "matchAnalysis": {{"score": 0-100的匹配分数, "jobTypeMatch": true/false, "matchedSkills": ["与岗位类型直接匹配的技能"], "strengths": ["用户优势1"], "gaps": ["与岗位要求的差距"], "suggestions": ["优化建议"]}}}}
`;

/**
 * AI 内容增强 Prompt 模板
 * 用于在用户数据不足时进行智能扩充
 */
const AI_ENHANCEMENT_PROMPT = `你是一位专业的职业发展顾问。请分析以下用户档案和目标岗位，识别需要扩充的内容并提供智能建议。

## 第一步：识别岗位类型

首先分析目标岗位，确定岗位类型（前端开发/后端开发/测试工程师/产品经理等）。

用户档案:
{{userProfile}}
目标岗位要求:
{{jobRequirements}}

【重要原则 - 岗位匹配】
- 所有建议必须与识别出的岗位类型直接相关
- 不要建议与岗位类型无关的技能或经验

【任务】
1. 识别用户档案中缺失或不足的关键信息
2. 为缺失的信息提供合理的扩充建议(基于岗位类型要求)
3. 对于描述过于简单的部分,提供更专业的优化建议

【扩充规则】
- ✅ 可以建议补充与岗位类型相关的技术栈
- ✅ 可以建议优化职责描述
- ❌ 绝对禁止建议编造不存在的工作或项目
- ❌ 绝对禁止建议与岗位类型冲突的技能

请以 JSON 格式返回扩充建议:
{{{{"jobTypeIdentified": "识别出的岗位类型", "summary": {{"suggestions": ["个人简介可以补充的方向1"], "enhancedVersion": "优化后的个人简介示例"}}, "skills": {{"missing": ["岗位类型要求的缺失技能1"], "suggestedAdditions": [{{"skill": "技能名", "reason": "建议添加的原因"}}]}}, "experience": {{"needsEnhancement": [{{"index": 0, "company": "公司名", "suggestions": ["改进建议"]}}]}}, "priority": ["建议用户优先完善的部分"]}}}}
`;

/**
 * 简历排版生成 Prompt 模板
 * 生成符合 LayoutResume 格式的带排版信息的简历
 */
const RESUME_LAYOUT_GENERATION_PROMPT = `你是一位资深的简历写作专家和排版设计师。根据用户档案和目标岗位，生成一份专业的带排版信息的简历。

## 第一步：识别岗位类型（必须首先完成）

**仔细分析目标岗位信息，首先确定岗位类型：**

### 常见岗位类型及其核心技能：

| 岗位类型 | 核心技能关键词 | 禁止技能 |
|---------|--------------|---------|
| 前端开发 | React, Vue, JavaScript, TypeScript, CSS, Webpack | Java, Spring, MySQL, 后端 |
| 后端开发 | Java, Spring, MySQL, Redis, 微服务 | React, Vue, CSS, 前端 |
| 测试工程师 | 测试用例, 自动化测试, Selenium, JMeter | 前端开发, 后端开发 |
| 数据分析师 | Python, SQL, Pandas, 数据可视化 | 前端框架, 后端框架 |

用户档案:
{{userProfile}}
目标岗位信息:
{{jobDescription}}

【最重要原则 - 岗位匹配】
1. 首先识别岗位类型
2. 所有生成的内容必须与岗位类型高度匹配
3. 技能、项目、工作亮点都必须与岗位类型相关

【其他原则】
1. 真实性优先：核心信息必须来自用户档案
2. 智能扩充：可以优化表达，但不能编造

【排版设计原则】
1. 根据内容特点选择最佳布局类型
2. 合理设置各区块的强调级别
3. 为匹配岗位类型的技能添加高亮标记

请以严格的 JSON 格式返回完整的 LayoutResume 结构（包含识别出的岗位类型字段 jobTypeIdentified）。
`;

// 导出 promptTemplates 对象
export const promptTemplates = {
  enhancedResumeGeneration: ENHANCED_RESUME_GENERATION_TEMPLATE,
  aiEnhancement: AI_ENHANCEMENT_PROMPT,
  resumeLayoutGeneration: RESUME_LAYOUT_GENERATION_PROMPT,
};

/**
 * 岗位类型定义
 */
export const JOB_TYPE_DEFINITIONS = {
  frontend: {
    name: '前端开发',
    keywords: ['前端', 'frontend', 'web开发', 'h5', '小程序', 'react', 'vue', 'angular', 'javascript', 'css', 'html'],
    requiredSkills: ['JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'React/Vue', 'Webpack'],
    forbiddenSkills: ['Java', 'Spring', 'MySQL', 'Redis', '后端架构', '服务端'],
  },
  backend: {
    name: '后端开发',
    keywords: ['后端', 'backend', '服务端', 'java', 'python', 'go', 'node', 'api'],
    requiredSkills: ['后端语言', '数据库', 'API设计', '微服务'],
    forbiddenSkills: ['React', 'Vue', 'CSS布局', '浏览器兼容'],
  },
  fullstack: {
    name: '全栈开发',
    keywords: ['全栈', 'fullstack', '前后端'],
    requiredSkills: ['前端技术', '后端技术', '数据库'],
    forbiddenSkills: [],
  },
  test: {
    name: '测试工程师',
    keywords: ['测试', 'test', 'qa', '质量', '自动化测试'],
    requiredSkills: ['测试用例', '自动化测试', '测试框架'],
    forbiddenSkills: ['React', 'Vue', 'Java开发', '后端架构'],
  },
  devops: {
    name: '运维工程师',
    keywords: ['运维', 'devops', 'ops', '部署', 'docker', 'k8s'],
    requiredSkills: ['Docker', 'K8s', 'CI/CD', 'Linux'],
    forbiddenSkills: ['业务代码开发'],
  },
  data: {
    name: '数据分析师',
    keywords: ['数据', 'data', '分析', 'bi', 'etl'],
    requiredSkills: ['Python', 'SQL', '数据可视化', '统计分析'],
    forbiddenSkills: ['React', 'Vue', 'Java', 'Spring'],
  },
  algorithm: {
    name: '算法工程师',
    keywords: ['算法', 'algorithm', '机器学习', '深度学习', 'ai', 'ml'],
    requiredSkills: ['Python', '机器学习', '深度学习', 'TensorFlow/PyTorch'],
    forbiddenSkills: ['前端开发', '测试'],
  },
  pm: {
    name: '产品经理',
    keywords: ['产品', 'pm', 'product', '需求'],
    requiredSkills: ['需求分析', '用户调研', '原型设计', '数据分析'],
    forbiddenSkills: ['编程语言', '技术实现'],
  },
  design: {
    name: 'UI/UX设计',
    keywords: ['设计', 'design', 'ui', 'ux', '视觉'],
    requiredSkills: ['Figma', 'Sketch', '设计系统', '交互设计'],
    forbiddenSkills: ['编程语言', '后端技术'],
  },
} as const;

export type JobType = keyof typeof JOB_TYPE_DEFINITIONS;

/**
 * 根据岗位标题和描述识别岗位类型
 */
export function identifyJobType(title: string, description: string): JobType {
  const text = `${title} ${description}`.toLowerCase();

  const scores: Record<JobType, number> = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    test: 0,
    devops: 0,
    data: 0,
    algorithm: 0,
    pm: 0,
    design: 0,
  };

  // 计算每种岗位类型的匹配分数
  // 长关键词给予更高权重，避免短关键词干扰
  for (const [type, definition] of Object.entries(JOB_TYPE_DEFINITIONS)) {
    for (const keyword of definition.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        // 关键词越长，权重越高
        const weight = keyword.length / 2;
        scores[type as JobType] += weight;
      }
    }
  }

  // 特殊处理：如果同时匹配前端和后端，优先返回全栈开发
  if (scores.frontend > 0 && scores.backend > 0) {
    scores.fullstack += scores.frontend + scores.backend;
  }

  // 返回分数最高的岗位类型
  let maxType: JobType = 'frontend';
  let maxScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as JobType;
    }
  }

  // 如果没有明显匹配，默认返回前端开发
  return maxScore > 0 ? maxType : 'frontend';
}

/**
 * 验证技能是否与岗位类型匹配
 */
export function validateSkillsForJobType(
  skills: string[],
  jobType: JobType
): {
  valid: string[];
  invalid: string[];
  suggested: string[];
} {
  const definition = JOB_TYPE_DEFINITIONS[jobType];
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const skill of skills) {
    const skillLower = skill.toLowerCase();
    const isForbidden = definition.forbiddenSkills.some((forbidden) =>
      skillLower.includes(forbidden.toLowerCase())
    );

    if (isForbidden) {
      invalid.push(skill);
    } else {
      valid.push(skill);
    }
  }

  // 建议添加的技能
  const suggested = definition.requiredSkills.filter(
    (required) =>
      !valid.some((v) => v.toLowerCase().includes(required.toLowerCase()))
  );

  return { valid, invalid, suggested };
}
