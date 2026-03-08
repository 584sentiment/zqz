/**
 * Canvas 简历数据类型定义
 *
 * 基于 tldraw shapes 设计的简历数据结构，支持：
 * - 直接映射到 tldraw shapes
 * - 多页简历管理
 * - AI 内容转换
 * - 旧格式兼容
 */

import type {
  LayoutResume,
  ResumeLayoutBlock,
  ResumeLayoutConfig,
  ResumeMeta,
  ColorTheme,
  LayoutType,
} from '@ai-job-assistant/shared';

// ============== 常量定义 ==============

/** A4 页面尺寸（像素，96 DPI） */
export const A4_SIZE = {
  width: 794,
  height: 1123,
} as const;

/** 默认页边距 */
export const DEFAULT_MARGINS = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
} as const;

/** 内容区域宽度 */
export const CONTENT_WIDTH = A4_SIZE.width - DEFAULT_MARGINS.left - DEFAULT_MARGINS.right;

// ============== 基础样式类型 ==============

/** 文本对齐方式 */
export type TextAlign = 'start' | 'middle' | 'end';

/** 字体大小（tldraw 内置） */
export type FontSize = 'xs' | 's' | 'm' | 'l' | 'xl';

/** 颜色（tldraw 内置） */
export type TldrawColor =
  | 'black'
  | 'grey'
  | 'light-blue'
  | 'light-green'
  | 'light-red'
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'purple'
  | 'violet';

/** 简历形状类型标识 */
export type ResumeShapeType =
  | 'text' // 文本
  | 'heading' // 标题
  | 'subheading' // 副标题
  | 'paragraph' // 段落
  | 'bullet-list' // 列表项
  | 'section-title' // 区块标题
  | 'divider' // 分割线
  | 'tag' // 技能标签
  | 'card' // 卡片容器
  | 'sidebar' // 侧边栏
  | 'banner' // 横幅
  | 'icon'; // 图标

// ============== 形状属性定义 ==============

/** 基础形状属性 */
export interface BaseShapeProps {
  /** 形状 ID */
  id: string;
  /** 形状类型 */
  type: ResumeShapeType;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 宽度 */
  w: number;
  /** 高度 */
  h: number;
  /** 父容器 ID（可选） */
  parentId?: string;
  /** 是否锁定 */
  isLocked?: boolean;
  /** 层级索引 */
  index?: string;
  /** 扩展元数据 */
  meta?: Record<string, unknown>;
}

/** 文本形状属性 */
export interface TextShapeProps extends BaseShapeProps {
  type: 'text' | 'heading' | 'subheading' | 'paragraph' | 'bullet-list';
  /** 文本内容 */
  text: string;
  /** 字体大小 */
  size?: FontSize;
  /** 文本颜色 */
  color?: TldrawColor;
  /** 文本对齐 */
  align?: TextAlign;
  /** 是否加粗 */
  bold?: boolean;
  /** 是否斜体 */
  italic?: boolean;
}

/** 区块标题形状属性 */
export interface SectionTitleShapeProps extends BaseShapeProps {
  type: 'section-title';
  /** 标题文本 */
  text: string;
  /** 装饰类型 */
  decoration?: 'underline' | 'left-bar' | 'background' | 'none';
  /** 强调颜色 */
  accentColor?: TldrawColor;
  /** 字体大小 */
  size?: FontSize;
}

/** 分割线形状属性 */
export interface DividerShapeProps extends BaseShapeProps {
  type: 'divider';
  /** 线条样式 */
  style?: 'solid' | 'dashed' | 'dotted';
  /** 线条颜色 */
  color?: TldrawColor;
  /** 线条粗细 */
  thickness?: number;
}

/** 技能标签形状属性 */
export interface TagShapeProps extends BaseShapeProps {
  type: 'tag';
  /** 标签文本 */
  text: string;
  /** 是否匹配岗位要求 */
  matched?: boolean;
  /** 背景颜色 */
  backgroundColor?: TldrawColor;
  /** 文本颜色 */
  textColor?: TldrawColor;
  /** 圆角 */
  borderRadius?: number;
}

/** 卡片容器形状属性 */
export interface CardShapeProps extends BaseShapeProps {
  type: 'card';
  /** 背景颜色 */
  fill?: TldrawColor;
  /** 边框颜色 */
  stroke?: TldrawColor;
  /** 圆角 */
  borderRadius?: number;
  /** 子形状 ID 列表 */
  children?: string[];
}

/** 侧边栏形状属性 */
export interface SidebarShapeProps extends BaseShapeProps {
  type: 'sidebar';
  /** 背景颜色 */
  fill: TldrawColor;
  /** 内边距 */
  padding: number;
  /** 子形状 ID 列表 */
  children?: string[];
}

/** 横幅形状属性 */
export interface BannerShapeProps extends BaseShapeProps {
  type: 'banner';
  /** 装饰类型 */
  decoration: 'solid' | 'gradient' | 'pattern';
  /** 主色 */
  primaryColor: TldrawColor;
  /** 次色 */
  secondaryColor?: TldrawColor;
  /** 子形状 ID 列表 */
  children?: string[];
  /** 高度 */
  height?: number;
}

/** 图标形状属性 */
export interface IconShapeProps extends BaseShapeProps {
  type: 'icon';
  /** 图标名称 */
  icon: string;
  /** 图标颜色 */
  color?: TldrawColor;
  /** 图标大小 */
  size?: number;
}

/** 简历形状联合类型 */
export type ResumeShape =
  | TextShapeProps
  | SectionTitleShapeProps
  | DividerShapeProps
  | TagShapeProps
  | CardShapeProps
  | SidebarShapeProps
  | BannerShapeProps
  | IconShapeProps;

// ============== 页面和文档类型 ==============

/** 简历页面 */
export interface ResumePage {
  /** 页面 ID */
  id: string;
  /** 页码 */
  pageNumber: number;
  /** 页面宽度 */
  width: number;
  /** 页面高度 */
  height: number;
  /** 页边距 */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** 页面内的形状列表 */
  shapes: ResumeShape[];
  /** 背景颜色 */
  backgroundColor?: string;
}

/** 画布简历元数据 */
export interface CanvasResumeMeta {
  /** 使用的模板 ID */
  templateId: string;
  /** 使用的颜色主题 */
  colorTheme: ColorTheme;
  /** 使用的布局类型 */
  layoutType: LayoutType;
  /** 创建时间 */
  createdAt: string;
  /** 最后修改时间 */
  updatedAt: string;
  /** AI 模型信息（如果由 AI 生成） */
  aiModel?: string;
  /** 匹配分数 */
  matchScore?: number;
  /** 目标岗位 ID */
  targetJobId?: string;
  /** 简历版本 */
  version: string;
  /** 是否为 AI 生成 */
  isAIGenerated: boolean;
}

/** 画布简历文档 */
export interface CanvasResume {
  /** 文档 ID */
  id: string;
  /** 文档元数据 */
  meta: CanvasResumeMeta;
  /** 布局配置 */
  layoutConfig?: ResumeLayoutConfig;
  /** 页面列表 */
  pages: ResumePage[];
  /** 来源数据（用于追踪和重新生成） */
  source?: {
    /** 原始 LayoutResume 数据 */
    layoutResume?: LayoutResume;
    /** 旧格式简历数据（兼容用） */
    legacyContent?: LegacyResumeContent;
  };
}

// ============== 旧格式兼容类型 ==============

/** 旧版简历内容格式（兼容） */
export interface LegacyResumeContent {
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

// ============== 转换器接口 ==============

/** 形状转换器接口 */
export interface ShapeConverter {
  /** 将形状转换为 tldraw shape */
  toTldrawShape(shape: ResumeShape): unknown;
  /** 从 tldraw shape 转换 */
  fromTldrawShape(tldrawShape: unknown): ResumeShape | null;
}

/** 文档转换器接口 */
export interface DocumentConverter {
  /** 将 CanvasResume 转换为 tldraw snapshot */
  toTldrawSnapshot(resume: CanvasResume): unknown;
  /** 从 tldraw snapshot 转换 */
  fromTldrawSnapshot(snapshot: unknown): CanvasResume | null;
}

// ============== 辅助函数类型 ==============

/** 形状位置计算结果 */
export interface ShapeLayoutResult {
  /** 形状 */
  shape: ResumeShape;
  /** 实际占用高度 */
  height: number;
  /** 是否需要分页 */
  needsPageBreak: boolean;
}

/** 布局上下文 */
export interface LayoutContext {
  /** 当前 Y 坐标 */
  currentY: number;
  /** 当前页码 */
  currentPage: number;
  /** 内容区域宽度 */
  contentWidth: number;
  /** 内容区域起始 X 坐标 */
  contentX: number;
  /** 最大 Y 坐标（页面底部） */
  maxY: number;
  /** 当前主题 */
  theme: ColorTheme;
  /** 布局配置 */
  layoutConfig?: ResumeLayoutConfig;
  /** 侧边栏宽度（用于侧边栏布局） */
  sidebarWidth?: number;
}

// ============== 类型守卫 ==============

/** 检查是否为文本形状 */
export function isTextShape(shape: ResumeShape): shape is TextShapeProps {
  return ['text', 'heading', 'subheading', 'paragraph', 'bullet-list'].includes(shape.type);
}

/** 检查是否为区块标题形状 */
export function isSectionTitleShape(shape: ResumeShape): shape is SectionTitleShapeProps {
  return shape.type === 'section-title';
}

/** 检查是否为分割线形状 */
export function isDividerShape(shape: ResumeShape): shape is DividerShapeProps {
  return shape.type === 'divider';
}

/** 检查是否为标签形状 */
export function isTagShape(shape: ResumeShape): shape is TagShapeProps {
  return shape.type === 'tag';
}

/** 检查是否为卡片形状 */
export function isCardShape(shape: ResumeShape): shape is CardShapeProps {
  return shape.type === 'card';
}

/** 检查是否为侧边栏形状 */
export function isSidebarShape(shape: ResumeShape): shape is SidebarShapeProps {
  return shape.type === 'sidebar';
}

/** 检查是否为横幅形状 */
export function isBannerShape(shape: ResumeShape): shape is BannerShapeProps {
  return shape.type === 'banner';
}

/** 检查是否为图标形状 */
export function isIconShape(shape: ResumeShape): shape is IconShapeProps {
  return shape.type === 'icon';
}

// ============== 工厂函数 ==============

/** 文本样式选项 */
export interface TextStyleOptions {
  /** 字体大小 */
  size?: FontSize;
  /** 文本颜色 */
  color?: TldrawColor | 'grey' | 'blue';
  /** 文本对齐 */
  align?: TextAlign;
  /** 是否加粗 */
  bold?: boolean;
  /** 是否斜体 */
  italic?: boolean;
  /** 文本类型（用于样式推断） */
  type?: 'heading' | 'subheading' | 'text' | 'paragraph' | 'bullet-list';
}

/** 创建文本形状 */
export function createTextShape(
  id: string,
  text: string,
  x: number,
  y: number,
  w: number,
  options?: TextStyleOptions & { h?: number }
): TextShapeProps {
  const {
    size = 's',
    color = 'black',
    align = 'start',
    bold = false,
    italic = false,
    type: _textType = 'text',
    h = 24,
    ...rest
  } = options || {};

  // 根据 type 推断默认样式
  let inferredSize = size;
  let inferredBold = bold;

  if (_textType === 'heading') {
    inferredSize = size === 's' ? 'xl' : size;
    inferredBold = true;
  } else if (_textType === 'subheading') {
    inferredSize = size === 's' ? 'm' : size;
    inferredBold = true;
  }

  return {
    id,
    type: _textType,
    text,
    x,
    y,
    w,
    h,
    size: inferredSize,
    color,
    align,
    bold: inferredBold,
    italic,
  };
}

/** 创建区块标题形状 */
export function createSectionTitleShape(
  id: string,
  text: string,
  x: number,
  y: number,
  w: number,
  options?: Partial<Omit<SectionTitleShapeProps, 'id' | 'type' | 'text' | 'x' | 'y' | 'w' | 'h'>>
): SectionTitleShapeProps {
  return {
    id,
    type: 'section-title',
    text,
    x,
    y,
    w,
    h: options?.decoration === 'left-bar' ? 24 : 28,
    decoration: 'underline',
    ...options,
  };
}

/** 创建分割线形状 */
export function createDividerShape(
  id: string,
  x: number,
  y: number,
  w: number,
  options?: Partial<Omit<DividerShapeProps, 'id' | 'type' | 'x' | 'y' | 'w'>>
): DividerShapeProps {
  return {
    id,
    type: 'divider',
    x,
    y,
    w,
    h: 2,
    style: 'solid',
    ...options,
  };
}

/** 创建标签形状 */
export function createTagShape(
  id: string,
  text: string,
  x: number,
  y: number,
  options?: Partial<Omit<TagShapeProps, 'id' | 'type' | 'text' | 'x' | 'y'>>
): TagShapeProps {
  // 估算标签宽度（中文字符约 14px，英文约 8px）
  let textWidth = 0;
  for (const char of text) {
    if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
      textWidth += 14;
    } else {
      textWidth += 8;
    }
  }
  const w = textWidth + 24; // 内边距

  return {
    id,
    type: 'tag',
    text,
    x,
    y,
    w,
    h: 24,
    matched: false,
    borderRadius: 12,
    ...options,
  };
}

/** 创建简历页面 */
export function createResumePage(
  id: string,
  pageNumber: number,
  options?: Partial<Omit<ResumePage, 'id' | 'pageNumber'>>
): ResumePage {
  return {
    id,
    pageNumber,
    width: A4_SIZE.width,
    height: A4_SIZE.height,
    margins: { ...DEFAULT_MARGINS },
    shapes: [],
    ...options,
  };
}

/** 创建画布简历文档 */
export function createCanvasResume(
  id: string,
  options?: Partial<Omit<CanvasResume, 'id'>> & { initialPages?: ResumePage[] }
): CanvasResume {
  const now = new Date().toISOString();
  const initialPages = options?.initialPages ?? [createResumePage(`${id}-page-1`, 1)];

  return {
    id,
    meta: {
      templateId: 'modern',
      colorTheme: 'modern',
      layoutType: 'single-column',
      createdAt: now,
      updatedAt: now,
      version: '2.0.0',
      isAIGenerated: false,
      ...options?.meta,
    },
    pages: initialPages,
    layoutConfig: options?.layoutConfig,
    source: options?.source,
  };
}
