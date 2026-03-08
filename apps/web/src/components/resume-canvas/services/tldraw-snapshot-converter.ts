/**
 * tldraw Snapshot 转换器
 *
 * 负责在 CanvasResume 和 tldraw snapshot 之间进行双向转换
 */

import { createShapeId } from 'tldraw';
import type {
  CanvasResume,
  ResumePage,
  ResumeShape,
  TextShapeProps,
  SectionTitleShapeProps,
  DividerShapeProps,
  TagShapeProps,
  CardShapeProps,
  SidebarShapeProps,
  BannerShapeProps,
  IconShapeProps,
  A4_SIZE,
  DEFAULT_MARGINS,
} from '../types/canvas-resume.types';
import {
  isTextShape,
  isSectionTitleShape,
  isDividerShape,
  isTagShape,
  isCardShape,
  isSidebarShape,
  isBannerShape,
  isIconShape,
} from '../types/canvas-resume.types';

// ============== tldraw Shape 类型映射 ==============

/** tldraw 文本形状 */
interface TldrawTextShape {
  id: string;
  type: 'text';
  x: number;
  y: number;
  rotation?: number;
  index?: string;
  parentId?: string;
  isLocked?: boolean;
  props: {
    richText: string;
    color: string;
    textAlign: string;
    autoSize: boolean;
    w: number;
    size: string;
  };
}

/** tldraw 几何形状 */
interface TldrawGeoShape {
  id: string;
  type: 'geo';
  x: number;
  y: number;
  rotation?: number;
  index?: string;
  parentId?: string;
  isLocked?: boolean;
  props: {
    geo: 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'hexagon' | 'octagon' | 'rhombus-2';
    w: number;
    h: number;
    color: string;
    fill: string;
    dash: string;
    size: string;
  };
}

/** tldraw 形状联合类型 */
type TldrawShape = TldrawTextShape | TldrawGeoShape;

/** tldraw 页面 */
interface TldrawPage {
  id: string;
  name: string;
  index: string;
  shapes: Record<string, TldrawShape>;
}

/** tldraw 文档 */
interface TldrawDocument {
  type: 'document';
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  currentPageId: string;
  pages: Record<string, TldrawPage>;
}

/** tldraw 快照 */
interface TldrawSnapshot {
  document: TldrawDocument;
  session?: unknown;
  store?: unknown;
}

// ============== 颜色映射 ==============

/** tldraw 颜色值映射 */
const COLOR_MAP: Record<string, string> = {
  black: 'black',
  grey: 'grey',
  'light-blue': 'light-blue',
  'light-green': 'light-green',
  'light-red': 'light-red',
  blue: 'blue',
  green: 'green',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  purple: 'purple',
  violet: 'violet',
};

/** 字体大小映射 */
const SIZE_MAP: Record<string, string> = {
  xs: 'xs',
  s: 's',
  m: 'm',
  l: 'l',
  xl: 'xl',
};

/** 文本对齐映射 */
const ALIGN_MAP: Record<string, string> = {
  start: 'start',
  middle: 'middle',
  end: 'end',
};

// ============== 转换器类 ==============

/**
 * tldraw Snapshot 转换器
 */
export class TldrawSnapshotConverter {
  /**
   * 将 CanvasResume 转换为 tldraw snapshot
   */
  toTldrawSnapshot(resume: CanvasResume): TldrawSnapshot {
    const documentId = `doc:${resume.id}`;
    const pages: Record<string, TldrawPage> = {};

    // 转换每一页
    resume.pages.forEach((page, index) => {
      const pageId = `page:${page.id}`;
      const shapes: Record<string, TldrawShape> = {};

      // 添加页面背景（A4 白色纸张）
      const bgShape = this.createPageBackground(page);
      shapes[bgShape.id] = bgShape;

      // 转换所有形状
      page.shapes.forEach((shape) => {
        const tldrawShapes = this.convertShape(shape);
        tldrawShapes.forEach((ts) => {
          shapes[ts.id] = ts;
        });
      });

      pages[pageId] = {
        id: pageId,
        name: `Page ${page.pageNumber}`,
        index: `a${index}`,
        shapes,
      };
    });

    // 构建文档
    const document: TldrawDocument = {
      type: 'document',
      id: documentId,
      name: 'Resume',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentPageId: Object.keys(pages)[0] || '',
      pages,
    };

    return { document };
  }

  /**
   * 从 tldraw snapshot 转换为 CanvasResume
   */
  fromTldrawSnapshot(
    snapshot: TldrawSnapshot,
    meta?: Partial<CanvasResume['meta']>
  ): CanvasResume | null {
    try {
      const { document } = snapshot;
      const pages: ResumePage[] = [];

      // 转换每一页
      Object.values(document.pages).forEach((page, index) => {
        const shapes: ResumeShape[] = [];

        // 转换所有形状
        Object.values(page.shapes).forEach((tldrawShape) => {
          // 跳过背景形状
          if (tldrawShape.id.startsWith('bg-')) return;

          const shape = this.convertTldrawShape(tldrawShape);
          if (shape) {
            shapes.push(shape);
          }
        });

        pages.push({
          id: page.id.replace('page:', ''),
          pageNumber: index + 1,
          width: 794,
          height: 1123,
          margins: { top: 40, right: 40, bottom: 40, left: 40 },
          shapes,
        });
      });

      return {
        id: document.id.replace('doc:', ''),
        meta: {
          templateId: 'custom',
          colorTheme: 'modern',
          layoutType: 'single-column',
          createdAt: new Date(document.createdAt).toISOString(),
          updatedAt: new Date(document.updatedAt).toISOString(),
          version: '2.0.0',
          isAIGenerated: false,
          ...meta,
        },
        pages,
      };
    } catch (error) {
      console.error('Failed to convert tldraw snapshot to CanvasResume:', error);
      return null;
    }
  }

  // ============== 私有方法：转换逻辑 ==============

  /**
   * 创建页面背景
   */
  private createPageBackground(page: ResumePage): TldrawGeoShape {
    return {
      id: `bg-${page.id}`,
      type: 'geo',
      x: 0,
      y: 0,
      props: {
        geo: 'rectangle',
        w: page.width,
        h: page.height,
        color: 'white',
        fill: 'solid',
        dash: 'draw',
        size: 'm',
      },
    };
  }

  /**
   * 将单个 ResumeShape 转换为 tldraw shapes
   * 注：一个 ResumeShape 可能需要多个 tldraw shapes（例如标签需要背景+文本）
   */
  private convertShape(shape: ResumeShape): TldrawShape[] {
    if (isTextShape(shape)) {
      return [this.convertTextShape(shape)];
    }
    if (isSectionTitleShape(shape)) {
      return this.convertSectionTitleShape(shape);
    }
    if (isDividerShape(shape)) {
      return [this.convertDividerShape(shape)];
    }
    if (isTagShape(shape)) {
      return this.convertTagShape(shape);
    }
    if (isCardShape(shape)) {
      return [this.convertCardShape(shape)];
    }
    if (isSidebarShape(shape)) {
      return [this.convertSidebarShape(shape)];
    }
    if (isBannerShape(shape)) {
      return [this.convertBannerShape(shape)];
    }
    if (isIconShape(shape)) {
      // 图标暂不支持，返回空数组
      return [];
    }

    return [];
  }

  /**
   * 转换文本形状
   */
  private convertTextShape(shape: TextShapeProps): TldrawTextShape {
    return {
      id: shape.id,
      type: 'text',
      x: shape.x,
      y: shape.y,
      rotation: 0,
      index: shape.index,
      parentId: shape.parentId,
      isLocked: shape.isLocked,
      props: {
        richText: this.toRichText(shape.text),
        color: COLOR_MAP[shape.color || 'black'] || 'black',
        textAlign: ALIGN_MAP[shape.align || 'start'] || 'start',
        autoSize: false,
        w: shape.w,
        size: SIZE_MAP[shape.size || 's'] || 's',
      },
    };
  }

  /**
   * 转换区块标题形状
   */
  private convertSectionTitleShape(shape: SectionTitleShapeProps): TldrawShape[] {
    const shapes: TldrawShape[] = [];

    // 标题文本
    shapes.push({
      id: shape.id,
      type: 'text',
      x: shape.x,
      y: shape.y,
      props: {
        richText: this.toRichText(shape.text.toUpperCase()),
        color: COLOR_MAP[shape.accentColor || 'black'] || 'black',
        textAlign: 'start',
        autoSize: false,
        w: shape.w,
        size: SIZE_MAP[shape.size || 'm'] || 'm',
      },
    });

    // 装饰线
    if (shape.decoration === 'underline') {
      shapes.push({
        id: `${shape.id}-line`,
        type: 'geo',
        x: shape.x,
        y: shape.y + 20,
        props: {
          geo: 'rectangle',
          w: shape.w,
          h: 2,
          color: COLOR_MAP[shape.accentColor || 'blue'] || 'blue',
          fill: 'solid',
          dash: 'solid',
          size: 's',
        },
      });
    } else if (shape.decoration === 'left-bar') {
      shapes.push({
        id: `${shape.id}-bar`,
        type: 'geo',
        x: shape.x - 8,
        y: shape.y,
        props: {
          geo: 'rectangle',
          w: 3,
          h: shape.h,
          color: COLOR_MAP[shape.accentColor || 'blue'] || 'blue',
          fill: 'solid',
          dash: 'solid',
          size: 's',
        },
      });
    }

    return shapes;
  }

  /**
   * 转换分割线形状
   */
  private convertDividerShape(shape: DividerShapeProps): TldrawGeoShape {
    return {
      id: shape.id,
      type: 'geo',
      x: shape.x,
      y: shape.y,
      props: {
        geo: 'rectangle',
        w: shape.w,
        h: shape.thickness || 1,
        color: COLOR_MAP[shape.color || 'grey'] || 'grey',
        fill: 'solid',
        dash: shape.style || 'solid',
        size: 's',
      },
    };
  }

  /**
   * 转换标签形状
   */
  private convertTagShape(shape: TagShapeProps): TldrawShape[] {
    const shapes: TldrawShape[] = [];

    // 标签背景
    shapes.push({
      id: `${shape.id}-bg`,
      type: 'geo',
      x: shape.x,
      y: shape.y,
      props: {
        geo: 'rectangle',
        w: shape.w,
        h: shape.h,
        color: shape.matched
          ? 'blue'
          : COLOR_MAP[shape.backgroundColor || 'light-blue'] || 'light-blue',
        fill: shape.matched ? 'semi' : 'solid',
        dash: 'draw',
        size: 's',
      },
    });

    // 标签文本
    shapes.push({
      id: shape.id,
      type: 'text',
      x: shape.x + 6,
      y: shape.y + 4,
      props: {
        richText: this.toRichText(shape.text),
        color: shape.matched ? 'blue' : COLOR_MAP[shape.textColor || 'black'] || 'black',
        textAlign: 'start',
        autoSize: true,
        w: shape.w - 12,
        size: 's',
      },
    });

    return shapes;
  }

  /**
   * 转换卡片形状
   */
  private convertCardShape(shape: CardShapeProps): TldrawGeoShape {
    return {
      id: shape.id,
      type: 'geo',
      x: shape.x,
      y: shape.y,
      props: {
        geo: 'rectangle',
        w: shape.w,
        h: shape.h,
        color: COLOR_MAP[shape.stroke || 'grey'] || 'grey',
        fill: COLOR_MAP[shape.fill || 'white'] || 'white',
        dash: 'draw',
        size: 's',
      },
    };
  }

  /**
   * 转换侧边栏形状
   */
  private convertSidebarShape(shape: SidebarShapeProps): TldrawGeoShape {
    return {
      id: shape.id,
      type: 'geo',
      x: shape.x,
      y: shape.y,
      props: {
        geo: 'rectangle',
        w: shape.w,
        h: shape.h,
        color: COLOR_MAP[shape.fill] || 'light-blue',
        fill: 'solid',
        dash: 'draw',
        size: 'm',
      },
    };
  }

  /**
   * 转换横幅形状
   */
  private convertBannerShape(shape: BannerShapeProps): TldrawGeoShape {
    return {
      id: shape.id,
      type: 'geo',
      x: shape.x,
      y: shape.y,
      props: {
        geo: 'rectangle',
        w: shape.w,
        h: shape.h,
        color: COLOR_MAP[shape.primaryColor] || 'blue',
        fill: shape.decoration === 'gradient' ? 'semi' : 'solid',
        dash: 'draw',
        size: 'm',
      },
    };
  }

  /**
   * 将 tldraw shape 转换为 ResumeShape
   */
  private convertTldrawShape(tldrawShape: TldrawShape): ResumeShape | null {
    if (tldrawShape.type === 'text') {
      return {
        id: tldrawShape.id,
        type: 'text',
        text: this.fromRichText(tldrawShape.props.richText),
        x: tldrawShape.x,
        y: tldrawShape.y,
        w: tldrawShape.props.w,
        h: 24,
        size: tldrawShape.props.size as TextShapeProps['size'],
        color: tldrawShape.props.color as TextShapeProps['color'],
        align: tldrawShape.props.textAlign as TextShapeProps['align'],
      };
    }

    // 其他形状的转换逻辑可以按需添加
    return null;
  }

  /**
   * 将纯文本转换为 tldraw 富文本格式
   */
  private toRichText(text: string): string {
    // tldraw 使用简单的富文本格式
    // 这里直接返回纯文本，实际使用时可以支持更多格式
    return text;
  }

  /**
   * 从 tldraw 富文本格式提取纯文本
   */
  private fromRichText(richText: string): string {
    // 简单提取纯文本
    return richText;
  }
}

// ============== 单例导出 ==============

/** 默认转换器实例 */
export const snapshotConverter = new TldrawSnapshotConverter();

// ============== 便捷函数 ==============

/**
 * 将 CanvasResume 转换为 tldraw snapshot
 */
export function toTldrawSnapshot(resume: CanvasResume): TldrawSnapshot {
  return snapshotConverter.toTldrawSnapshot(resume);
}

/**
 * 从 tldraw snapshot 转换为 CanvasResume
 */
export function fromTldrawSnapshot(
  snapshot: TldrawSnapshot,
  meta?: Partial<CanvasResume['meta']>
): CanvasResume | null {
  return snapshotConverter.fromTldrawSnapshot(snapshot, meta);
}
