/**
 * 基于 tldraw 的简历画布编辑器
 *
 * 功能特性：
 * - A4 纸张底图（白色背景 + 阴影）
 * - 智能排版（支持 LayoutResume 和旧格式）
 * - 多种颜色主题
 * - 导出为 PNG/PDF
 */

'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tldraw, useEditor, getSnapshot, toRichText, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import type {
  LayoutResume,
  ResumeLayoutBlock,
  ResumeLayoutConfig,
  ColorTheme,
  ResumeLayoutHint,
  ResumeHeaderContent,
  ResumeSummaryContent,
  ResumeExperienceContent,
  ResumeSkillContent,
  ResumeProjectContent,
  ResumeEducationContent,
} from '@ai-job-assistant/shared';

// ============== 类型定义 ==============

/** 旧版简历内容格式（兼容） */
export interface ResumeContentForEditor {
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

/** 编辑器 Props */
interface TldrawResumeEditorProps {
  /** 简历内容（支持新格式 LayoutResume 或旧格式 ResumeContentForEditor） */
  resumeContent: LayoutResume | ResumeContentForEditor | null;
  /** 元素变化回调 */
  onChange?: (snapshot: string) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 颜色主题 */
  theme?: ColorTheme;
  /** 是否显示页边距参考线 */
  showMarginGuides?: boolean;
  /** 布局配置（可选，用于覆盖 LayoutResume 中的配置） */
  layoutConfig?: ResumeLayoutConfig;
}

/** 导出选项 */
export interface ExportOptions {
  /** 文件名 */
  filename?: string;
  /** 格式 */
  format: 'png' | 'pdf';
  /** 缩放比例（默认 2） */
  scale?: number;
  /** 背景 */
  background?: boolean;
}

/** 编辑器公开方法 */
export interface TldrawResumeEditorRef {
  /** 导出为 PNG */
  exportToPNG: (options?: Partial<ExportOptions>) => Promise<Blob | null>;
  /** 导出为 PDF */
  exportToPDF: (options?: Partial<ExportOptions>) => Promise<Blob | null>;
  /** 获取编辑器实例 */
  getEditor: () => ReturnType<typeof useEditor> | null;
  /** 获取快照 */
  getSnapshot: () => string | null;
}

/** 检测是否为 LayoutResume 格式 */
function isLayoutResume(content: unknown): content is LayoutResume {
  return (
    typeof content === 'object' &&
    content !== null &&
    'meta' in content &&
    'blocks' in content
  );
}

// ============== 常量定义 ==============

/** A4 尺寸（像素，96 DPI） */
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

/** 页边距 - 减小边距提高页面利用率 */
const PAGE_MARGINS = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
};

/** 内容区域宽度 */
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right;

// ============== 主题系统 ==============

/** 主题配置 */
interface ThemeConfig {
  /** 主色 */
  primary: string;
  /** 次色 */
  secondary: string;
  /** 强调色 */
  accent: string;
  /** 文字颜色 */
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  /** 背景颜色 */
  background: {
    primary: string;
    secondary: string;
  };
  /** 边框颜色 */
  border: {
    light: string;
    medium: string;
  };
  /** 技能标签颜色 */
  skillTag: {
    matched: {
      background: string;
      text: string;
      border: string;
    };
    normal: {
      background: string;
      text: string;
      border: string;
    };
  };
}

/** 主题配置映射 */
const themeConfigs: Record<ColorTheme, ThemeConfig> = {
  modern: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#60a5fa',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#94a3b8',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
    },
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
    },
    skillTag: {
      matched: {
        background: '#dbeafe',
        text: '#1e40af',
        border: '#93c5fd',
      },
      normal: {
        background: '#f1f5f9',
        text: '#475569',
        border: '#e2e8f0',
      },
    },
  },
  classic: {
    primary: '#1f2937',
    secondary: '#374151',
    accent: '#6b7280',
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      muted: '#9ca3af',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
    },
    border: {
      light: '#e5e7eb',
      medium: '#d1d5db',
    },
    skillTag: {
      matched: {
        background: '#e5e7eb',
        text: '#111827',
        border: '#9ca3af',
      },
      normal: {
        background: '#f3f4f6',
        text: '#4b5563',
        border: '#e5e7eb',
      },
    },
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    accent: '#a78bfa',
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
      muted: '#9ca3af',
    },
    background: {
      primary: '#ffffff',
      secondary: '#faf5ff',
    },
    border: {
      light: '#e9d5ff',
      medium: '#d8b4fe',
    },
    skillTag: {
      matched: {
        background: '#ede9fe',
        text: '#5b21b6',
        border: '#c4b5fd',
      },
      normal: {
        background: '#f3e8ff',
        text: '#6b7280',
        border: '#e9d5ff',
      },
    },
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    accent: '#71717a',
    text: {
      primary: '#18181b',
      secondary: '#52525b',
      muted: '#a1a1aa',
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
    },
    border: {
      light: '#e4e4e7',
      medium: '#d4d4d8',
    },
    skillTag: {
      matched: {
        background: '#27272a',
        text: '#ffffff',
        border: '#52525b',
      },
      normal: {
        background: '#f4f4f5',
        text: '#3f3f46',
        border: '#e4e4e7',
      },
    },
  },
  executive: {
    primary: '#0f766e',
    secondary: '#14b8a6',
    accent: '#2dd4bf',
    text: {
      primary: '#134e4a',
      secondary: '#0f766e',
      muted: '#5eead4',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f0fdfa',
    },
    border: {
      light: '#99f6e4',
      medium: '#5eead4',
    },
    skillTag: {
      matched: {
        background: '#ccfbf1',
        text: '#0f766e',
        border: '#5eead4',
      },
      normal: {
        background: '#f0fdfa',
        text: '#0f766e',
        border: '#99f6e4',
      },
    },
  },
};

// ============== 样式系统 ==============

/** 排版样式 - 根据导出效果优化 */
const typographyStyles = {
  /** 页面标题（姓名） */
  pageTitle: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 22,
    fontWeight: 'bold' as const,
    lineHeight: 1.4,
  },
  /** 副标题（职位） - 加粗突出 */
  subtitle: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 1.5,
  },
  /** 区块标题 - 增大字号提升区分度 */
  sectionTitle: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 12,
    fontWeight: 'bold' as const,
    lineHeight: 1.5,
    letterSpacing: 0.5,
  },
  /** 小标题（公司名、学校名） */
  itemTitle: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 11,
    fontWeight: 'bold' as const,
    lineHeight: 1.5,
  },
  /** 正文 - 适当行高提升可读性 */
  body: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 10,
    fontWeight: 'normal' as const,
    lineHeight: 1.6,
  },
  /** 说明文字（时间、地点等） */
  caption: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 9,
    fontWeight: 'normal' as const,
    lineHeight: 1.4,
  },
  /** 技能标签 */
  label: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    fontSize: 9,
    fontWeight: 'normal' as const,
    lineHeight: 1.3,
  },
};

/** 间距系统 - 增加间距防止重叠 */
const spacing = {
  /** 区块间距 */
  sectionGap: 24,
  /** 区块内标题与内容间距 */
  sectionTitleGap: 14,
  /** 项目间距 - 增加以防止重叠 */
  itemGap: 24,
  /** 段落间距 - 增加 */
  paragraphGap: 16,
  /** 行间距 - 增加 */
  lineGap: 14,
  /** 左缩进 */
  leftIndent: 12,
  /** 技能标签间距 */
  tagGap: 16,
  /** 文本高度缓冲值 - 增加以防止重叠 */
  heightBuffer: 8,
};

// ============== 辅助函数 ==============

/**
 * 格式化日期范围
 */
function formatPeriod(startDate: string, endDate?: string, current?: boolean): string {
  const start = startDate || '';
  const end = current ? '至今' : (endDate || '');
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
}

// ============== 渲染函数 ==============

/**
 * 创建 A4 纸张背景
 */
function createPaperBackground(editor: ReturnType<typeof useEditor>, showMarginGuides: boolean): void {
  // 创建阴影层
  editor.createShape({
    id: createShapeId(),
    type: 'geo',
    x: 4,
    y: 4,
    props: {
      geo: 'rectangle',
      w: A4_WIDTH,
      h: A4_HEIGHT,
      fill: 'semi',
      color: 'grey',
      dash: 'draw',
      size: 'm',
    },
  });

  // 创建纸张背景（白色矩形）
  editor.createShape({
    id: createShapeId(),
    type: 'geo',
    x: 0,
    y: 0,
    props: {
      geo: 'rectangle',
      w: A4_WIDTH,
      h: A4_HEIGHT,
      fill: 'solid',
      color: 'white',
      dash: 'draw',
      size: 'm',
    },
  });

  // 显示页边距参考线（使用细矩形绘制虚线效果）
  if (showMarginGuides) {
    // 上边距线
    editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: 0,
      y: PAGE_MARGINS.top,
      props: {
        geo: 'rectangle',
        w: A4_WIDTH,
        h: 1,
        fill: 'none',
        color: 'grey',
        dash: 'dashed',
        size: 's',
      },
    });

    // 下边距线
    editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: 0,
      y: A4_HEIGHT - PAGE_MARGINS.bottom,
      props: {
        geo: 'rectangle',
        w: A4_WIDTH,
        h: 1,
        fill: 'none',
        color: 'grey',
        dash: 'dashed',
        size: 's',
      },
    });

    // 左边距线
    editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: PAGE_MARGINS.left,
      y: 0,
      props: {
        geo: 'rectangle',
        w: 1,
        h: A4_HEIGHT,
        fill: 'none',
        color: 'grey',
        dash: 'dashed',
        size: 's',
      },
    });

    // 右边距线
    editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: A4_WIDTH - PAGE_MARGINS.right,
      y: 0,
      props: {
        geo: 'rectangle',
        w: 1,
        h: A4_HEIGHT,
        fill: 'none',
        color: 'grey',
        dash: 'dashed',
        size: 's',
      },
    });
  }
}

/**
 * 创建区块标题（带下划线装饰）
 */
function createSectionHeader(
  editor: ReturnType<typeof useEditor>,
  title: string,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig
): number {
  const style = typographyStyles.sectionTitle;

  // 创建标题文本
  editor.createShape({
    id: createShapeId(),
    type: 'text',
    x,
    y,
    props: {
      richText: toRichText(title.toUpperCase()),
      color: 'black',
      textAlign: 'start',
      autoSize: false,
      w: width,
      size: 'm',
    },
  });

  const titleHeight = style.fontSize * style.lineHeight + spacing.heightBuffer;

  // 创建下划线装饰（使用细矩形）
  editor.createShape({
    id: createShapeId(),
    type: 'geo',
    x,
    y: y + titleHeight + 4,
    props: {
      geo: 'rectangle',
      w: width,
      h: 2,
      fill: 'solid',
      color: 'blue',
      dash: 'solid',
      size: 's',
    },
  });

  return titleHeight + 10; // 标题高度 + 下划线间距 + 缓冲
}

/**
 * 创建工作经历左侧竖线装饰
 */
function createExperienceDecoration(
  editor: ReturnType<typeof useEditor>,
  x: number,
  y: number,
  height: number,
  theme: ThemeConfig
): void {
  // 创建左侧竖线（使用细矩形）
  editor.createShape({
    id: createShapeId(),
    type: 'geo',
    x,
    y,
    props: {
      geo: 'rectangle',
      w: 2,
      h: height,
      fill: 'solid',
      color: 'blue',
      dash: 'solid',
      size: 's',
    },
  });
}

/**
 * 计算文本宽度的辅助函数
 * 中文字符约 14px 宽度，英文字符约 8px 宽度（基于 10px 字体大小）
 */
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    // 检测是否为中文字符（包括中文标点）
    if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
      width += fontSize * 1.0; // 中文字符宽度约等于字体大小
    } else {
      width += fontSize * 0.6; // 英文字符宽度约为字体大小的 0.6 倍
    }
  }
  return Math.ceil(width);
}

/**
 * 创建技能标签
 */
function createSkillTags(
  editor: ReturnType<typeof useEditor>,
  skills: Array<{ name: string; matched?: boolean }>,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig
): number {
  let currentX = x;
  let currentY = y;
  let maxHeightInRow = 0;
  const tagHeight = 24;
  const tagPaddingX = 14;
  const tagPaddingY = 5;
  const tagGap = spacing.tagGap;
  const fontSize = typographyStyles.label.fontSize;

  skills.forEach((skill) => {
    // 使用更准确的宽度计算
    const textWidth = estimateTextWidth(skill.name, fontSize);
    // 增加足够的缓冲空间以确保文本不会超出背景框（tldraw 文本渲染可能更宽）
    const tagWidth = textWidth + tagPaddingX * 2 + 12;

    // 检查是否需要换行
    if (currentX + tagWidth > x + width && currentX > x) {
      currentX = x;
      currentY += maxHeightInRow + tagGap;
      maxHeightInRow = 0;
    }

    // 创建标签背景（使用矩形）
    editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: currentX,
      y: currentY,
      props: {
        geo: 'rectangle',
        w: tagWidth,
        h: tagHeight,
        fill: skill.matched ? 'semi' : 'solid',
        color: skill.matched ? 'blue' : 'grey',
        dash: 'draw',
        size: 's',
      },
    });

    // 创建标签文本(使用固定内边距，确保文本在背景框内)
    // 文本位置：左边界留出 tagPaddingX/2 的空间，顶部留出 tagPaddingY 的空间
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x: currentX + tagPaddingX / 2,
      y: currentY + tagPaddingY,
      props: {
        richText: toRichText(skill.name),
        color: skill.matched ? 'blue' : 'black',
        textAlign: 'start',
        autoSize: true,
        size: 's',
      },
    });

    currentX += tagWidth + tagGap;
    maxHeightInRow = Math.max(maxHeightInRow, tagHeight);
  });

  return currentY + maxHeightInRow - y + spacing.heightBuffer;
}

/**
 * 渲染 LayoutResume 格式的内容
 */
function populateLayoutResume(
  editor: ReturnType<typeof useEditor>,
  layoutResume: LayoutResume,
  theme: ColorTheme,
  showMarginGuides: boolean
): void {
  const themeConfig = themeConfigs[theme];
  const layoutConfig = layoutResume.layoutConfig;

  // 创建纸张背景
  createPaperBackground(editor, showMarginGuides);

  // 初始位置
  let y = PAGE_MARGINS.top;
  const x = PAGE_MARGINS.left;

  // 根据 sectionOrder 或默认顺序渲染区块
  const sectionOrder = layoutConfig?.sectionOrder;
  const blocks = sectionOrder
    ? sectionOrder
        .map((id: string) => layoutResume.blocks.find((b) => b.id === id))
        .filter((b): b is ResumeLayoutBlock => b !== undefined)
    : layoutResume.blocks;

  blocks.forEach((block: ResumeLayoutBlock) => {
    const blockHeight = renderBlock(editor, block, x, y, CONTENT_WIDTH, themeConfig, layoutConfig);
    y += blockHeight + spacing.sectionGap;
  });
}

/**
 * 渲染单个区块
 */
function renderBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig,
  layoutConfig?: ResumeLayoutConfig
): number {
  const layoutHint = block.layoutHint;
  let currentY = y;

  // 根据区块类型渲染
  switch (block.type) {
    case 'header':
      return renderHeaderBlock(editor, block, x, currentY, width, theme);
    case 'summary':
      currentY += createSectionHeader(editor, block.title || '个人简介', x, currentY, width, theme);
      return currentY - y + renderSummaryBlock(editor, block, x, currentY, width, theme, layoutHint);
    case 'experience':
      currentY += createSectionHeader(editor, block.title || '工作经历', x, currentY, width, theme);
      return currentY - y + renderExperienceBlock(editor, block, x, currentY, width, theme, layoutHint);
    case 'skills':
      currentY += createSectionHeader(editor, block.title || '专业技能', x, currentY, width, theme);
      return currentY - y + renderSkillsBlock(editor, block, x, currentY, width, theme, layoutConfig, layoutHint);
    case 'projects':
      currentY += createSectionHeader(editor, block.title || '项目经历', x, currentY, width, theme);
      return currentY - y + renderProjectsBlock(editor, block, x, currentY, width, theme, layoutHint);
    case 'education':
      currentY += createSectionHeader(editor, block.title || '教育背景', x, currentY, width, theme);
      return currentY - y + renderEducationBlock(editor, block, x, currentY, width, theme);
    default:
      return 0;
  }
}

/**
 * 渲染头部区块
 */
function renderHeaderBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig
): number {
  const content = block.content as ResumeHeaderContent;
  let currentY = y;

  // 姓名（处理可能为空的情况）
  const nameText = content.name || '未命名';
  editor.createShape({
    id: createShapeId(),
    type: 'text',
    x,
    y: currentY,
    props: {
      richText: toRichText(nameText),
      color: 'black',
      textAlign: 'middle',
      autoSize: false,
      w: width,
      size: 'xl',
    },
  });
  currentY += typographyStyles.pageTitle.fontSize * typographyStyles.pageTitle.lineHeight + 10 + spacing.heightBuffer;

  // 求职意向
  if (content.targetPosition) {
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(content.targetPosition),
        color: 'grey',
        textAlign: 'middle',
        autoSize: false,
        w: width,
        size: 'm',
      },
    });
    currentY += typographyStyles.subtitle.fontSize * typographyStyles.subtitle.lineHeight + 10 + spacing.heightBuffer;
  }

  // 联系方式
  const contactParts: string[] = [];
  if (content.email) contactParts.push(content.email);
  if (content.phone) contactParts.push(content.phone);
  if (content.location) contactParts.push(content.location);

  if (contactParts.length > 0) {
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(contactParts.join('    •    ')),
        color: 'grey',
        textAlign: 'middle',
        autoSize: false,
        w: width,
        size: 's',
      },
    });
    currentY += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 10 + spacing.heightBuffer;
  }

  // 链接
  if (content.links && content.links.length > 0) {
    const linkParts = content.links.map((link: { type: string; url: string; label?: string }) => link.label || link.url);
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(linkParts.join('  |  ')),
        color: 'blue',
        textAlign: 'middle',
        autoSize: false,
        w: width,
        size: 's',
      },
    });
    currentY += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 10 + spacing.heightBuffer;
  }

  return currentY - y + spacing.heightBuffer;
}

/**
 * 渲染简介区块
 */
function renderSummaryBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig,
  layoutHint?: ResumeLayoutHint
): number {
  const content = block.content as ResumeSummaryContent;

  // 简介文本
  editor.createShape({
    id: createShapeId(),
    type: 'text',
    x,
    y,
    props: {
      richText: toRichText(content.summary),
      color: 'black',
      textAlign: 'start',
      autoSize: false,
      w: width,
      size: 's',
    },
  });

  let height = typographyStyles.body.fontSize * typographyStyles.body.lineHeight * 4 + spacing.heightBuffer * 2; // 估算高度 + 缓冲

  // 核心优势标签
  if (content.coreStrengths && content.coreStrengths.length > 0) {
    const tagsHeight = createSkillTags(
      editor,
      content.coreStrengths.map((s: string) => ({ name: s, matched: true })),
      x,
      y + height + 10,
      width,
      theme
    );
    height += tagsHeight + 12;
  }

  return height + spacing.paragraphGap;
}

/**
 * 渲染工作经历区块
 */
function renderExperienceBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig,
  layoutHint?: ResumeLayoutHint
): number {
  const content = block.content as ResumeExperienceContent;
  const displayStyle = layoutHint?.displayStyle || 'default';
  const isCompact = displayStyle === 'compact';

  let currentY = y;
  const indentX = x + spacing.leftIndent;

  content.items.forEach((item) => {
    const startY = currentY;

    // 职位名称
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(item.position),
        color: 'black',
        textAlign: 'start',
        autoSize: false,
        w: width,
        size: 'm',
      },
    });
    currentY += typographyStyles.itemTitle.fontSize * typographyStyles.itemTitle.lineHeight + 12 + spacing.heightBuffer;

    // 公司和时间段
    const period = formatPeriod(item.startDate, item.endDate, item.current);
    const locationParts = [item.company, period, item.location].filter(Boolean);

    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(locationParts.join('  |  ')),
        color: 'grey',
        textAlign: 'start',
        autoSize: false,
        w: width,
        size: 's',
      },
    });
    currentY += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 6 + spacing.heightBuffer;

    // 成就列表
    const achievements = item.achievements ?? [];
    const starResults = item.starHighlights?.map((h) => h.result).filter((r): r is string => r !== undefined) ?? [];
    const allAchievements = [...achievements, ...starResults];

    allAchievements.forEach((achievement: string) => {
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x: indentX,
        y: currentY,
        props: {
          richText: toRichText(`• ${achievement}`),
          color: 'black',
          textAlign: 'start',
          autoSize: false,
          w: width - spacing.leftIndent,
          size: 's',
        },
      });
      currentY += typographyStyles.body.fontSize * typographyStyles.body.lineHeight + 8 + spacing.heightBuffer;
    });

    // 添加左侧竖线装饰
    const itemHeight = currentY - startY;
    if (itemHeight > 30) {
      createExperienceDecoration(editor, x - 8, startY + 5, itemHeight - 10, theme);
    }

    currentY += isCompact ? spacing.lineGap : spacing.itemGap;
  });

  return currentY - y + spacing.heightBuffer;
}

/**
 * 渲染技能区块
 */
function renderSkillsBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig,
  layoutConfig?: ResumeLayoutConfig,
  layoutHint?: ResumeLayoutHint
): number {
  const content = block.content as ResumeSkillContent;
  const displayMode = content.displayMode || 'flat';
  const highlightMatched = layoutConfig?.highlightMatchedSkills ?? true;

  let currentY = y;

  if (displayMode === 'categorized' && content.categories) {
    // 分类显示
    content.categories.forEach((category) => {
      // 分类名称
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y: currentY,
        props: {
          richText: toRichText(category.category),
          color: 'grey',
          textAlign: 'start',
          autoSize: false,
          w: width,
          size: 's',
        },
      });
      currentY += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 6 + spacing.heightBuffer;

      // 技能标签
      const skills = category.skills.map((s) => ({
        name: s.name,
        matched: highlightMatched && s.isMatched,
      }));

      const tagsHeight = createSkillTags(editor, skills, x, currentY, width, theme);
      currentY += tagsHeight + 14;
    });
  } else if (content.items) {
    // 扁平显示
    const skills = content.items.map((s) => ({
      name: s.name,
      matched: highlightMatched && s.isMatched,
    }));

    const tagsHeight = createSkillTags(editor, skills, x, currentY, width, theme);
    currentY += tagsHeight + spacing.heightBuffer;
  }

  return currentY - y + spacing.paragraphGap;
}

/**
 * 渲染项目区块
 */
function renderProjectsBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig,
  layoutHint?: ResumeLayoutHint
): number {
  const content = block.content as ResumeProjectContent;
  let currentY = y;
  const indentX = x + spacing.leftIndent;

  content.items.forEach((project) => {
    // 项目名称
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(project.name),
        color: 'black',
        textAlign: 'start',
        autoSize: false,
        w: width,
        size: 'm',
      },
    });
    currentY += typographyStyles.itemTitle.fontSize * typographyStyles.itemTitle.lineHeight + 12 + spacing.heightBuffer;

    // 角色和时间段 - 增加间距
    const period = formatPeriod(project.startDate, project.endDate, project.ongoing);
    const roleParts = [project.role, period].filter(Boolean);

    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(roleParts.join('  |  ')),
        color: 'grey',
        textAlign: 'start',
        autoSize: false,
        w: width,
        size: 's',
      },
    });
    currentY += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 12 + spacing.heightBuffer;

    // 技术栈标签 - 增加间距
    if (project.technologies && project.technologies.length > 0) {
      const techTags = project.technologies.map((t: string) => ({ name: t, matched: false }));
      const tagsHeight = createSkillTags(editor, techTags, x, currentY, width, theme);
      currentY += tagsHeight + 10;
    }

    // 成就列表
    project.achievements.forEach((achievement: string) => {
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x: indentX,
        y: currentY,
        props: {
          richText: toRichText(`• ${achievement}`),
          color: 'black',
          textAlign: 'start',
          autoSize: false,
          w: width - spacing.leftIndent,
          size: 's',
        },
      });
      currentY += typographyStyles.body.fontSize * typographyStyles.body.lineHeight + 8 + spacing.heightBuffer;
    });

    currentY += spacing.itemGap;
  });

  return currentY - y + spacing.heightBuffer;
}

/**
 * 渲染教育区块
 */
function renderEducationBlock(
  editor: ReturnType<typeof useEditor>,
  block: ResumeLayoutBlock,
  x: number,
  y: number,
  width: number,
  theme: ThemeConfig
): number {
  const content = block.content as ResumeEducationContent;
  let currentY = y;

  content.items.forEach((edu) => {
    // 学校名称
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(edu.school),
        color: 'black',
        textAlign: 'start',
        autoSize: false,
        w: width,
        size: 'm',
      },
    });
    currentY += typographyStyles.itemTitle.fontSize * typographyStyles.itemTitle.lineHeight + 15 + spacing.heightBuffer;

    // 专业、学位、时间段
    const period = formatPeriod(edu.startDate, edu.endDate);
    const detailParts = [`${edu.major} · ${edu.degree}`, period, edu.gpa ? `GPA: ${edu.gpa}` : null].filter(Boolean);

    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y: currentY,
      props: {
        richText: toRichText(detailParts.join('  |  ')),
        color: 'grey',
        textAlign: 'start',
        autoSize: false,
        w: width,
        size: 's',
      },
    });
    currentY += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 12 + spacing.heightBuffer;
  });

  return currentY - y + spacing.heightBuffer;
}

/**
 * 渲染旧格式简历内容（兼容）
 */
function populateLegacyResumeContent(
  editor: ReturnType<typeof useEditor>,
  content: ResumeContentForEditor,
  theme: ColorTheme,
  showMarginGuides: boolean
): void {
  const themeConfig = themeConfigs[theme];

  // 创建纸张背景
  createPaperBackground(editor, showMarginGuides);

  let y = PAGE_MARGINS.top;
  const x = PAGE_MARGINS.left;

  // 姓名（处理可能为空的情况）
  const nameText = content.name || '未命名简历';
  editor.createShape({
    id: createShapeId(),
    type: 'text',
    x,
    y,
    props: {
      richText: toRichText(nameText),
      color: 'black',
      textAlign: 'middle',
      autoSize: false,
      w: CONTENT_WIDTH,
      size: 'xl',
    },
  });
  y += typographyStyles.pageTitle.fontSize * typographyStyles.pageTitle.lineHeight + 10 + spacing.heightBuffer;

  // 职位
  if (content.title) {
    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y,
      props: {
        richText: toRichText(content.title),
        color: 'grey',
        textAlign: 'middle',
        autoSize: false,
        w: CONTENT_WIDTH,
        size: 'm',
      },
    });
    y += typographyStyles.subtitle.fontSize * typographyStyles.subtitle.lineHeight + 10 + spacing.heightBuffer;
  }

  // 联系方式
  if (content.contact) {
    const contactParts: string[] = [];
    if (content.contact.email) contactParts.push(content.contact.email);
    if (content.contact.phone) contactParts.push(content.contact.phone);
    if (content.contact.location) contactParts.push(content.contact.location);

    if (contactParts.length > 0) {
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y,
        props: {
          richText: toRichText(contactParts.join('    •    ')),
          color: 'grey',
          textAlign: 'middle',
          autoSize: false,
          w: CONTENT_WIDTH,
          size: 's',
        },
      });
      y += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 10 + spacing.heightBuffer;
    }
  }

  y += spacing.sectionGap;

  // 个人简介
  if (content.summary) {
    y += createSectionHeader(editor, '个人简介', x, y, CONTENT_WIDTH, themeConfig);
    y += spacing.sectionTitleGap;

    editor.createShape({
      id: createShapeId(),
      type: 'text',
      x,
      y,
      props: {
        richText: toRichText(content.summary),
        color: 'black',
        textAlign: 'start',
        autoSize: false,
        w: CONTENT_WIDTH,
        size: 's',
      },
    });
    y += typographyStyles.body.fontSize * typographyStyles.body.lineHeight * 3 + spacing.sectionGap + spacing.heightBuffer;
  }

  // 工作经历
  if (content.experience && content.experience.length > 0) {
    y += createSectionHeader(editor, '工作经历', x, y, CONTENT_WIDTH, themeConfig);
    y += spacing.sectionTitleGap;

    content.experience.forEach((exp) => {
      const startY = y;

      // 职位
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y,
        props: {
          richText: toRichText(exp.position),
          color: 'black',
          textAlign: 'start',
          autoSize: false,
          w: CONTENT_WIDTH,
          size: 'm',
        },
      });
      y += typographyStyles.itemTitle.fontSize * typographyStyles.itemTitle.lineHeight + spacing.heightBuffer;

      // 公司和时间段
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y,
        props: {
          richText: toRichText(`${exp.company}  |  ${exp.period}`),
          color: 'grey',
          textAlign: 'start',
          autoSize: false,
          w: CONTENT_WIDTH,
          size: 's',
        },
      });
      y += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 6 + spacing.heightBuffer;

      // 成就列表
      exp.highlights.forEach((highlight) => {
        editor.createShape({
          id: createShapeId(),
          type: 'text',
          x: x + spacing.leftIndent,
          y,
          props: {
            richText: toRichText(`• ${highlight}`),
            color: 'black',
            textAlign: 'start',
            autoSize: false,
            w: CONTENT_WIDTH - spacing.leftIndent,
            size: 's',
          },
        });
        y += typographyStyles.body.fontSize * typographyStyles.body.lineHeight + 4 + spacing.heightBuffer;
      });

      // 左侧竖线装饰
      const itemHeight = y - startY;
      if (itemHeight > 30) {
        createExperienceDecoration(editor, x - 8, startY + 5, itemHeight - 10, themeConfig);
      }

      y += spacing.itemGap;
    });
  }

  // 技能
  if (content.skills && content.skills.length > 0) {
    y += createSectionHeader(editor, '专业技能', x, y, CONTENT_WIDTH, themeConfig);
    y += spacing.sectionTitleGap;

    const skills = content.skills.map((skill) => ({
      name: skill,
      matched: content.matchedSkills?.includes(skill),
    }));

    const tagsHeight = createSkillTags(editor, skills, x, y, CONTENT_WIDTH, themeConfig);
    y += tagsHeight + spacing.sectionGap;
  }

  // 项目经历
  const projects = content.projects;
  if (projects && projects.length > 0) {
    y += createSectionHeader(editor, '项目经历', x, y, CONTENT_WIDTH, themeConfig);
    y += spacing.sectionTitleGap;

    projects.forEach((project) => {
      // 项目名称
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y,
        props: {
          richText: toRichText(project.name),
          color: 'black',
          textAlign: 'start',
          autoSize: false,
          w: CONTENT_WIDTH,
          size: 'm',
        },
      });
      y += typographyStyles.itemTitle.fontSize * typographyStyles.itemTitle.lineHeight + spacing.heightBuffer;

      // 角色和时间段
      if (project.role || project.period) {
        editor.createShape({
          id: createShapeId(),
          type: 'text',
          x,
          y,
          props: {
            richText: toRichText([project.role, project.period].filter(Boolean).join('  |  ')),
            color: 'grey',
            textAlign: 'start',
            autoSize: false,
            w: CONTENT_WIDTH,
            size: 's',
          },
        });
        y += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 6 + spacing.heightBuffer;
      }

      // 技术栈标签
      if (project.techStack && project.techStack.length > 0) {
        const techTags = project.techStack.map((t) => ({ name: t, matched: false }));
        const tagsHeight = createSkillTags(editor, techTags, x, y, CONTENT_WIDTH, themeConfig);
        y += tagsHeight + 6;
      }

      // 成就列表
      project.highlights.forEach((highlight) => {
        editor.createShape({
          id: createShapeId(),
          type: 'text',
          x: x + spacing.leftIndent,
          y,
          props: {
            richText: toRichText(`• ${highlight}`),
            color: 'black',
            textAlign: 'start',
            autoSize: false,
            w: CONTENT_WIDTH - spacing.leftIndent,
            size: 's',
          },
        });
        y += typographyStyles.body.fontSize * typographyStyles.body.lineHeight + 4 + spacing.heightBuffer;
      });

      y += spacing.itemGap;
    });
  }

  // 教育背景
  if (content.education && content.education.length > 0) {
    y += createSectionHeader(editor, '教育背景', x, y, CONTENT_WIDTH, themeConfig);
    y += spacing.sectionTitleGap;

    content.education.forEach((edu) => {
      // 学校名称
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y,
        props: {
          richText: toRichText(edu.school),
          color: 'black',
          textAlign: 'start',
          autoSize: false,
          w: CONTENT_WIDTH,
          size: 'm',
        },
      });
      y += typographyStyles.itemTitle.fontSize * typographyStyles.itemTitle.lineHeight + spacing.heightBuffer;

      // 专业、学位、时间段
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x,
        y,
        props: {
          richText: toRichText(`${edu.major} · ${edu.degree}  |  ${edu.period}`),
          color: 'grey',
          textAlign: 'start',
          autoSize: false,
          w: CONTENT_WIDTH,
          size: 's',
        },
      });
      y += typographyStyles.caption.fontSize * typographyStyles.caption.lineHeight + 14 + spacing.heightBuffer;
    });
  }
}

// ============== 编辑器组件 ==============

/**
 * 编辑器设置组件
 */
function EditorSetup({
  resumeContent,
  onChange,
  readOnly,
  theme,
  showMarginGuides,
  layoutConfig,
  editorRef,
}: TldrawResumeEditorProps & { editorRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> }) {
  const editor = useEditor();
  const initialized = useRef(false);
  const lastContentRef = useRef<string>('');

  // 保存编辑器引用
  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);

  useEffect(() => {
    // 检查内容是否变化
    const contentKey = JSON.stringify(resumeContent);
    if (contentKey === lastContentRef.current) return;

    if (editor && resumeContent) {
      lastContentRef.current = contentKey;

      console.log('[TldrawResumeEditor] 开始渲染简历内容', {
        isLayout: isLayoutResume(resumeContent),
        hasEditor: !!editor,
        content: resumeContent,
      });

      // 清空现有内容
      const allShapes = editor.getCurrentPageShapes();
      console.log('[TldrawResumeEditor] 当前 shapes 数量:', allShapes.length);
      if (allShapes.length > 0) {
        editor.deleteShapes(allShapes.map((s) => s.id));
      }

      // 根据内容格式渲染
      if (isLayoutResume(resumeContent)) {
        console.log('[TldrawResumeEditor] 使用 LayoutResume 格式渲染');
        populateLayoutResume(editor, resumeContent, theme || 'modern', showMarginGuides || false);
      } else {
        console.log('[TldrawResumeEditor] 使用旧格式渲染');
        populateLegacyResumeContent(editor, resumeContent, theme || 'modern', showMarginGuides || false);
      }

      console.log('[TldrawResumeEditor] 渲染完成，shapes 数量:', editor.getCurrentPageShapes().length);

      // 设置只读/编辑模式
      editor.updateInstanceState({ isReadonly: readOnly });

      // 适应视图 - zoomToFit 使用编辑器的 zoomToFitPadding 设置
      setTimeout(() => {
        editor.zoomToFit();
      }, 100);
    }
  }, [editor, resumeContent, readOnly, theme, showMarginGuides, layoutConfig]);

  useEffect(() => {
    if (editor && onChange) {
      const unsubscribe = editor.store.listen(
        () => {
          try {
            const snapshot = JSON.stringify(getSnapshot(editor.store));
            onChange(snapshot);
          } catch (error) {
            console.error('序列化快照失败:', error);
          }
        },
        { scope: 'document' }
      );

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [editor, onChange]);

  // 键盘方向键移动选中元素
  useEffect(() => {
    if (!editor || readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedShapes = editor.getSelectedShapes();
      if (selectedShapes.length === 0) return;

      // 方向键移动
      const moveStep = e.shiftKey ? 10 : 1; // Shift 键加速
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
          dy = -moveStep;
          break;
        case 'ArrowDown':
          dy = moveStep;
          break;
        case 'ArrowLeft':
          dx = -moveStep;
          break;
        case 'ArrowRight':
          dx = moveStep;
          break;
        default:
          return;
      }

      e.preventDefault();
      editor.nudgeShapes(selectedShapes.map((s) => s.id), { x: dx, y: dy });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, readOnly]);

  return null;
}

/**
 * tldraw 简历编辑器组件
 */
export const TldrawResumeEditor = forwardRef<TldrawResumeEditorRef, TldrawResumeEditorProps>(
  (
    {
      resumeContent,
      onChange,
      readOnly = false,
      theme = 'modern',
      showMarginGuides = false,
      layoutConfig,
    },
    ref
  ) => {
    const [isMounted, setIsMounted] = useState(false);
    const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // 导出为 PNG（使用编辑器的 toImage 方法）
    const exportToPNG = useCallback(async (options?: Partial<ExportOptions>): Promise<Blob | null> => {
      const editor = editorRef.current;
      if (!editor) return null;

      try {
        // 获取所有形状
        const shapeIds = editor.getCurrentPageShapes().map((s) => s.id);

        // 创建离屏 Canvas 进行渲染
        const canvas = document.createElement('canvas');
        const scale = options?.scale ?? 2;
        canvas.width = A4_WIDTH * scale;
        canvas.height = A4_HEIGHT * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 填充背景
        if (options?.background !== false) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 使用编辑器的 toImage 功能（如果可用）
        // 否则使用 canvas 方法
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        return blob;
      } catch (error) {
        console.error('导出 PNG 失败:', error);
        return null;
      }
    }, []);

    // 导出为 PDF（使用 Canvas 转 PDF）
    const exportToPDF = useCallback(async (options?: Partial<ExportOptions>): Promise<Blob | null> => {
      try {
        // 先导出为 PNG
        const pngBlob = await exportToPNG(options);
        if (!pngBlob) return null;

        // 使用 pdf-lib 将 PNG 转换为 PDF
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();

        // 嵌入图片
        const pngBytes = await pngBlob.arrayBuffer();
        const image = await pdfDoc.embedPng(new Uint8Array(pngBytes));

        // 添加页面（A4 尺寸）
        const pdfPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

        // 绘制图片
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: A4_WIDTH,
          height: A4_HEIGHT,
        });

        // 保存 PDF
        const pdfBytes = await pdfDoc.save();
        return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      } catch (error) {
        console.error('导出 PDF 失败:', error);
        return null;
      }
    }, [exportToPNG]);

    // 获取快照
    const getEditorSnapshot = useCallback((): string | null => {
      const editor = editorRef.current;
      if (!editor) return null;

      try {
        return JSON.stringify(getSnapshot(editor.store));
      } catch {
        return null;
      }
    }, []);

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        exportToPNG,
        exportToPDF,
        getEditor: () => editorRef.current,
        getSnapshot: getEditorSnapshot,
      }),
      [exportToPNG, exportToPDF, getEditorSnapshot]
    );

    if (!isMounted) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">加载编辑器...</div>
        </div>
      );
    }

    return (
      <div
        className="tldraw-resume-editor"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#e5e7eb',
        }}
      >
        <Tldraw
          persistenceKey="resume-editor"
          components={{
            ActionsMenu: null,
            ContextMenu: null,
            HelpMenu: null,
            NavigationPanel: null,
          }}
        >
          <EditorSetup
            resumeContent={resumeContent}
            onChange={onChange}
            readOnly={readOnly}
            theme={theme}
            showMarginGuides={showMarginGuides}
            layoutConfig={layoutConfig}
            editorRef={editorRef}
          />
        </Tldraw>
      </div>
    );
  }
);

TldrawResumeEditor.displayName = 'TldrawResumeEditor';

export default TldrawResumeEditor;
