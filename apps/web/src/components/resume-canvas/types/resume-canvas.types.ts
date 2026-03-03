/**
 * Canvas 简历渲染系统 - 类型定义
 */

/** 简历元素类型 */
export type ResumeElementType =
  | 'text'
  | 'section-header'
  | 'experience-card'
  | 'skill-tags'
  | 'education-item'
  | 'divider'
  | 'container';

/** 内容来源类型 */
export type ContentSourceType =
  | 'profile_original'    // 用户原始数据
  | 'ai_optimized'        // AI 优化（基于真实数据）
  | 'ai_generated'        // AI 生成
  | 'ai_curated';         // AI 筛选排序

/** 文本样式 */
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter';
  color: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
}

/** 内容来源追溯 */
export interface ContentSource {
  type: ContentSourceType;
  basedOn: string[];
  originalId?: string;
  note?: string;
}

/** 简历元素基类 */
export interface ResumeElementBase {
  id: string;
  type: ResumeElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  source?: ContentSource;
}

/** 文本元素 */
export interface TextElement extends ResumeElementBase {
  type: 'text';
  content: string;
  style: TextStyle;
}

/** 区块标题元素 */
export interface SectionHeaderElement extends ResumeElementBase {
  type: 'section-header';
  title: string;
  style: TextStyle & { accentColor?: string };
}

/** 工作经历卡片元素 */
export interface ExperienceCardElement extends ResumeElementBase {
  type: 'experience-card';
  position: string;
  company: string;
  period: string;
  location?: string;
  highlights: string[];
  style: {
    title: TextStyle;
    subtitle: TextStyle;
    highlight: TextStyle & { lineHeight: number };
    bulletColor: string;
  };
}

/** 技能标签元素 */
export interface SkillTagsElement extends ResumeElementBase {
  type: 'skill-tags';
  skills: Array<{
    name: string;
    matched?: boolean;
  }>;
  style: {
    tag: TextStyle & {
      backgroundColor: string;
      borderRadius: number;
      paddingX: number;
      paddingY: number;
    };
    gap: number;
  };
}

/** 教育经历元素 */
export interface EducationElement extends ResumeElementBase {
  type: 'education-item';
  school: string;
  major: string;
  degree: string;
  period: string;
  style: {
    school: TextStyle;
    detail: TextStyle;
  };
}

/** 分割线元素 */
export interface DividerElement extends ResumeElementBase {
  type: 'divider';
  color: string;
  thickness: number;
  style: 'solid' | 'dashed';
}

/** 容器元素 */
export interface ContainerElement extends ResumeElementBase {
  type: 'container';
  children: ResumeElement[];
  backgroundColor?: string;
  borderRadius?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}

/** 联合类型 */
export type ResumeElement =
  | TextElement
  | SectionHeaderElement
  | ExperienceCardElement
  | SkillTagsElement
  | EducationElement
  | DividerElement
  | ContainerElement;

/** 页面数据 */
export interface PageData {
  number: number;
  elements: ResumeElement[];
}

/** 布局计算结果 */
export interface LayoutResult {
  pages: PageData[];
  totalHeight: number;
}

/** 简历内容（从 AI 生成结果转换） */
export interface ResumeContent {
  // 基本信息
  name: string;
  title?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };

  // 个人简介
  summary?: string;

  // 工作经历
  experience: Array<{
    position: string;
    company: string;
    period: string;
    location?: string;
    highlights: string[];
  }>;

  // 技能
  skills: string[];
  matchedSkills?: string[];

  // 项目经历
  projects?: Array<{
    name: string;
    role: string;
    techStack: string[];
    highlights: string[];
  }>;

  // 教育经历
  education: Array<{
    school: string;
    major: string;
    degree: string;
    period: string;
  }>;

  // 元数据
  _meta?: {
    generatedAt: string;
    aiModel: string;
    isAIGenerated: boolean;
  };
}

/** 布局上下文 */
export interface LayoutContext {
  currentY: number;
  currentPage: number;
  contentWidth: number;
  maxY: number;
}
