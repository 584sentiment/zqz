/**
 * 简历渲染服务
 *
 * 负责将简历数据渲染到 tldraw 编辑器
 * 集成 TemplateRenderer 和 TldrawSnapshotConverter
 */

import { createShapeId, toRichText, type TLShape, type TLShapeId } from 'tldraw';
import type {
  LayoutResume,
  ColorTheme,
  ResumeLayoutBlock,
  ResumeLayoutConfig,
  ResumeHeaderContent,
  ResumeSummaryContent,
  ResumeExperienceContent,
  ResumeSkillContent,
  ResumeProjectContent,
  ResumeEducationContent,
} from '@ai-job-assistant/shared';
import {
  type CanvasResume,
  type ResumePage,
  type ResumeShape,
  type TextShapeProps,
  type SectionTitleShapeProps,
  type DividerShapeProps,
  type TagShapeProps,
  type CardShapeProps,
  type SidebarShapeProps,
  type BannerShapeProps,
  A4_SIZE,
  DEFAULT_MARGINS,
  CONTENT_WIDTH,
  isTextShape,
  isSectionTitleShape,
  isDividerShape,
  isTagShape,
  isCardShape,
  isSidebarShape,
  isBannerShape,
} from '../types/canvas-resume.types';
import { TemplateRenderer } from './template-renderer';
import type { ResumeTemplate } from '../types/template.types';

// ============== 常量定义 ==============

/** A4 尺寸（像素，96 DPI） */
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

/** 页边距 */
const PAGE_MARGINS = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
};

/** 内容区域宽度 */
const CONTENT_WIDTH_VALUE = A4_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right;

// ============== 主题配置 ==============

interface ThemeConfig {
  primary: string;
  secondary: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  background: {
    primary: string;
    secondary: string;
  };
  border: {
    light: string;
    medium: string;
  };
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

const THEME_CONFIGS: Record<ColorTheme, ThemeConfig> = {
  modern: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    text: { primary: '#0f172a', secondary: '#475569', muted: '#94a3b8' },
    background: { primary: '#ffffff', secondary: '#f8fafc' },
    border: { light: '#e2e8f0', medium: '#cbd5e1' },
    skillTag: {
      matched: { background: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
      normal: { background: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
    },
  },
  classic: {
    primary: '#1f2937',
    secondary: '#374151',
    text: { primary: '#111827', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#f9fafb' },
    border: { light: '#e5e7eb', medium: '#d1d5db' },
    skillTag: {
      matched: { background: '#e5e7eb', text: '#111827', border: '#9ca3af' },
      normal: { background: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
    },
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    text: { primary: '#1f2937', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#faf5ff' },
    border: { light: '#e9d5ff', medium: '#d8b4fe' },
    skillTag: {
      matched: { background: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
      normal: { background: '#f3e8ff', text: '#6b7280', border: '#e9d5ff' },
    },
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    text: { primary: '#18181b', secondary: '#52525b', muted: '#a1a1aa' },
    background: { primary: '#ffffff', secondary: '#fafafa' },
    border: { light: '#e4e4e7', medium: '#d4d4d8' },
    skillTag: {
      matched: { background: '#27272a', text: '#ffffff', border: '#52525b' },
      normal: { background: '#f4f4f5', text: '#3f3f46', border: '#e4e4e7' },
    },
  },
  executive: {
    primary: '#0f766e',
    secondary: '#14b8a6',
    text: { primary: '#134e4a', secondary: '#0f766e', muted: '#5eead4' },
    background: { primary: '#ffffff', secondary: '#f0fdfa' },
    border: { light: '#99f6e4', medium: '#5eead4' },
    skillTag: {
      matched: { background: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
      normal: { background: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
    },
  },
};

// ============== tldraw Shape 创建器 ==============

/**
 * 创建 tldraw 文本形状
 */
function createTldrawTextShape(
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
): TLShape {
  const { w = CONTENT_WIDTH_VALUE, size = 's', color = 'black', align = 'start' } = options || {};

  return {
    id: createShapeId(id) as unknown as TLShapeId,
    type: 'text',
    x,
    y,
    rotation: 0,
    index: 'a0',
    parentId: 'page:page',
    isLocked: false,
    props: {
      richText: toRichText(text),
      color,
      textAlign: align,
      autoSize: false,
      w,
      size,
    },
    typeName: 'shape',
    meta: {},
  } as unknown as TLShape;
}

/**
 * 创建 tldraw 几何形状
 */
function createTldrawGeoShape(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: {
    color?: 'black' | 'grey' | 'blue' | 'light-blue' | 'white';
    fill?: 'solid' | 'semi' | 'none';
    dash?: 'solid' | 'dashed' | 'draw';
  }
): TLShape {
  const { color = 'grey', fill = 'solid', dash = 'solid' } = options || {};

  return {
    id: createShapeId(id) as unknown as TLShapeId,
    type: 'geo',
    x,
    y,
    rotation: 0,
    index: 'a0',
    parentId: 'page:page',
    isLocked: false,
    props: {
      geo: 'rectangle',
      w,
      h,
      color,
      fill,
      dash,
      size: 's',
    },
    typeName: 'shape',
    meta: {},
  } as unknown as TLShape;
}

/**
 * 将 ResumeShape 转换为 tldraw shapes
 */
function convertResumeShapeToTldraw(shape: ResumeShape): TLShape[] {
  const shapes: TLShape[] = [];

  if (isTextShape(shape)) {
    shapes.push(
      createTldrawTextShape(shape.id, shape.text, shape.x, shape.y, {
        w: shape.w,
        size: shape.size,
        color: (shape.color as 'black' | 'grey' | 'blue' | 'light-blue') || 'black',
        align: shape.align,
      })
    );
  } else if (isSectionTitleShape(shape)) {
    // 标题文本
    shapes.push(
      createTldrawTextShape(shape.id, shape.text.toUpperCase(), shape.x, shape.y, {
        w: shape.w,
        size: shape.size || 'm',
        color: (shape.accentColor as 'black' | 'grey' | 'blue') || 'black',
      })
    );

    // 装饰线
    if (shape.decoration === 'underline') {
      shapes.push(
        createTldrawGeoShape(`${shape.id}-line`, shape.x, shape.y + 20, shape.w, 2, {
          color: (shape.accentColor as 'black' | 'grey' | 'blue') || 'blue',
          fill: 'solid',
        })
      );
    } else if (shape.decoration === 'left-bar') {
      shapes.push(
        createTldrawGeoShape(`${shape.id}-bar`, shape.x - 8, shape.y, 3, shape.h, {
          color: (shape.accentColor as 'black' | 'grey' | 'blue') || 'blue',
          fill: 'solid',
        })
      );
    }
  } else if (isDividerShape(shape)) {
    shapes.push(
      createTldrawGeoShape(shape.id, shape.x, shape.y, shape.w, shape.thickness || 1, {
        color: (shape.color as 'black' | 'grey' | 'blue') || 'grey',
        fill: 'solid',
        dash: shape.style === 'dashed' ? 'dashed' : 'solid',
      })
    );
  } else if (isTagShape(shape)) {
    // 标签背景
    shapes.push(
      createTldrawGeoShape(`${shape.id}-bg`, shape.x, shape.y, shape.w, shape.h, {
        color: shape.matched ? 'blue' : 'grey',
        fill: shape.matched ? 'semi' : 'solid',
        dash: 'draw',
      })
    );

    // 标签文本
    shapes.push(
      createTldrawTextShape(shape.id, shape.text, shape.x + 6, shape.y + 5, {
        w: shape.w - 12,
        size: 's',
        color: shape.matched ? 'blue' : 'black',
      })
    );
  } else if (isCardShape(shape)) {
    shapes.push(
      createTldrawGeoShape(shape.id, shape.x, shape.y, shape.w, shape.h, {
        color: (shape.stroke as 'black' | 'grey' | 'blue') || 'grey',
        fill: (shape.fill as 'solid' | 'semi' | 'none') || 'solid',
        dash: 'draw',
      })
    );
  } else if (isSidebarShape(shape)) {
    shapes.push(
      createTldrawGeoShape(shape.id, shape.x, shape.y, shape.w, shape.h, {
        color: (shape.fill as 'black' | 'grey' | 'blue' | 'light-blue') || 'light-blue',
        fill: 'solid',
      })
    );
  } else if (isBannerShape(shape)) {
    shapes.push(
      createTldrawGeoShape(shape.id, shape.x, shape.y, shape.w, shape.h, {
        color: (shape.primaryColor as 'black' | 'grey' | 'blue') || 'blue',
        fill: shape.decoration === 'gradient' ? 'semi' : 'solid',
      })
    );
  }

  return shapes;
}

// ============== ResumeRenderer 类 ==============

/**
 * 简历渲染器
 *
 * 负责将简历数据渲染到 tldraw 编辑器
 */
export class ResumeRenderer {
  private template: ResumeTemplate | null = null;

  constructor(template?: ResumeTemplate) {
    this.template = template || null;
  }

  /**
   * 设置模板
   */
  setTemplate(template: ResumeTemplate): void {
    this.template = template;
  }

  /**
   * 渲染 LayoutResume 到 tldraw shapes
   */
  renderLayoutResume(
    layoutResume: LayoutResume,
    theme: ColorTheme,
    showMarginGuides: boolean
  ): TLShape[] {
    const shapes: TLShape[] = [];

    // 如果有模板，使用 TemplateRenderer
    if (this.template) {
      const renderer = new TemplateRenderer(this.template);
      const canvasResume = renderer.render(layoutResume);
      return this.renderCanvasResume(canvasResume, showMarginGuides);
    }

    // 否则直接渲染（兼容旧逻辑）
    return this.renderLayoutResumeDirect(layoutResume, theme, showMarginGuides);
  }

  /**
   * 渲染 CanvasResume 到 tldraw shapes
   */
  renderCanvasResume(resume: CanvasResume, showMarginGuides: boolean): TLShape[] {
    const shapes: TLShape[] = [];

    // 渲染每一页
    for (const page of resume.pages) {
      // 页面背景
      shapes.push(this.createPageBackground(page, showMarginGuides));

      // 渲染所有 shapes
      for (const shape of page.shapes) {
        shapes.push(...convertResumeShapeToTldraw(shape));
      }
    }

    return shapes;
  }

  /**
   * 直接渲染 LayoutResume（不使用 TemplateRenderer）
   */
  private renderLayoutResumeDirect(
    layoutResume: LayoutResume,
    theme: ColorTheme,
    showMarginGuides: boolean
  ): TLShape[] {
    const shapes: TLShape[] = [];
    const themeConfig = THEME_CONFIGS[theme];

    // 创建页面背景
    shapes.push(this.createA4Background(showMarginGuides));

    // 渲染区块
    let y = PAGE_MARGINS.top;
    const x = PAGE_MARGINS.left;

    const sectionOrder = layoutResume.layoutConfig?.sectionOrder;
    const blocks = sectionOrder
      ? sectionOrder
          .map((id) => layoutResume.blocks.find((b) => b.id === id))
          .filter((b): b is ResumeLayoutBlock => b !== undefined)
      : layoutResume.blocks;

    for (const block of blocks) {
      const blockShapes = this.renderBlock(block, x, y, CONTENT_WIDTH_VALUE, themeConfig);
      shapes.push(...blockShapes.shapes);
      y = blockShapes.nextY + 24; // sectionGap
    }

    return shapes;
  }

  /**
   * 渲染单个区块
   */
  private renderBlock(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    let currentY = y;

    switch (block.type) {
      case 'header':
        return this.renderHeader(block, x, y, width, theme);
      case 'summary':
        shapes.push(...this.createSectionHeader(block.title || '个人简介', x, currentY, width));
        currentY += 28;
        const summaryResult = this.renderSummary(block, x, currentY, width, theme);
        shapes.push(...summaryResult.shapes);
        return { shapes, nextY: summaryResult.nextY };
      case 'experience':
        shapes.push(...this.createSectionHeader(block.title || '工作经历', x, currentY, width));
        currentY += 32;
        const expResult = this.renderExperience(block, x, currentY, width, theme);
        shapes.push(...expResult.shapes);
        return { shapes, nextY: expResult.nextY };
      case 'skills':
        shapes.push(...this.createSectionHeader(block.title || '专业技能', x, currentY, width));
        currentY += 28;
        const skillResult = this.renderSkills(block, x, currentY, width, theme);
        shapes.push(...skillResult.shapes);
        return { shapes, nextY: skillResult.nextY };
      case 'projects':
        shapes.push(...this.createSectionHeader(block.title || '项目经历', x, currentY, width));
        currentY += 32;
        const projResult = this.renderProjects(block, x, currentY, width, theme);
        shapes.push(...projResult.shapes);
        return { shapes, nextY: projResult.nextY };
      case 'education':
        shapes.push(...this.createSectionHeader(block.title || '教育背景', x, currentY, width));
        currentY += 32;
        const eduResult = this.renderEducation(block, x, currentY, width, theme);
        shapes.push(...eduResult.shapes);
        return { shapes, nextY: eduResult.nextY };
      default:
        return { shapes, nextY: y };
    }
  }

  /**
   * 创建页面背景
   */
  private createPageBackground(page: ResumePage, showMarginGuides: boolean): TLShape {
    const shapes: TLShape[] = [];

    // 阴影层
    shapes.push(
      createTldrawGeoShape('bg-shadow', 4, 4, page.width, page.height, {
        color: 'grey',
        fill: 'semi',
        dash: 'draw',
      })
    );

    // 白色背景
    shapes.push(
      createTldrawGeoShape('bg-white', 0, 0, page.width, page.height, {
        color: 'white',
        fill: 'solid',
      })
    );

    return shapes[1]; // 返回白色背景
  }

  /**
   * 创建 A4 背景
   */
  private createA4Background(showMarginGuides: boolean): TLShape {
    // 阴影层
    const shadowShape = createTldrawGeoShape('bg-shadow', 4, 4, A4_WIDTH, A4_HEIGHT, {
      color: 'grey',
      fill: 'semi',
      dash: 'draw',
    });

    // 白色背景
    const bgShape = createTldrawGeoShape('bg-white', 0, 0, A4_WIDTH, A4_HEIGHT, {
      color: 'white',
      fill: 'solid',
    });

    return bgShape;
  }

  /**
   * 创建区块标题
   */
  private createSectionHeader(title: string, x: number, y: number, width: number): TLShape[] {
    const shapes: TLShape[] = [];

    // 标题文本
    shapes.push(
      createTldrawTextShape(`section-${title}`, title.toUpperCase(), x, y, {
        w: width,
        size: 'm',
        color: 'black',
      })
    );

    // 下划线
    shapes.push(
      createTldrawGeoShape(`section-${title}-line`, x, y + 20, width, 2, {
        color: 'blue',
        fill: 'solid',
      })
    );

    return shapes;
  }

  /**
   * 渲染头部区块
   */
  private renderHeader(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    const content = block.content as ResumeHeaderContent;
    let currentY = y;

    // 姓名
    shapes.push(
      createTldrawTextShape('header-name', content.name || '未命名', x, currentY, {
        w: width,
        size: 'xl',
        color: 'black',
        align: 'middle',
      })
    );
    currentY += 30;

    // 求职意向
    if (content.targetPosition) {
      shapes.push(
        createTldrawTextShape('header-position', content.targetPosition, x, currentY, {
          w: width,
          size: 'm',
          color: 'grey',
          align: 'middle',
        })
      );
      currentY += 20;
    }

    // 联系方式
    const contactParts: string[] = [];
    if (content.email) contactParts.push(content.email);
    if (content.phone) contactParts.push(content.phone);
    if (content.location) contactParts.push(content.location);

    if (contactParts.length > 0) {
      shapes.push(
        createTldrawTextShape('header-contact', contactParts.join('    •    '), x, currentY, {
          w: width,
          size: 's',
          color: 'grey',
          align: 'middle',
        })
      );
      currentY += 16;
    }

    // 链接
    if (content.links && content.links.length > 0) {
      const linkParts = content.links.map((link) => link.label || link.url);
      shapes.push(
        createTldrawTextShape('header-links', linkParts.join('  |  '), x, currentY, {
          w: width,
          size: 's',
          color: 'blue',
          align: 'middle',
        })
      );
      currentY += 16;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 渲染简介区块
   */
  private renderSummary(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    const content = block.content as ResumeSummaryContent;
    let currentY = y;

    // 简介文本
    shapes.push(
      createTldrawTextShape('summary-text', content.summary, x, currentY, {
        w: width,
        size: 's',
      })
    );
    currentY += 60;

    // 核心优势
    if (content.coreStrengths && content.coreStrengths.length > 0) {
      const tagsResult = this.renderTags(
        content.coreStrengths.map((s) => ({ name: s, matched: true })),
        x,
        currentY,
        width
      );
      shapes.push(...tagsResult.shapes);
      currentY = tagsResult.nextY;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 渲染工作经历区块
   */
  private renderExperience(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    const content = block.content as ResumeExperienceContent;
    let currentY = y;
    const indentX = x + 12;

    for (let i = 0; i < content.items.length; i++) {
      const item = content.items[i];
      const startY = currentY;

      // 职位
      shapes.push(
        createTldrawTextShape(`exp-${i}-pos`, item.position, x, currentY, {
          w: width,
          size: 'm',
          color: 'black',
        })
      );
      currentY += 18;

      // 公司 | 时间 | 地点
      const period = this.formatPeriod(item.startDate, item.endDate, item.current);
      const metaParts = [item.company, period, item.location].filter(Boolean);
      shapes.push(
        createTldrawTextShape(`exp-${i}-meta`, metaParts.join('  |  '), x, currentY, {
          w: width,
          size: 's',
          color: 'grey',
        })
      );
      currentY += 16;

      // 成就列表
      const achievements = item.achievements ?? [];
      const starResults =
        item.starHighlights?.map((h) => h.result).filter((r): r is string => r !== undefined) ?? [];
      const allAchievements = [...achievements, ...starResults];

      for (const achievement of allAchievements) {
        shapes.push(
          createTldrawTextShape(
            `exp-${i}-ach-${Math.random().toString(36).slice(2, 6)}`,
            `• ${achievement}`,
            indentX,
            currentY,
            { w: width - 12, size: 's' }
          )
        );
        currentY += 14;
      }

      // 左侧装饰线
      if (currentY - startY > 30) {
        shapes.push(
          createTldrawGeoShape(`exp-${i}-deco`, x - 8, startY + 5, 2, currentY - startY - 10, {
            color: 'blue',
            fill: 'solid',
          })
        );
      }

      currentY += 24; // itemGap
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 渲染技能区块
   */
  private renderSkills(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    const content = block.content as ResumeSkillContent;
    let currentY = y;

    if (content.displayMode === 'categorized' && content.categories) {
      for (const category of content.categories) {
        // 分类名称
        shapes.push(
          createTldrawTextShape(
            `skill-cat-${Math.random().toString(36).slice(2, 6)}`,
            category.category,
            x,
            currentY,
            {
              w: width,
              size: 's',
              color: 'grey',
            }
          )
        );
        currentY += 16;

        // 技能标签
        const tagsResult = this.renderTags(
          category.skills.map((s) => ({ name: s.name, matched: s.isMatched })),
          x,
          currentY,
          width
        );
        shapes.push(...tagsResult.shapes);
        currentY = tagsResult.nextY + 14;
      }
    } else if (content.items) {
      const tagsResult = this.renderTags(
        content.items.map((s) => ({ name: s.name, matched: s.isMatched })),
        x,
        currentY,
        width
      );
      shapes.push(...tagsResult.shapes);
      currentY = tagsResult.nextY;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 渲染项目区块
   */
  private renderProjects(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    const content = block.content as ResumeProjectContent;
    let currentY = y;
    const indentX = x + 12;

    for (let i = 0; i < content.items.length; i++) {
      const project = content.items[i];

      // 项目名称
      shapes.push(
        createTldrawTextShape(`proj-${i}-name`, project.name, x, currentY, {
          w: width,
          size: 'm',
          color: 'black',
        })
      );
      currentY += 18;

      // 角色 | 时间
      const period = this.formatPeriod(project.startDate, project.endDate, project.ongoing);
      const roleParts = [project.role, period].filter(Boolean);
      shapes.push(
        createTldrawTextShape(`proj-${i}-meta`, roleParts.join('  |  '), x, currentY, {
          w: width,
          size: 's',
          color: 'grey',
        })
      );
      currentY += 16;

      // 技术栈
      if (project.technologies && project.technologies.length > 0) {
        const tagsResult = this.renderTags(
          project.technologies.map((t) => ({ name: t, matched: false })),
          x,
          currentY,
          width
        );
        shapes.push(...tagsResult.shapes);
        currentY = tagsResult.nextY + 10;
      }

      // 成就列表
      for (const achievement of project.achievements) {
        shapes.push(
          createTldrawTextShape(
            `proj-${i}-ach-${Math.random().toString(36).slice(2, 6)}`,
            `• ${achievement}`,
            indentX,
            currentY,
            { w: width - 12, size: 's' }
          )
        );
        currentY += 14;
      }

      currentY += 24; // itemGap
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 渲染教育区块
   */
  private renderEducation(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    width: number,
    theme: ThemeConfig
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    const content = block.content as ResumeEducationContent;
    let currentY = y;

    for (let i = 0; i < content.items.length; i++) {
      const edu = content.items[i];

      // 学校
      shapes.push(
        createTldrawTextShape(`edu-${i}-school`, edu.school, x, currentY, {
          w: width,
          size: 'm',
          color: 'black',
        })
      );
      currentY += 18;

      // 专业 | 学位 | 时间 | GPA
      const period = this.formatPeriod(edu.startDate, edu.endDate);
      const detailParts = [
        `${edu.major} · ${edu.degree}`,
        period,
        edu.gpa ? `GPA: ${edu.gpa}` : null,
      ].filter(Boolean);
      shapes.push(
        createTldrawTextShape(`edu-${i}-detail`, detailParts.join('  |  '), x, currentY, {
          w: width,
          size: 's',
          color: 'grey',
        })
      );
      currentY += 20;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 渲染标签
   */
  private renderTags(
    tags: Array<{ name: string; matched?: boolean }>,
    x: number,
    y: number,
    maxWidth: number
  ): { shapes: TLShape[]; nextY: number } {
    const shapes: TLShape[] = [];
    let currentX = x;
    let currentY = y;
    let maxHeightInRow = 0;
    const tagHeight = 24;
    const tagGap = 8;

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const textWidth = this.estimateTextWidth(tag.name, 9);
      const tagWidth = textWidth + 24;

      // 检查换行
      if (currentX + tagWidth > x + maxWidth && currentX > x) {
        currentX = x;
        currentY += maxHeightInRow + tagGap;
        maxHeightInRow = 0;
      }

      // 标签背景
      shapes.push(
        createTldrawGeoShape(`tag-${i}-bg`, currentX, currentY, tagWidth, tagHeight, {
          color: tag.matched ? 'blue' : 'grey',
          fill: tag.matched ? 'semi' : 'solid',
          dash: 'draw',
        })
      );

      // 标签文本
      shapes.push(
        createTldrawTextShape(`tag-${i}-text`, tag.name, currentX + 6, currentY + 5, {
          w: tagWidth - 12,
          size: 's',
          color: tag.matched ? 'blue' : 'black',
        })
      );

      currentX += tagWidth + tagGap;
      maxHeightInRow = Math.max(maxHeightInRow, tagHeight);
    }

    return { shapes, nextY: currentY + maxHeightInRow };
  }

  /**
   * 估算文本宽度
   */
  private estimateTextWidth(text: string, fontSize: number): number {
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
  private formatPeriod(startDate: string, endDate?: string, current?: boolean): string {
    const start = startDate || '';
    const end = current ? '至今' : endDate || '';
    if (start && end) return `${start} - ${end}`;
    return start || end;
  }
}

// ============== 导出 ==============

export const resumeRenderer = new ResumeRenderer();

export function createResumeRenderer(template?: ResumeTemplate): ResumeRenderer {
  return new ResumeRenderer(template);
}
