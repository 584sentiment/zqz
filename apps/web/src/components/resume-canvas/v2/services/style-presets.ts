/**
 * 样式预设服务
 * 提供预定义的样式预设
 */

import type { StylePreset, ColorSystem, TypographySystem, SpacingSystem, DecorationSystem, LayoutConstraints } from '../types';

/** A4 页面尺寸 */
const A4_SIZE = {
  width: 595,
  height: 842,
};

/** 默认安全区域 */
const DEFAULT_SAFE_AREA = {
  top: 45,
  right: 45,
  bottom: 45,
  left: 45,
};

/** 默认字体 */
const DEFAULT_FONTS = {
  primary: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
  english: '"Inter", "Segoe UI", "Roboto", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

/** 现代蓝色主题 */
const modernColors: ColorSystem = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  accent: '#60a5fa',
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#eff6ff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
  },
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

/** 经典黑色主题 */
const classicColors: ColorSystem = {
  primary: '#1f2937',
  secondary: '#374151',
  accent: '#6b7280',
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    muted: '#9ca3af',
    inverse: '#ffffff',
  },
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

/** 创意紫色主题 */
const creativeColors: ColorSystem = {
  primary: '#7c3aed',
  secondary: '#8b5cf6',
  accent: '#a78bfa',
  background: {
    primary: '#ffffff',
    secondary: '#faf5ff',
    tertiary: '#f3e8ff',
  },
  text: {
    primary: '#1f2937',
    secondary: '#4b5563',
    muted: '#9ca3af',
    inverse: '#ffffff',
  },
  border: {
    light: '#e9d5ff',
    medium: '#d8b4fe',
    dark: '#c084fc',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#7c3aed',
  },
};

/** 极简黑白主题 */
const minimalColors: ColorSystem = {
  primary: '#18181b',
  secondary: '#3f3f46',
  accent: '#71717a',
  background: {
    primary: '#ffffff',
    secondary: '#fafafa',
    tertiary: '#f4f4f5',
  },
  text: {
    primary: '#18181b',
    secondary: '#52525b',
    muted: '#a1a1aa',
    inverse: '#ffffff',
  },
  border: {
    light: '#e4e4e7',
    medium: '#d4d4d8',
    dark: '#a1a1aa',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#52525b',
  },
};

/** 高管青色主题 */
const executiveColors: ColorSystem = {
  primary: '#0f766e',
  secondary: '#14b8a6',
  accent: '#2dd4bf',
  background: {
    primary: '#ffffff',
    secondary: '#f0fdfa',
    tertiary: '#ccfbf1',
  },
  text: {
    primary: '#134e4a',
    secondary: '#0f766e',
    muted: '#5eead4',
    inverse: '#ffffff',
  },
  border: {
    light: '#99f6e4',
    medium: '#5eead4',
    dark: '#2dd4bf',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#14b8a6',
  },
};

/** 默认排版体系 */
const defaultTypography: TypographySystem = {
  pageTitle: {
    fontFamily: DEFAULT_FONTS.primary,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 1.2,
    letterSpacing: 0,
  },
  sectionTitle: {
    fontFamily: DEFAULT_FONTS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 1.4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: DEFAULT_FONTS.primary,
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  body: {
    fontFamily: DEFAULT_FONTS.primary,
    fontSize: 11,
    fontWeight: 'normal',
    lineHeight: 1.6,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: DEFAULT_FONTS.primary,
    fontSize: 10,
    fontWeight: 'normal',
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  label: {
    fontFamily: DEFAULT_FONTS.primary,
    fontSize: 10,
    fontWeight: 'normal',
    lineHeight: 1.3,
    letterSpacing: 0,
  },
};

/** 默认间距体系 */
const defaultSpacing: SpacingSystem = {
  baseUnit: 4,
  sectionGap: 5, // 20px
  paragraphGap: 2, // 8px
  listItemGap: 3, // 12px
  elementGap: 2, // 8px
  padding: {
    tight: 2, // 8px
    normal: 4, // 16px
    loose: 6, // 24px
  },
};

/** 默认装饰体系 */
const defaultDecoration: DecorationSystem = {
  borderRadius: {
    none: 0,
    small: 4,
    medium: 8,
    large: 16,
    full: 9999,
  },
  shadow: {
    none: 'none',
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  border: {
    none: { width: 0 },
    thin: { width: 1, style: 'solid' },
    medium: { width: 2, style: 'solid' },
  },
  divider: {
    height: 1,
    style: 'solid',
  },
};

/** 默认布局约束 */
const defaultConstraints: LayoutConstraints = {
  pageSize: A4_SIZE,
  safeArea: DEFAULT_SAFE_AREA,
  minLineHeight: 1.2,
  minFontSize: 8,
  maxContentWidthRatio: 1,
};

// ============================================================
// 预设样式
// ============================================================

/** 现代简约预设 */
export const modernPreset: StylePreset = {
  id: 'modern',
  name: '现代简约',
  description: '简洁现代的设计风格，左侧边栏布局，适合科技行业',
  category: 'professional',
  colors: modernColors,
  typography: defaultTypography,
  spacing: defaultSpacing,
  decoration: defaultDecoration,
  constraints: defaultConstraints,
  designIntent: `
    设计风格：现代、简约、专业
    布局特点：左侧深色边栏（约30%宽度）展示联系方式和技能，右侧主区域展示工作经历
    色彩运用：深蓝色边栏与白色主区域形成对比，使用蓝色作为强调色
    排版特点：清晰的层级结构，充足的留白
    装饰元素：左侧竖线装饰区块标题，圆角技能标签
  `.trim(),
};

/** 经典专业预设 */
export const classicPreset: StylePreset = {
  id: 'classic',
  name: '经典专业',
  description: '传统商务风格，适合金融、咨询等行业',
  category: 'professional',
  colors: classicColors,
  typography: {
    ...defaultTypography,
    pageTitle: {
      ...defaultTypography.pageTitle,
      fontSize: 32,
      letterSpacing: 1,
    },
    sectionTitle: {
      ...defaultTypography.sectionTitle,
      letterSpacing: 1.5,
    },
  },
  spacing: {
    ...defaultSpacing,
    sectionGap: 6,
  },
  decoration: {
    ...defaultDecoration,
    divider: {
      height: 2,
      style: 'double',
    },
  },
  constraints: defaultConstraints,
  designIntent: `
    设计风格：经典、稳重、专业
    布局特点：单栏居中布局，内容自上而下排列
    色彩运用：黑白灰为主，深灰色作为强调色
    排版特点：传统排版，双线分隔区块
    装饰元素：下划线装饰区块标题，无圆角
  `.trim(),
};

/** 创意风格预设 */
export const creativePreset: StylePreset = {
  id: 'creative',
  name: '创意风格',
  description: '活泼的设计元素，适合设计、创意行业',
  category: 'creative',
  colors: creativeColors,
  typography: {
    ...defaultTypography,
    pageTitle: {
      ...defaultTypography.pageTitle,
      fontSize: 26,
    },
    sectionTitle: {
      ...defaultTypography.sectionTitle,
      color: '#7c3aed',
    },
  },
  spacing: {
    ...defaultSpacing,
    sectionGap: 6,
  },
  decoration: {
    ...defaultDecoration,
    borderRadius: {
      ...defaultDecoration.borderRadius,
      medium: 12,
      large: 20,
    },
  },
  constraints: defaultConstraints,
  designIntent: `
    设计风格：创意、活泼、个性
    布局特点：顶部渐变色横幅（约120px高度）展示姓名和职位，下方单栏布局
    色彩运用：紫色渐变作为主视觉，紫色系作为强调色
    排版特点：居中对齐的头部，左对齐的内容
    装饰元素：圆角卡片，渐变背景，图标装饰区块标题
  `.trim(),
};

/** 极简风格预设 */
export const minimalPreset: StylePreset = {
  id: 'minimal',
  name: '极简风格',
  description: '纯黑白极简设计，注重内容本身',
  category: 'minimal',
  colors: minimalColors,
  typography: {
    ...defaultTypography,
    pageTitle: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 24,
      fontWeight: 'normal',
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    sectionTitle: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      lineHeight: 1.4,
      letterSpacing: 2,
    },
    body: {
      ...defaultTypography.body,
      fontSize: 10,
      lineHeight: 1.7,
    },
  },
  spacing: {
    ...defaultSpacing,
    sectionGap: 4,
    listItemGap: 2,
  },
  decoration: {
    ...defaultDecoration,
    borderRadius: {
      none: 0,
      small: 0,
      medium: 0,
      large: 0,
      full: 0,
    },
  },
  constraints: defaultConstraints,
  designIntent: `
    设计风格：极简、纯粹、克制
    布局特点：单栏左对齐布局，最小化装饰
    色彩运用：纯黑白，无彩色
    排版特点：大写字母+字间距作为区块标题，无加粗
    装饰元素：无圆角，无边框，无阴影，仅用空白分隔
  `.trim(),
};

/** 高管专业预设 */
export const executivePreset: StylePreset = {
  id: 'executive',
  name: '高管专业',
  description: '深青色双栏布局，展现专业领导力',
  category: 'executive',
  colors: executiveColors,
  typography: {
    ...defaultTypography,
    pageTitle: {
      ...defaultTypography.pageTitle,
      textAlign: 'center',
    },
  },
  spacing: defaultSpacing,
  decoration: {
    ...defaultDecoration,
    borderRadius: {
      ...defaultDecoration.borderRadius,
      medium: 6,
    },
  },
  constraints: defaultConstraints,
  designIntent: `
    设计风格：专业、稳重、领导力
    布局特点：居中头部，下方双栏布局（左55%右45%）
    色彩运用：深青色作为主色，浅青色背景作为区块标题背景
    排版特点：双栏对称布局，内容分布均匀
    装饰元素：浅色背景块装饰区块标题，细圆角
  `.trim(),
};

/** 所有预设 */
export const stylePresets: Record<string, StylePreset> = {
  modern: modernPreset,
  classic: classicPreset,
  creative: creativePreset,
  minimal: minimalPreset,
  executive: executivePreset,
};

/** 获取预设 */
export function getStylePreset(id: string): StylePreset | undefined {
  return stylePresets[id];
}

/** 获取所有预设列表 */
export function getAllStylePresets(): StylePreset[] {
  return Object.values(stylePresets);
}
