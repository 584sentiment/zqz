/**
 * 模板渲染器
 *
 * 负责将模板配置 + 简历内容转换为 CanvasResume（shapes 集合）
 */

import type {
  LayoutResume,
  ResumeLayoutBlock,
  ResumeLayoutConfig,
  ResumeLayoutHint,
  ResumeHeaderContent,
  ResumeSummaryContent,
  ResumeExperienceContent,
  ResumeSkillContent,
  ResumeProjectContent,
  ResumeEducationContent,
  ColorTheme,
  LayoutType,
} from '@ai-job-assistant/shared';
import type { ResumeTemplate } from '../types/template.types';
import {
  type CanvasResume,
  type ResumePage,
  type ResumeShape,
  type TextShapeProps,
  type SectionTitleShapeProps,
  type DividerShapeProps,
  type TagShapeProps,
  type SidebarShapeProps,
  type BannerShapeProps,
  type LayoutContext,
  A4_SIZE,
  DEFAULT_MARGINS,
  CONTENT_WIDTH,
  createSectionTitleShape,
  createTagShape,
  createResumePage,
} from '../types/canvas-resume.types';

// ============== 常量定义 ==============

/** 行高倍数 */
const LINE_HEIGHT_MULTIPLIER = 1.6;

/** 间距配置 */
const SPACING = {
  sectionGap: 24,
  titleGap: 14,
  itemGap: 18,
  paragraphGap: 12,
  lineGap: 10,
  leftIndent: 16,
  tagGap: 8,
} as const;

// ============== 主题颜色配置 ==============

interface ThemeColors {
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
    tag: string;
    tagMatched: string;
  };
  border: string;
}

const THEME_COLORS: Record<ColorTheme, ThemeColors> = {
  modern: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    text: { primary: '#0f172a', secondary: '#475569', muted: '#94a3b8' },
    background: { primary: '#ffffff', secondary: '#f8fafc', tag: '#eff6ff', tagMatched: '#dcfce7' },
    border: '#e2e8f0',
  },
  classic: {
    primary: '#1f2937',
    secondary: '#374151',
    text: { primary: '#111827', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#f9fafb', tag: '#f3f4f6', tagMatched: '#e5e7eb' },
    border: '#d1d5db',
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    text: { primary: '#1f2937', secondary: '#4b5563', muted: '#9ca3af' },
    background: { primary: '#ffffff', secondary: '#faf5ff', tag: '#f3e8ff', tagMatched: '#ede9fe' },
    border: '#e9d5ff',
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    text: { primary: '#18181b', secondary: '#52525b', muted: '#a1a1aa' },
    background: { primary: '#ffffff', secondary: '#fafafa', tag: '#f4f4f5', tagMatched: '#27272a' },
    border: '#e4e4e7',
  },
  executive: {
    primary: '#0f766e',
    secondary: '#14b8a6',
    text: { primary: '#134e4a', secondary: '#0f766e', muted: '#5eead4' },
    background: { primary: '#ffffff', secondary: '#f0fdfa', tag: '#ccfbf1', tagMatched: '#99f6e4' },
    border: '#99f6e4',
  },
};

// ============== 辅助函数 ==============

/** 生成唯一 ID */
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 创建文本形状 */
function createTextShape(
  id: string,
  text: string,
  x: number,
  y: number,
  w: number,
  options?: {
    size?: 'xs' | 's' | 'm' | 'l' | 'xl';
    color?: 'black' | 'grey' | 'blue' | 'light-blue';
    align?: 'start' | 'middle' | 'end';
    bold?: boolean;
  }
): TextShapeProps {
  const { size = 's', color = 'black', align = 'start', bold = false } = options || {};
  return {
    id,
    type: 'text',
    text,
    x,
    y,
    w,
    h: 24,
    size,
    color,
    align,
    bold,
  };
}

/** 创建分割线形状 */
function createDividerShape(
  id: string,
  x: number,
  y: number,
  w: number,
  options?: { color?: 'black' | 'grey' | 'blue'; thickness?: number }
): DividerShapeProps {
  const { color = 'grey', thickness = 1 } = options || {};
  return {
    id,
    type: 'divider',
    x,
    y,
    w,
    h: thickness,
    color,
    style: 'solid',
  };
}

// ============== TemplateRenderer 类 ==============

/**
 * 模板渲染器
 *
 * 负责将模板配置和简历内容转换为 CanvasResume
 */
export class TemplateRenderer {
  private template: ResumeTemplate;
  private colors: ThemeColors;

  constructor(template: ResumeTemplate) {
    this.template = template;
    const colorTheme = (template.styles.colors.primary as ColorTheme) || 'modern';
    this.colors = THEME_COLORS[colorTheme] || THEME_COLORS.modern;
  }

  /**
   * 渲染简历
   */
  render(layoutResume: LayoutResume): CanvasResume {
    const layoutConfig = layoutResume.layoutConfig;
    const layoutType =
      layoutConfig?.layoutType || this.template.layout.layoutType || 'single-column';

    // 初始化
    const pages: ResumePage[] = [];
    let currentPage = createResumePage(`page-1`, 1);
    let context: LayoutContext = {
      currentY: DEFAULT_MARGINS.top,
      currentPage: 1,
      contentWidth: CONTENT_WIDTH,
      contentX: DEFAULT_MARGINS.left,
      maxY: A4_SIZE.height - DEFAULT_MARGINS.bottom,
      theme: (layoutConfig?.colorTheme as ColorTheme) || 'modern',
      layoutConfig,
    };

    // 根据布局类型渲染
    switch (layoutType) {
      case 'left-sidebar':
        this.renderWithSidebar(layoutResume, context, currentPage, pages);
        break;
      case 'top-banner':
        this.renderWithTopBanner(layoutResume, context, currentPage, pages);
        break;
      case 'two-column':
        this.renderTwoColumn(layoutResume, context, currentPage, pages);
        break;
      default:
        this.renderSingleColumn(layoutResume, context, currentPage, pages);
        break;
    }

    // 添加最后一页
    if (currentPage.shapes.length > 0) {
      pages.push(currentPage);
    }

    // 创建 CanvasResume
    return {
      id: layoutResume.meta.templateId,
      meta: {
        templateId: this.template.id,
        colorTheme: context.theme,
        layoutType,
        createdAt: layoutResume.meta.generatedAt,
        updatedAt: new Date().toISOString(),
        aiModel: layoutResume.meta.aiModel,
        matchScore: layoutResume.meta.matchScore,
        targetJobId: layoutResume.meta.targetJobId,
        version: '2.0.0',
        isAIGenerated: true,
      },
      layoutConfig,
      pages,
      source: { layoutResume },
    };
  }

  // ============== 布局渲染方法 ==============

  private renderSingleColumn(
    layoutResume: LayoutResume,
    context: LayoutContext,
    currentPage: ResumePage,
    pages: ResumePage[]
  ): void {
    const blocks = this.getOrderedBlocks(layoutResume);

    for (const block of blocks) {
      context.currentY = this.renderBlock(block, context, currentPage.shapes);
      context.currentY += SPACING.sectionGap;

      // 检查是否需要分页
      if (context.currentY > context.maxY) {
        pages.push(currentPage);
        context.currentPage++;
        currentPage = createResumePage(`page-${context.currentPage}`, context.currentPage);
        context.currentY = DEFAULT_MARGINS.top;
      }
    }
  }

  private renderWithSidebar(
    layoutResume: LayoutResume,
    context: LayoutContext,
    currentPage: ResumePage,
    pages: ResumePage[]
  ): void {
    const sidebarConfig = this.template.layout.sidebar;
    if (!sidebarConfig) {
      this.renderSingleColumn(layoutResume, context, currentPage, pages);
      return;
    }

    const sidebarWidth = CONTENT_WIDTH * sidebarConfig.widthRatio;
    const mainWidth = CONTENT_WIDTH * (1 - sidebarConfig.widthRatio) - 20;
    const mainX = DEFAULT_MARGINS.left + sidebarWidth + 20;

    // 创建侧边栏背景
    const sidebarBg: SidebarShapeProps = {
      id: 'sidebar-bg',
      type: 'sidebar',
      x: DEFAULT_MARGINS.left,
      y: DEFAULT_MARGINS.top,
      w: sidebarWidth,
      h: A4_SIZE.height - DEFAULT_MARGINS.top - DEFAULT_MARGINS.bottom,
      fill: 'blue',
      padding: sidebarConfig.padding,
    };
    currentPage.shapes.push(sidebarBg);

    // 获取区块
    const allBlocks = this.getOrderedBlocks(layoutResume);
    const sidebarBlockIds = new Set(sidebarConfig.sections);
    const sidebarBlocks = allBlocks.filter(
      (b) => sidebarBlockIds.has(b.id) || sidebarBlockIds.has(b.type)
    );
    const mainBlocks = allBlocks.filter(
      (b) => !sidebarBlockIds.has(b.id) && !sidebarBlockIds.has(b.type)
    );

    // 渲染侧边栏
    let sidebarY = DEFAULT_MARGINS.top + sidebarConfig.padding;
    const sidebarContext: LayoutContext = {
      ...context,
      currentY: sidebarY,
      contentWidth: sidebarWidth - sidebarConfig.padding * 2,
      contentX: DEFAULT_MARGINS.left + sidebarConfig.padding,
    };

    for (const block of sidebarBlocks) {
      sidebarContext.currentY = this.renderBlock(block, sidebarContext, currentPage.shapes);
      sidebarContext.currentY += SPACING.sectionGap;
    }

    // 渲染主内容
    let mainY = DEFAULT_MARGINS.top;
    const mainContext: LayoutContext = {
      ...context,
      currentY: mainY,
      contentWidth: mainWidth,
      contentX: mainX,
    };

    for (const block of mainBlocks) {
      mainContext.currentY = this.renderBlock(block, mainContext, currentPage.shapes);
      mainContext.currentY += SPACING.sectionGap;
    }
  }

  private renderWithTopBanner(
    layoutResume: LayoutResume,
    context: LayoutContext,
    currentPage: ResumePage,
    pages: ResumePage[]
  ): void {
    const bannerConfig = this.template.layout.topBanner;
    if (!bannerConfig) {
      this.renderSingleColumn(layoutResume, context, currentPage, pages);
      return;
    }

    // 创建横幅
    const bannerBg: BannerShapeProps = {
      id: 'banner-bg',
      type: 'banner',
      x: DEFAULT_MARGINS.left,
      y: DEFAULT_MARGINS.top,
      w: CONTENT_WIDTH,
      h: bannerConfig.height,
      decoration: 'solid',
      primaryColor: 'blue',
    };
    currentPage.shapes.push(bannerBg);

    // 渲染头部
    const blocks = this.getOrderedBlocks(layoutResume);
    const headerBlock = blocks.find((b) => b.type === 'header');
    const otherBlocks = blocks.filter((b) => b.type !== 'header');

    if (headerBlock) {
      context.currentY = DEFAULT_MARGINS.top + bannerConfig.padding;
      this.renderBlock(headerBlock, context, currentPage.shapes);
    }

    // 渲染其他区块
    context.currentY = DEFAULT_MARGINS.top + bannerConfig.height + SPACING.sectionGap;
    for (const block of otherBlocks) {
      context.currentY = this.renderBlock(block, context, currentPage.shapes);
      context.currentY += SPACING.sectionGap;
    }
  }

  private renderTwoColumn(
    layoutResume: LayoutResume,
    context: LayoutContext,
    currentPage: ResumePage,
    pages: ResumePage[]
  ): void {
    const twoColumnConfig = this.template.layout.twoColumn;
    if (!twoColumnConfig) {
      this.renderSingleColumn(layoutResume, context, currentPage, pages);
      return;
    }

    const leftWidth = CONTENT_WIDTH * twoColumnConfig.leftRatio - twoColumnConfig.gap / 2;
    const rightWidth = CONTENT_WIDTH * (1 - twoColumnConfig.leftRatio) - twoColumnConfig.gap / 2;
    const rightX = DEFAULT_MARGINS.left + leftWidth + twoColumnConfig.gap;

    const allBlocks = this.getOrderedBlocks(layoutResume);
    const leftBlockIds = new Set(twoColumnConfig.leftSections);
    const rightBlockIds = new Set(twoColumnConfig.rightSections);
    const leftBlocks = allBlocks.filter((b) => leftBlockIds.has(b.id) || leftBlockIds.has(b.type));
    const rightBlocks = allBlocks.filter(
      (b) => rightBlockIds.has(b.id) || rightBlockIds.has(b.type)
    );
    const headerBlocks = allBlocks.filter(
      (b) =>
        !leftBlockIds.has(b.id) &&
        !leftBlockIds.has(b.type) &&
        !rightBlockIds.has(b.id) &&
        !rightBlockIds.has(b.type)
    );

    // 渲染跨栏头部
    for (const block of headerBlocks) {
      context.currentY = this.renderBlock(block, context, currentPage.shapes);
      context.currentY += SPACING.sectionGap;
    }

    // 渲染左栏
    const leftContext: LayoutContext = {
      ...context,
      contentWidth: leftWidth,
      contentX: DEFAULT_MARGINS.left,
    };

    for (const block of leftBlocks) {
      leftContext.currentY = this.renderBlock(block, leftContext, currentPage.shapes);
      leftContext.currentY += SPACING.sectionGap;
    }

    // 渲染右栏
    const rightContext: LayoutContext = {
      ...context,
      contentWidth: rightWidth,
      contentX: rightX,
    };

    for (const block of rightBlocks) {
      rightContext.currentY = this.renderBlock(block, rightContext, currentPage.shapes);
      rightContext.currentY += SPACING.sectionGap;
    }
  }

  // ============== 区块渲染方法 ==============

  private renderBlock(
    block: ResumeLayoutBlock,
    context: LayoutContext,
    shapes: ResumeShape[]
  ): number {
    let y = context.currentY;
    const x = context.contentX;
    const w = context.contentWidth;

    switch (block.type) {
      case 'header':
        y = this.renderHeader(block, x, y, w, shapes);
        break;
      case 'summary':
        y = this.renderSummary(block, x, y, w, shapes);
        break;
      case 'experience':
        y = this.renderExperience(block, x, y, w, shapes);
        break;
      case 'skills':
        y = this.renderSkills(block, x, y, w, shapes);
        break;
      case 'projects':
        y = this.renderProjects(block, x, y, w, shapes);
        break;
      case 'education':
        y = this.renderEducation(block, x, y, w, shapes);
        break;
    }

    return y;
  }

  private renderHeader(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    shapes: ResumeShape[]
  ): number {
    const content = block.content as ResumeHeaderContent;

    // 姓名
    shapes.push(
      createTextShape(generateId('name'), content.name, x, y, w, {
        size: 'xl',
        bold: true,
        align: 'middle',
      })
    );
    y += 30;

    // 求职意向
    if (content.targetPosition) {
      shapes.push(
        createTextShape(generateId('position'), content.targetPosition, x, y, w, {
          size: 'm',
          color: 'grey',
          align: 'middle',
        })
      );
      y += 20;
    }

    // 联系方式
    const contactParts: string[] = [];
    if (content.email) contactParts.push(content.email);
    if (content.phone) contactParts.push(content.phone);
    if (content.location) contactParts.push(content.location);

    if (contactParts.length > 0) {
      shapes.push(
        createTextShape(generateId('contact'), contactParts.join('  •  '), x, y, w, {
          size: 's',
          color: 'grey',
          align: 'middle',
        })
      );
      y += 16;
    }

    // 链接
    if (content.links && content.links.length > 0) {
      const linkParts = content.links.map((link) => link.label || link.url);
      shapes.push(
        createTextShape(generateId('links'), linkParts.join('  |  '), x, y, w, {
          size: 's',
          color: 'blue',
          align: 'middle',
        })
      );
      y += 16;
    }

    return y;
  }

  private renderSummary(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    shapes: ResumeShape[]
  ): number {
    const content = block.content as ResumeSummaryContent;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('sum-title'), block.title || '个人简介', x, y, w)
    );
    y += 28;

    // 简介文本
    shapes.push(createTextShape(generateId('sum-text'), content.summary, x, y, w, { size: 's' }));
    y += this.estimateTextHeight(content.summary, w, 10) + SPACING.paragraphGap;

    // 核心优势
    if (content.coreStrengths && content.coreStrengths.length > 0) {
      y = this.renderTags(
        content.coreStrengths.map((s) => ({ name: s, matched: true })),
        x,
        y,
        w,
        shapes
      );
    }

    return y;
  }

  private renderExperience(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    shapes: ResumeShape[]
  ): number {
    const content = block.content as ResumeExperienceContent;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('exp-title'), block.title || '工作经历', x, y, w)
    );
    y += 32;

    // 渲染每段经历
    for (let i = 0; i < content.items.length; i++) {
      const item = content.items[i];
      const startY = y;

      // 职位
      shapes.push(
        createTextShape(generateId(`exp-${i}-pos`), item.position, x, y, w, {
          size: 'm',
          bold: true,
        })
      );
      y += 18;

      // 公司 | 时间 | 地点
      const period = this.formatPeriod(item.startDate, item.endDate, item.current);
      const metaParts = [item.company, period, item.location].filter(Boolean);
      shapes.push(
        createTextShape(generateId(`exp-${i}-meta`), metaParts.join('  |  '), x, y, w, {
          size: 's',
          color: 'grey',
        })
      );
      y += 16;

      // 成就
      const achievements = item.achievements ?? [];
      const starResults =
        item.starHighlights?.map((h) => h.result).filter((r): r is string => r !== undefined) ?? [];
      const allAchievements = [...achievements, ...starResults];

      for (const achievement of allAchievements) {
        shapes.push(
          createTextShape(
            generateId(`exp-${i}-ach`),
            `• ${achievement}`,
            x + SPACING.leftIndent,
            y,
            w - SPACING.leftIndent,
            { size: 's' }
          )
        );
        y += SPACING.lineGap + 4;
      }

      // 左侧装饰线
      if (y - startY > 30) {
        shapes.push(
          createDividerShape(generateId(`exp-${i}-deco`), x - 8, startY + 4, 2, {
            color: 'blue',
            thickness: y - startY - 8,
          })
        );
      }

      y += SPACING.itemGap;
    }

    return y;
  }

  private renderSkills(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    shapes: ResumeShape[]
  ): number {
    const content = block.content as ResumeSkillContent;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('skill-title'), block.title || '专业技能', x, y, w)
    );
    y += 28;

    // 分类显示
    if (content.displayMode === 'categorized' && content.categories) {
      for (const category of content.categories) {
        shapes.push(
          createTextShape(generateId('skill-cat'), category.category, x, y, w, {
            size: 's',
            color: 'grey',
          })
        );
        y += 16;

        y = this.renderTags(
          category.skills.map((s) => ({ name: s.name, matched: s.isMatched })),
          x,
          y,
          w,
          shapes
        );
        y += 12;
      }
    } else if (content.items) {
      y = this.renderTags(
        content.items.map((s) => ({ name: s.name, matched: s.isMatched })),
        x,
        y,
        w,
        shapes
      );
    }

    return y;
  }

  private renderProjects(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    shapes: ResumeShape[]
  ): number {
    const content = block.content as ResumeProjectContent;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('proj-title'), block.title || '项目经历', x, y, w)
    );
    y += 32;

    for (let i = 0; i < content.items.length; i++) {
      const project = content.items[i];

      // 项目名称
      shapes.push(
        createTextShape(generateId(`proj-${i}-name`), project.name, x, y, w, {
          size: 'm',
          bold: true,
        })
      );
      y += 18;

      // 角色 | 时间
      const period = this.formatPeriod(project.startDate, project.endDate, project.ongoing);
      const roleParts = [project.role, period].filter(Boolean);
      shapes.push(
        createTextShape(generateId(`proj-${i}-meta`), roleParts.join('  |  '), x, y, w, {
          size: 's',
          color: 'grey',
        })
      );
      y += 16;

      // 技术栈
      if (project.technologies && project.technologies.length > 0) {
        y = this.renderTags(
          project.technologies.map((t) => ({ name: t, matched: false })),
          x,
          y,
          w,
          shapes
        );
        y += 8;
      }

      // 成就
      for (const achievement of project.achievements) {
        shapes.push(
          createTextShape(
            generateId(`proj-${i}-ach`),
            `• ${achievement}`,
            x + SPACING.leftIndent,
            y,
            w - SPACING.leftIndent,
            { size: 's' }
          )
        );
        y += SPACING.lineGap + 4;
      }

      y += SPACING.itemGap;
    }

    return y;
  }

  private renderEducation(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    shapes: ResumeShape[]
  ): number {
    const content = block.content as ResumeEducationContent;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('edu-title'), block.title || '教育背景', x, y, w)
    );
    y += 32;

    for (let i = 0; i < content.items.length; i++) {
      const edu = content.items[i];

      // 学校
      shapes.push(
        createTextShape(generateId(`edu-${i}-school`), edu.school, x, y, w, {
          size: 'm',
          bold: true,
        })
      );
      y += 18;

      // 专业 | 学位 | 时间 | GPA
      const period = this.formatPeriod(edu.startDate, edu.endDate);
      const detailParts = [
        `${edu.major} · ${edu.degree}`,
        period,
        edu.gpa ? `GPA: ${edu.gpa}` : null,
      ].filter(Boolean);
      shapes.push(
        createTextShape(generateId(`edu-${i}-detail`), detailParts.join('  |  '), x, y, w, {
          size: 's',
          color: 'grey',
        })
      );
      y += 20;
    }

    return y;
  }

  // ============== 辅助方法 ==============

  private renderTags(
    tags: Array<{ name: string; matched?: boolean }>,
    x: number,
    y: number,
    maxWidth: number,
    shapes: ResumeShape[]
  ): number {
    let currentX = x;
    let currentY = y;
    let maxHeightInRow = 0;

    for (const tag of tags) {
      const tagShape = createTagShape(generateId('tag'), tag.name, currentX, currentY, {
        matched: tag.matched,
      });

      // 检查换行
      if (currentX + tagShape.w > x + maxWidth && currentX > x) {
        currentX = x;
        currentY += maxHeightInRow + SPACING.tagGap;
        maxHeightInRow = 0;
        tagShape.x = currentX;
        tagShape.y = currentY;
      }

      shapes.push(tagShape);
      currentX += tagShape.w + SPACING.tagGap;
      maxHeightInRow = Math.max(maxHeightInRow, tagShape.h);
    }

    return currentY + maxHeightInRow;
  }

  private getOrderedBlocks(layoutResume: LayoutResume): ResumeLayoutBlock[] {
    const sectionOrder = layoutResume.layoutConfig?.sectionOrder;
    if (sectionOrder) {
      return sectionOrder
        .map((id) => layoutResume.blocks.find((b) => b.id === id || b.type === id))
        .filter((b): b is ResumeLayoutBlock => b !== undefined);
    }
    return layoutResume.blocks;
  }

  private formatPeriod(startDate: string, endDate?: string, current?: boolean): string {
    const start = startDate || '';
    const end = current ? '至今' : endDate || '';
    if (start && end) return `${start} - ${end}`;
    return start || end;
  }

  private estimateTextHeight(text: string, width: number, fontSize: number): number {
    const charWidth = fontSize * 0.6;
    const charsPerLine = Math.floor(width / charWidth);
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * fontSize * LINE_HEIGHT_MULTIPLIER;
  }
}

// ============== 工厂函数 ==============

export function createTemplateRenderer(template: ResumeTemplate): TemplateRenderer {
  return new TemplateRenderer(template);
}

export function renderResumeWithTemplate(
  template: ResumeTemplate,
  layoutResume: LayoutResume
): CanvasResume {
  const renderer = new TemplateRenderer(template);
  return renderer.render(layoutResume);
}
