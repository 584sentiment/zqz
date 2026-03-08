/**
 * 形状辅助函数
 *
 * 提供创建简历形状的便捷方法
 */

import { createShapeId, toRichText, type TLShapeId } from 'tldraw';

// ============== 常量 ==============

/** A4 尺寸 */
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

/** 页边距 */
export const PAGE_MARGINS = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
};

/** 内容区域宽度 */
export const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right;

// ============== 颜色主题 ==============

export const THEME_COLORS = {
  modern: {
    primary: '#1e40af',
    text: '#0f172a',
    muted: '#64748b',
    tag: '#eff6ff',
    tagMatched: '#dcfce7',
  },
  classic: {
    primary: '#1f2937',
    text: '#111827',
    muted: '#6b7280',
    tag: '#f3f4f6',
    tagMatched: '#e5e7eb',
  },
  creative: {
    primary: '#7c3aed',
    text: '#1f2937',
    muted: '#6b7280',
    tag: '#f3e8ff',
    tagMatched: '#ede9fe',
  },
  minimal: {
    primary: '#18181b',
    text: '#18181b',
    muted: '#71717a',
    tag: '#f4f4f5',
    tagMatched: '#27272a',
  },
  executive: {
    primary: '#0f766e',
    text: '#134e4a',
    muted: '#5eead4',
    tag: '#ccfbf1',
    tagMatched: '#99f6e4',
  },
} as const;

// ============== 形状创建辅助函数 ==============

/**
 * 创建文本形状
 */
export function createTextShape(
  id: string,
  text: string,
  x: number,
  y: number,
  options?: {
    w?: number;
    size?: 'xs' | 's' | 'm' | 'l' | 'xl';
    color?: 'black' | 'grey' | 'blue' | 'light-blue';
    align?: 'start' | 'middle' | 'end';
  }
) {
  const { w = CONTENT_WIDTH, size = 's', color = 'black', align = 'start' } = options || {};

  return {
    id: createShapeId(id),
    type: 'text' as const,
    x,
    y,
    props: {
      richText: toRichText(text),
      color,
      textAlign: align,
      autoSize: false,
      w,
      size,
    },
  };
}

/**
 * 创建区块标题形状（带装饰）
 */
export function createSectionTitleShape(
  id: string,
  text: string,
  x: number,
  y: number,
  options?: {
    w?: number;
    color?: 'black' | 'grey' | 'blue';
    decoration?: 'underline' | 'left-bar' | 'none';
  }
) {
  const { w = CONTENT_WIDTH, color = 'blue', decoration = 'underline' } = options || {};

  const shapes: any[] = [];

  // 标题文本
  shapes.push({
    id: createShapeId(`${id}-text`),
    type: 'text' as const,
    x,
    y,
    props: {
      richText: toRichText(text.toUpperCase()),
      color,
      textAlign: 'start',
      autoSize: false,
      w,
      size: 'm',
    },
  });

  // 装饰线
  if (decoration === 'underline') {
    shapes.push({
      id: createShapeId(`${id}-line`),
      type: 'geo' as const,
      x,
      y: y + 20,
      props: {
        geo: 'rectangle',
        w,
        h: 2,
        color,
        fill: 'solid',
        dash: 'solid',
        size: 's',
      },
    });
  } else if (decoration === 'left-bar') {
    shapes.push({
      id: createShapeId(`${id}-bar`),
      type: 'geo' as const,
      x: x - 8,
      y,
      props: {
        geo: 'rectangle',
        w: 3,
        h: 24,
        color,
        fill: 'solid',
        dash: 'solid',
        size: 's',
      },
    });
  }

  return shapes;
}

/**
 * 创建技能标签形状
 */
export function createSkillTagsShapes(
  idPrefix: string,
  skills: Array<{ name: string; matched?: boolean }>,
  startX: number,
  startY: number,
  options?: {
    maxWidth?: number;
    tagHeight?: number;
    gap?: number;
    borderRadius?: number;
  }
) {
  const { maxWidth = CONTENT_WIDTH, tagHeight = 24, gap = 8, borderRadius = 12 } = options || {};

  const shapes: any[] = [];
  let currentX = startX;
  let currentY = startY;
  let maxHeightInRow = 0;

  skills.forEach((skill, index) => {
    // 估算标签宽度
    const textWidth = estimateTextWidth(skill.name, 9);
    const tagWidth = textWidth + 24;

    // 检查是否需要换行
    if (currentX + tagWidth > startX + maxWidth && currentX > startX) {
      currentX = startX;
      currentY += maxHeightInRow + gap;
      maxHeightInRow = 0;
    }

    // 标签背景
    shapes.push({
      id: createShapeId(`${idPrefix}-tag-${index}-bg`),
      type: 'geo' as const,
      x: currentX,
      y: currentY,
      props: {
        geo: 'rectangle',
        w: tagWidth,
        h: tagHeight,
        color: skill.matched ? 'blue' : 'grey',
        fill: skill.matched ? 'semi' : 'solid',
        dash: 'draw',
        size: 's',
      },
    });

    // 标签文本
    shapes.push({
      id: createShapeId(`${idPrefix}-tag-${index}-text`),
      type: 'text' as const,
      x: currentX + 6,
      y: currentY + 5,
      props: {
        richText: toRichText(skill.name),
        color: skill.matched ? 'blue' : 'black',
        textAlign: 'start',
        autoSize: true,
        w: tagWidth - 12,
        size: 's',
      },
    });

    currentX += tagWidth + gap;
    maxHeightInRow = Math.max(maxHeightInRow, tagHeight);
  });

  return { shapes, bottomY: currentY + maxHeightInRow };
}

/**
 * 创建分割线形状
 */
export function createDividerShape(
  id: string,
  x: number,
  y: number,
  options?: {
    w?: number;
    color?: 'black' | 'grey' | 'blue';
    thickness?: number;
    style?: 'solid' | 'dashed';
  }
) {
  const { w = CONTENT_WIDTH, color = 'grey', thickness = 1, style = 'solid' } = options || {};

  return {
    id: createShapeId(id),
    type: 'geo' as const,
    x,
    y,
    props: {
      geo: 'rectangle',
      w,
      h: thickness,
      color,
      fill: 'solid',
      dash: style,
      size: 's',
    },
  };
}

/**
 * 创建装饰竖线
 */
export function createDecorLineShape(
  id: string,
  x: number,
  y: number,
  height: number,
  options?: {
    color?: 'black' | 'grey' | 'blue';
    thickness?: number;
  }
) {
  const { color = 'blue', thickness = 2 } = options || {};

  return {
    id: createShapeId(id),
    type: 'geo' as const,
    x,
    y,
    props: {
      geo: 'rectangle',
      w: thickness,
      h: height,
      color,
      fill: 'solid',
      dash: 'solid',
      size: 's',
    },
  };
}

// ============== 辅助函数 ==============

/**
 * 估算文本宽度
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
      width += fontSize * 1.0;
    } else {
      width += fontSize * 0.6;
    }
  }
  return Math.ceil(width);
}

/**
 * 格式化日期范围
 */
export function formatPeriod(startDate: string, endDate?: string, current?: boolean): string {
  const start = startDate || '';
  const end = current ? '至今' : endDate || '';
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
}
