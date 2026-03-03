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
  border: string;
}

/** 字体配置 */
export interface FontConfig {
  /** 主字体（中文） */
  primary: string;
  /** 英文字体 */
  english: string;
  /** 等宽字体 */
  mono: string;
}

/** 区块样式 */
export interface SectionStyle {
  title: TextStyle;
  accentColor?: string;
}

/** 模板样式配置 */
export interface TemplateStyles {
  /** 颜色主题 */
  colors: ColorTheme;
  /** 字体配置 */
  fonts: FontConfig;
  /** 头部样式 */
  header: {
    name: TextStyle;
    title: TextStyle;
    contact: TextStyle;
  };
  /** 区块标题样式 */
  section: SectionStyle;
  /** 正文样式 */
  body: {
    normal: TextStyle;
    bold: TextStyle;
    small: TextStyle;
  };
  /** 间距配置 */
  spacing: {
    sectionGap: number;
    paragraphGap: number;
    listItemGap: number;
    tagGap: number;
  };
}

/** 模板布局配置 */
export interface TemplateLayout {
  /** 头部布局 */
  header: {
    align: 'left' | 'center';
    showDivider: boolean;
  };
  /** 区块顺序 */
  sectionOrder: string[];
  /** 是否显示来源标签 */
  showSourceBadge: boolean;
  /** 是否显示匹配技能高亮 */
  highlightMatchedSkills: boolean;
}

/** 完整模板配置 */
export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'professional' | 'creative' | 'simple' | 'executive';
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
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
      muted: '#9ca3af',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tag: '#eff6ff',
    },
    border: '#e5e7eb',
  },
  classic: {
    primary: '#1f2937',
    secondary: '#374151',
    accent: '#4b5563',
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      muted: '#9ca3af',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tag: '#f3f4f6',
    },
    border: '#d1d5db',
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#5b21b6',
    accent: '#8b5cf6',
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
      muted: '#9ca3af',
    },
    background: {
      primary: '#ffffff',
      secondary: '#faf5ff',
      tag: '#f3e8ff',
    },
    border: '#e5e7eb',
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    accent: '#52525b',
    text: {
      primary: '#18181b',
      secondary: '#52525b',
      muted: '#a1a1aa',
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tag: '#f4f4f5',
    },
    border: '#e4e4e7',
  },
  executive: {
    primary: '#0f766e',
    secondary: '#0d9488',
    accent: '#14b8a6',
    text: {
      primary: '#134e4a',
      secondary: '#0f766e',
      muted: '#5eead4',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f0fdfa',
      tag: '#ccfbf1',
    },
    border: '#99f6e4',
  },
};

/** 默认字体配置 */
export const DEFAULT_FONTS: FontConfig = {
  primary: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
  english: '"Inter", "Segoe UI", "Roboto", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};
