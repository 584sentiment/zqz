/**
 * 模板类型定义
 */

import type { TextStyle } from './resume-canvas.types';

/** A4 页面尺寸 (points) */
export const A4_PAGE = {
  width: 595,    // 210mm
  height: 842,   // 297mm
  margin: {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50,
  },
  contentWidth: 595 - 50 * 2,  // 495
  contentHeight: 842 - 50 * 2, // 742
} as const;

/** 布局类型 */
export type LayoutType =
  | 'single-column'      // 单栏布局
  | 'left-sidebar'       // 左侧边栏布局
  | 'top-banner'         // 顶部横幅布局
  | 'two-column';        // 双栏对称布局

/** 头部装饰类型 */
export type HeaderDecorationType =
  | 'none'               // 无装饰
  | 'color-block'        // 纯色块
  | 'gradient'           // 渐变色
  | 'pattern-dots'       // 圆点图案
  | 'pattern-lines'      // 线条图案
  | 'pattern-geometric'; // 几何图案

/** 区块标题样式类型 */
export type SectionTitleStyleType =
  | 'underline'          // 下划线
  | 'left-bar'           // 左竖线
  | 'icon-prefix'        // 图标前缀
  | 'background'         // 背景色块
  | 'capsule'            // 胶囊/标签样式
  | 'minimal';           // 极简（仅文字）

/** 分隔线样式类型 */
export type DividerStyleType =
  | 'solid'              // 实线
  | 'dashed'             // 虚线
  | 'dotted'             // 点线
  | 'double'             // 双线
  | 'gradient';          // 渐变线

/** 技能展示样式类型 */
export type SkillDisplayStyle =
  | 'tags'               // 标签云
  | 'progress-bar'       // 进度条
  | 'grouped'            // 分类组
  | 'list'               // 列表
  | 'pills';             // 药丸形状

/** 头部装饰配置 */
export interface HeaderDecoration {
  type: HeaderDecorationType;
  /** 装饰高度（如果是顶部横幅） */
  height?: number;
  /** 主色 */
  primaryColor?: string;
  /** 次色（用于渐变或图案） */
  secondaryColor?: string;
  /** 透明度 */
  opacity?: number;
  /** 图案大小（用于图案类型） */
  patternSize?: number;
  /** 圆角 */
  borderRadius?: number;
}

/** 区块标题样式配置 */
export interface SectionTitleStyle {
  type: SectionTitleStyleType;
  /** 强调色（用于竖线、背景等） */
  accentColor?: string;
  /** 图标名称（用于 icon-prefix 类型） */
  iconName?: string;
  /** 背景圆角 */
  borderRadius?: number;
  /** 内边距 */
  padding?: {
    horizontal: number;
    vertical: number;
  };
  /** 下划线/边框粗细 */
  thickness?: number;
}

/** 分隔线样式配置 */
export interface DividerStyle {
  type: DividerStyleType;
  /** 线条颜色 */
  color?: string;
  /** 线条粗细 */
  thickness?: number;
  /** 次要颜色（用于渐变） */
  secondaryColor?: string;
}

/** 技能展示样式配置 */
export interface SkillDisplayStyleConfig {
  type: SkillDisplayStyle;
  /** 标签圆角 */
  borderRadius?: number;
  /** 进度条背景色 */
  trackColor?: string;
  /** 进度条填充色 */
  fillColor?: string;
  /** 匹配技能高亮边框色 */
  matchedBorderColor?: string;
  /** 匹配技能背景色 */
  matchedBackgroundColor?: string;
}

/** 侧边栏配置（用于 left-sidebar 布局） */
export interface SidebarConfig {
  /** 侧边栏宽度比例 (0-1) */
  widthRatio: number;
  /** 侧边栏背景色 */
  backgroundColor: string;
  /** 侧边栏内边距 */
  padding: number;
  /** 侧边栏包含的区块 */
  sections: string[];
  /** 侧边栏文字颜色（覆盖主题色） */
  textColor?: string;
}

/** 双栏配置（用于 two-column 布局） */
export interface TwoColumnConfig {
  /** 左栏宽度比例 (0-1) */
  leftRatio: number;
  /** 栏间距 */
  gap: number;
  /** 左栏区块 */
  leftSections: string[];
  /** 右栏区块 */
  rightSections: string[];
}

/** 顶部横幅配置（用于 top-banner 布局） */
export interface TopBannerConfig {
  /** 横幅高度 */
  height: number;
  /** 横幅装饰 */
  decoration: HeaderDecoration;
  /** 横幅内边距 */
  padding: number;
  /** 头部信息排列方式 */
  layout: 'vertical' | 'horizontal';
}

/** 颜色主题 */
export interface ColorTheme {
  primary: string;
  secondary: string;
  accent: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  background: {
    primary: string;
    secondary: string;
    tag: string;
  };
  border?: string;
}

/** 字体配置 */
export interface FontConfig {
  primary: string;
  english?: string;
  mono?: string;
}

/** 头部样式配置 */
export interface HeaderStyles {
  name: TextStyle;
  title?: TextStyle;
  contact?: TextStyle;
}

/** 区块样式配置 */
export interface SectionStyles {
  title: TextStyle;
  accentColor?: string;
}

/** 正文样式配置 */
export interface BodyStyles {
  normal: TextStyle;
  bold?: TextStyle;
  small?: TextStyle;
}

/** 间距配置 */
export interface SpacingConfig {
  sectionGap: number;
  paragraphGap: number;
  listItemGap: number;
  tagGap: number;
}

/** 模板样式配置 */
export interface TemplateStyles {
  colors: ColorTheme;
  fonts: FontConfig;
  header: HeaderStyles;
  section: SectionStyles;
  body: BodyStyles;
  spacing: SpacingConfig;
}

/** 头部布局配置 */
export interface HeaderLayout {
  align: 'left' | 'center' | 'right';
  showDivider: boolean;
  /** 头部装饰 */
  decoration?: HeaderDecoration;
  /** 头部背景延伸到页面边缘 */
  fullBleed?: boolean;
}

/** 模板布局配置 */
export interface TemplateLayout {
  /** 布局类型 */
  layoutType?: LayoutType;

  /** 头部配置 */
  header: HeaderLayout;

  /** 区块顺序 */
  sectionOrder: string[];

  /** 区块标题样式 */
  sectionTitleStyle?: SectionTitleStyle;

  /** 分隔线样式 */
  dividerStyle?: DividerStyle;

  /** 技能展示样式 */
  skillDisplayStyle?: SkillDisplayStyleConfig;

  /** 侧边栏配置（layoutType === 'left-sidebar' 时必填） */
  sidebar?: SidebarConfig;

  /** 双栏配置（layoutType === 'two-column' 时必填） */
  twoColumn?: TwoColumnConfig;

  /** 顶部横幅配置（layoutType === 'top-banner' 时必填） */
  topBanner?: TopBannerConfig;

  /** 是否显示来源徽章 */
  showSourceBadge: boolean;

  /** 是否高亮匹配技能 */
  highlightMatchedSkills: boolean;

  /** 区块间距 */
  sectionGap?: number;
}

/** 模板分类 */
export type TemplateCategory = 'professional' | 'creative' | 'simple' | 'executive';

/** 完整模板配置 */
export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: TemplateCategory;
  isPremium: boolean;
  styles: TemplateStyles;
  layout: TemplateLayout;
}

/** 预设颜色主题 */
export const COLOR_THEMES: Record<string, ColorTheme> = {
  modern: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#3b82f6',
    text: { primary: '#1f2937', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#f9fafb', tag: '#eff6ff' },
    border: '#e5e7eb',
  },
  classic: {
    primary: '#1f2937',
    secondary: '#374151',
    accent: '#4b5563',
    text: { primary: '#111827', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#f9fafb', tag: '#f3f4f6' },
    border: '#d1d5db',
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#5b21b6',
    accent: '#8b5cf6',
    text: { primary: '#1f2937', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#faf5ff', tag: '#f3e8ff' },
    border: '#e5e7eb',
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    accent: '#52525b',
    text: { primary: '#18181b', secondary: '#52525b', muted: '#a1a1aa' },
    background: { primary: '#ffffff', secondary: '#fafafa', tag: '#f4f4f5' },
    border: '#e4e4e7',
  },
  executive: {
    primary: '#0f766e',
    secondary: '#0d9488',
    accent: '#14b8a6',
    text: { primary: '#134e4a', secondary: '#0f766e', muted: '#5eead4' },
    background: { primary: '#ffffff', secondary: '#f0fdfa', tag: '#ccfbf1' },
    border: '#99f6e4',
  },
};

/** 默认字体配置 */
export const DEFAULT_FONTS: FontConfig = {
  primary: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
  english: '"Inter", "Segoe UI", "Roboto", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};
