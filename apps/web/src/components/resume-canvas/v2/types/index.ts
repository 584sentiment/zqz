/**
 * LLM 驱动的简历渲染系统 - 类型定义
 *
 * 核心理念：
 * 1. 样式预设 = 颜色体系 + 排版体系 + 间距体系 + 装饰体系
 * 2. LLM 生成结构化绘制指令
 * 3. 绘制引擎执行指令渲染到 Canvas
 */

// ============================================================
// 基础类型
// ============================================================

/** 颜色值 */
export type ColorValue = string;

/** 尺寸值（像素或百分比） */
export type Size = number | `${number}%`;

/** 位置坐标 */
export interface Position {
  x: number;
  y: number;
}

/** 矩形区域 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 边距 */
export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 圆角 */
export interface BorderRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

// ============================================================
// 样式预设系统
// ============================================================

/** 颜色体系 */
export interface ColorSystem {
  /** 主色（用于标题、强调） */
  primary: ColorValue;
  /** 次色（用于副标题） */
  secondary: ColorValue;
  /** 强调色（用于高亮、链接） */
  accent: ColorValue;
  /** 背景色 */
  background: {
    primary: ColorValue;
    secondary: ColorValue;
    tertiary: ColorValue;
  };
  /** 文字色 */
  text: {
    primary: ColorValue;
    secondary: ColorValue;
    muted: ColorValue;
    inverse: ColorValue; // 用于深色背景上的文字
  };
  /** 边框色 */
  border: {
    light: ColorValue;
    medium: ColorValue;
    dark: ColorValue;
  };
  /** 语义色 */
  semantic: {
    success: ColorValue;
    warning: ColorValue;
    error: ColorValue;
    info: ColorValue;
  };
}

/** 字体层级 */
export interface TypographyLevel {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter' | number;
  lineHeight: number;
  letterSpacing: number;
  /** 可选：颜色 */
  color?: ColorValue;
  /** 可选：对齐方式 */
  textAlign?: 'left' | 'center' | 'right';
}

/** 排版体系 */
export interface TypographySystem {
  /** 页面标题（姓名） */
  pageTitle: TypographyLevel;
  /** 区块标题 */
  sectionTitle: TypographyLevel;
  /** 小标题（公司名、学校名） */
  subtitle: TypographyLevel;
  /** 正文 */
  body: TypographyLevel;
  /** 小字（时间、地点等） */
  caption: TypographyLevel;
  /** 标签（技能标签） */
  label: TypographyLevel;
}

/** 间距体系（基于基准值的倍数） */
export interface SpacingSystem {
  /** 基准值（1单位 = 多少像素） */
  baseUnit: number;
  /** 区块间距（单位倍数） */
  sectionGap: number;
  /** 段落间距 */
  paragraphGap: number;
  /** 列表项间距 */
  listItemGap: number;
  /** 元素间距 */
  elementGap: number;
  /** 内边距 */
  padding: {
    tight: number;
    normal: number;
    loose: number;
  };
}

/** 装饰体系 */
export interface DecorationSystem {
  /** 圆角 */
  borderRadius: {
    none: number;
    small: number;
    medium: number;
    large: number;
    full: number;
  };
  /** 阴影 */
  shadow: {
    none: 'none';
    small: string;
    medium: string;
    large: string;
  };
  /** 边框 */
  border: {
    none: { width: 0 };
    thin: { width: number; style: 'solid' | 'dashed' | 'dotted' };
    medium: { width: number; style: 'solid' | 'dashed' | 'dotted' };
  };
  /** 分隔线 */
  divider: {
    height: number;
    style: 'solid' | 'dashed' | 'dotted' | 'double';
    color?: ColorValue;
  };
}

/** 布局约束 */
export interface LayoutConstraints {
  /** 页面尺寸 */
  pageSize: {
    width: number;
    height: number;
  };
  /** 安全区域（边距） */
  safeArea: Spacing;
  /** 最小行高 */
  minLineHeight: number;
  /** 最小字号 */
  minFontSize: number;
  /** 最大内容宽度比例 */
  maxContentWidthRatio: number;
}

/** 完整样式预设 */
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'minimal' | 'executive';
  colors: ColorSystem;
  typography: TypographySystem;
  spacing: SpacingSystem;
  decoration: DecorationSystem;
  constraints: LayoutConstraints;
  /** 设计提示词（用于 LLM 理解设计意图） */
  designIntent: string;
}

// ============================================================
// 绘制指令系统
// ============================================================

/** 基础绘制指令 */
export interface BaseDrawCommand {
  id: string;
  type: string;
  zIndex?: number;
}

/** 矩形指令 */
export interface RectCommand extends BaseDrawCommand {
  type: 'rect';
  rect: Rect;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: number;
  borderRadius?: number | BorderRadius;
  opacity?: number;
  /** 渐变填充 */
  gradient?: {
    type: 'linear' | 'radial';
    start: Position;
    end: Position;
    stops: Array<{ offset: number; color: ColorValue }>;
  };
}

/** 圆形指令 */
export interface CircleCommand extends BaseDrawCommand {
  type: 'circle';
  center: Position;
  radius: number;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: number;
  opacity?: number;
}

/** 线条指令 */
export interface LineCommand extends BaseDrawCommand {
  type: 'line';
  start: Position;
  end: Position;
  stroke: ColorValue;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
}

/** 文本指令 */
export interface TextCommand extends BaseDrawCommand {
  type: 'text';
  position: Position;
  content: string;
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string | number;
    color: ColorValue;
    lineHeight: number;
    letterSpacing?: number;
    textAlign?: 'left' | 'center' | 'right';
  };
  /** 最大宽度（用于自动换行） */
  maxWidth?: number;
  /** 最大行数 */
  maxLines?: number;
}

/** 文本块指令（多行富文本） */
export interface TextBlockCommand extends BaseDrawCommand {
  type: 'textBlock';
  rect: Rect;
  content: Array<{
    text: string;
    style?: Partial<TextCommand['style']>;
  }>;
  defaultStyle: TextCommand['style'];
  /** 垂直对齐 */
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/** 图标指令（使用 Unicode 或简单形状） */
export interface IconCommand extends BaseDrawCommand {
  type: 'icon';
  position: Position;
  size: number;
  icon: string; // Unicode 字符或图标名称
  color: ColorValue;
}

/** 技能标签指令 */
export interface SkillTagCommand extends BaseDrawCommand {
  type: 'skillTag';
  position: Position;
  skill: string;
  matched?: boolean;
  style: {
    backgroundColor: ColorValue;
    textColor: ColorValue;
    borderRadius: number;
    paddingX: number;
    paddingY: number;
    fontSize: number;
    fontFamily: string;
    borderColor?: ColorValue;
  };
}

/** 分隔线指令 */
export interface DividerCommand extends BaseDrawCommand {
  type: 'divider';
  rect: Rect;
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  color: ColorValue;
  thickness: number;
}

/** 容器指令（分组） */
export interface ContainerCommand extends BaseDrawCommand {
  type: 'container';
  rect: Rect;
  children: DrawCommand[];
  /** 裁剪溢出内容 */
  clip?: boolean;
  /** 背景色 */
  backgroundColor?: ColorValue;
  /** 内边距 */
  padding?: Spacing;
}

/** 页面指令 */
export interface PageCommand extends BaseDrawCommand {
  type: 'page';
  number: number;
  size: { width: number; height: number };
  children: DrawCommand[];
  /** 页面背景 */
  background?: ColorValue | {
    type: 'gradient';
    colors: ColorValue[];
    direction: 'horizontal' | 'vertical' | 'diagonal';
  };
}

/** 联合类型：所有绘制指令 */
export type DrawCommand =
  | RectCommand
  | CircleCommand
  | LineCommand
  | TextCommand
  | TextBlockCommand
  | IconCommand
  | SkillTagCommand
  | DividerCommand
  | ContainerCommand
  | PageCommand;

/** 完整的渲染方案（LLM 输出） */
export interface RenderPlan {
  /** 版本号 */
  version: string;
  /** 使用的样式预设 ID */
  presetId: string;
  /** 页面列表 */
  pages: PageCommand[];
  /** 元数据 */
  meta: {
    generatedAt: string;
    model: string;
    tokensUsed?: number;
  };
}

// ============================================================
// 简历内容（输入）
// ============================================================

/** 简历内容 */
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
  _meta?: {
    generatedAt: string;
    aiModel: string;
    isAIGenerated: boolean;
  };
}

// ============================================================
// 渲染选项
// ============================================================

/** 渲染选项 */
export interface RenderOptions {
  /** 样式预设 */
  preset: StylePreset;
  /** 缩放比例 */
  scale?: number;
  /** 是否显示调试信息 */
  debug?: boolean;
  /** 自定义覆盖样式 */
  styleOverrides?: Partial<StylePreset>;
}
