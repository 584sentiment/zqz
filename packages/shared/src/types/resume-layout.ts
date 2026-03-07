/**
 * 简历排版相关类型定义
 * 用于 AI 生成简历的排版和布局控制
 */

// ============== 区块类型定义 ==============

/** 区块类型 */
export type ResumeBlockType =
  | 'header'
  | 'summary'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'education';

/** 强调级别 */
export type EmphasisLevel = 'high' | 'medium' | 'low';

/** 显示样式 */
export type DisplayStyle =
  | 'default'
  | 'compact'
  | 'expanded'
  | 'tags'
  | 'timeline';

/** 排版提示 */
export interface ResumeLayoutHint {
  /** 强调级别 */
  emphasis?: EmphasisLevel;
  /** 是否高亮显示 */
  highlight?: boolean;
  /** 显示样式 */
  displayStyle?: DisplayStyle;
}

// ============== 区块内容类型 ==============

/** 头部内容 - 个人基本信息 */
export interface ResumeHeaderContent {
  /** 姓名 */
  name: string;
  /** 邮箱 */
  email: string;
  /** 电话 */
  phone?: string;
  /** 所在地 */
  location?: string;
  /** 头像 URL */
  avatar?: string;
  /** 个人链接 */
  links?: Array<{
    type: 'github' | 'linkedin' | 'portfolio' | 'other';
    url: string;
    label?: string;
  }>;
  /** 求职意向 */
  targetPosition?: string;
}

/** 个人简介内容 - 带关键词高亮 */
export interface ResumeSummaryContent {
  /** 简介文本 */
  summary: string;
  /** 需要高亮的关键词 */
  highlightKeywords?: string[];
  /** 核心优势标签 */
  coreStrengths?: string[];
}

/** STAR 法则亮点项 */
export interface StarHighlight {
  /** 情境/背景 */
  situation?: string;
  /** 任务/目标 */
  task?: string;
  /** 行动/做法 */
  action?: string;
  /** 结果/成就 */
  result?: string;
  /** 量化指标 */
  metrics?: string[];
}

/** 工作经历项 */
export interface ResumeExperienceItem {
  /** 公司 */
  company: string;
  /** 职位 */
  position: string;
  /** 地点 */
  location?: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate?: string;
  /** 是否当前工作 */
  current?: boolean;
  /** 工作描述 */
  description?: string;
  /** 成就列表 */
  achievements?: string[];
  /** STAR 法则亮点 */
  starHighlights?: StarHighlight[];
  /** 使用的技术栈 */
  techStack?: string[];
}

/** 工作经历内容 */
export interface ResumeExperienceContent {
  /** 经历列表 */
  items: ResumeExperienceItem[];
}

/** 技能项 */
export interface ResumeSkillItem {
  /** 技能名称 */
  name: string;
  /** 技能级别 */
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  /** 熟练度百分比 (0-100) */
  proficiency?: number;
  /** 使用年限 */
  years?: number;
  /** 是否为匹配岗位的技能 */
  isMatched?: boolean;
}

/** 技能分类组 */
export interface ResumeSkillCategory {
  /** 分类名称 */
  category: string;
  /** 该分类下的技能 */
  skills: ResumeSkillItem[];
}

/** 技能内容 - 支持分类和扁平列表 */
export interface ResumeSkillContent {
  /** 分类技能列表 */
  categories?: ResumeSkillCategory[];
  /** 扁平技能列表 */
  items?: ResumeSkillItem[];
  /** 显示模式: 'categorized' 使用 categories, 'flat' 使用 items */
  displayMode?: 'categorized' | 'flat';
}

/** 项目经历项 */
export interface ResumeProjectItem {
  /** 项目名称 */
  name: string;
  /** 担任角色 */
  role: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate?: string;
  /** 是否进行中 */
  ongoing?: boolean;
  /** 项目描述 */
  description: string;
  /** 技术栈 */
  technologies: string[];
  /** 主要成就 */
  achievements: string[];
  /** 项目链接 */
  link?: string;
  /** STAR 法则亮点 */
  starHighlights?: StarHighlight[];
}

/** 项目经历内容 */
export interface ResumeProjectContent {
  /** 项目列表 */
  items: ResumeProjectItem[];
}

/** 教育经历项 */
export interface ResumeEducationItem {
  /** 学校 */
  school: string;
  /** 学位 */
  degree: string;
  /** 专业 */
  major: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate?: string;
  /** GPA */
  gpa?: string;
  /** 描述/荣誉 */
  description?: string;
  /** 主修课程 */
  courses?: string[];
  /** 荣誉奖项 */
  honors?: string[];
}

/** 教育背景内容 */
export interface ResumeEducationContent {
  /** 教育经历列表 */
  items: ResumeEducationItem[];
}

// ============== 区块内容联合类型 ==============

/** 区块内容的联合类型 */
export type ResumeBlockContent =
  | ResumeHeaderContent
  | ResumeSummaryContent
  | ResumeExperienceContent
  | ResumeSkillContent
  | ResumeProjectContent
  | ResumeEducationContent;

// ============== 排版区块 ==============

/** 排版区块 */
export interface ResumeLayoutBlock {
  /** 区块唯一标识 */
  id: string;
  /** 区块类型 */
  type: ResumeBlockType;
  /** 区块标题 */
  title?: string;
  /** 区块内容 */
  content: ResumeBlockContent;
  /** 排版提示 */
  layoutHint?: ResumeLayoutHint;
}

// ============== 布局配置 ==============

/** 布局类型 */
export type LayoutType =
  | 'single-column'
  | 'left-sidebar'
  | 'top-banner'
  | 'two-column';

/** 颜色主题 */
export type ColorTheme =
  | 'modern'
  | 'classic'
  | 'creative'
  | 'minimal'
  | 'executive';

/** 布局配置 */
export interface ResumeLayoutConfig {
  /** 布局类型 */
  layoutType: LayoutType;
  /** 颜色主题 */
  colorTheme?: ColorTheme;
  /** 区块显示顺序 (区块 id 数组) */
  sectionOrder?: string[];
  /** 是否高亮匹配的技能 */
  highlightMatchedSkills?: boolean;
  /** 自定义配置 */
  customOptions?: Record<string, unknown>;
}

// ============== 简历元数据 ==============

/** 简历元数据 */
export interface ResumeMeta {
  /** 使用的模板 ID */
  templateId: string;
  /** 生成时间 (ISO 8601 格式) */
  generatedAt: string;
  /** 使用的 AI 模型 */
  aiModel?: string;
  /** 与岗位的匹配分数 (0-100) */
  matchScore?: number;
  /** 简历语言 */
  language?: 'zh' | 'en';
  /** 目标岗位 ID */
  targetJobId?: string;
  /** 版本号 */
  version?: string;
}

// ============== 完整的排版简历 ==============

/** 完整的排版简历 */
export interface LayoutResume {
  /** 元数据 */
  meta: ResumeMeta;
  /** 布局配置 */
  layoutConfig?: ResumeLayoutConfig;
  /** 排版区块列表 */
  blocks: ResumeLayoutBlock[];
}

// ============== 类型守卫函数 ==============

/** 检查是否为头部内容 */
export function isHeaderContent(
  content: ResumeBlockContent
): content is ResumeHeaderContent {
  return 'name' in content && 'email' in content;
}

/** 检查是否为简介内容 */
export function isSummaryContent(
  content: ResumeBlockContent
): content is ResumeSummaryContent {
  return 'summary' in content && !('items' in content);
}

/** 检查是否为工作经历内容 */
export function isExperienceContent(
  content: ResumeBlockContent
): content is ResumeExperienceContent {
  if (!('items' in content) || content.items === undefined || content.items.length === 0) {
    return false;
  }
  const firstItem = content.items[0] as unknown as Record<string, unknown>;
  return 'company' in firstItem;
}

/** 检查是否为技能内容 */
export function isSkillContent(
  content: ResumeBlockContent
): content is ResumeSkillContent {
  return (
    'categories' in content ||
    'items' in content ||
    'displayMode' in content
  );
}

/** 检查是否为项目内容 */
export function isProjectContent(
  content: ResumeBlockContent
): content is ResumeProjectContent {
  if (!('items' in content) || content.items === undefined || content.items.length === 0) {
    return false;
  }
  const firstItem = content.items[0] as unknown as Record<string, unknown>;
  return 'technologies' in firstItem;
}

/** 检查是否为教育内容 */
export function isEducationContent(
  content: ResumeBlockContent
): content is ResumeEducationContent {
  if (!('items' in content) || content.items === undefined || content.items.length === 0) {
    return false;
  }
  const firstItem = content.items[0] as unknown as Record<string, unknown>;
  return 'school' in firstItem;
}
