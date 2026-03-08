/**
 * AI 内容转换器
 *
 * 负责将 AI 生成的内容转换为 CanvasResume 格式
 */

import type {
  LayoutResume,
  ResumeLayoutBlock,
  ResumeLayoutConfig,
  ColorTheme,
  LayoutType,
  ResumeHeaderContent,
  ResumeSummaryContent,
  ResumeExperienceContent,
  ResumeSkillContent,
  ResumeProjectContent,
  ResumeEducationContent,
} from '@ai-job-assistant/shared';
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
  LayoutContext,
  TldrawColor,
  FontSize,
  TextAlign,
} from '../types/canvas-resume.types';
import {
  A4_SIZE,
  DEFAULT_MARGINS,
  CONTENT_WIDTH,
  createTextShape,
  createSectionTitleShape,
  createDividerShape,
  createTagShape,
  createResumePage,
  createCanvasResume,
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
  primary: TldrawColor;
  secondary: TldrawColor;
  text: {
    primary: TldrawColor;
    secondary: TldrawColor;
    muted: TldrawColor;
  };
  background: {
    primary: TldrawColor;
    secondary: TldrawColor;
    tag: TldrawColor;
    tagMatched: TldrawColor;
  };
  border: TldrawColor;
}

const THEME_COLORS: Record<ColorTheme, ThemeColors> = {
  modern: {
    primary: 'blue',
    secondary: 'light-blue',
    text: { primary: 'black', secondary: 'grey', muted: 'grey' },
    background: {
      primary: 'black',
      secondary: 'black',
      tag: 'light-blue',
      tagMatched: 'light-green',
    },
    border: 'grey',
  },
  classic: {
    primary: 'black',
    secondary: 'grey',
    text: { primary: 'black', secondary: 'grey', muted: 'grey' },
    background: { primary: 'black', secondary: 'black', tag: 'grey', tagMatched: 'grey' },
    border: 'grey',
  },
  creative: {
    primary: 'purple',
    secondary: 'violet',
    text: { primary: 'black', secondary: 'grey', muted: 'grey' },
    background: { primary: 'black', secondary: 'black', tag: 'violet', tagMatched: 'purple' },
    border: 'violet',
  },
  minimal: {
    primary: 'black',
    secondary: 'grey',
    text: { primary: 'black', secondary: 'grey', muted: 'grey' },
    background: { primary: 'black', secondary: 'black', tag: 'grey', tagMatched: 'black' },
    border: 'grey',
  },
  executive: {
    primary: 'green',
    secondary: 'light-green',
    text: { primary: 'black', secondary: 'grey', muted: 'grey' },
    background: { primary: 'black', secondary: 'black', tag: 'light-green', tagMatched: 'green' },
    border: 'light-green',
  },
};

// ============== 辅助函数 ==============

/** 生成唯一 ID */
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 格式化日期范围 */
function formatPeriod(startDate: string, endDate?: string, current?: boolean): string {
  const start = startDate || '';
  const end = current ? '至今' : endDate || '';
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

/** 估算文本高度 */
function estimateTextHeight(text: string, width: number, fontSize: number): number {
  const charWidth = fontSize * 0.6;
  const charsPerLine = Math.floor(width / charWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  return lines * fontSize * LINE_HEIGHT_MULTIPLIER;
}

// ============== AIContentConverter 类 ==============

/**
 * AI 内容转换器
 *
 * 将 AI 生成的 LayoutResume 转换为 CanvasResume
 */
export class AIContentConverter {
  /**
   * 将 LayoutResume 转换为 CanvasResume
   */
  convertLayoutResume(layoutResume: LayoutResume): CanvasResume {
    const layoutConfig = layoutResume.layoutConfig;
    const theme = (layoutConfig?.colorTheme as ColorTheme) || 'modern';
    const layoutType = layoutConfig?.layoutType || 'single-column';

    // 初始化页面
    const pages: ResumePage[] = [];
    let currentPage = createResumePage(generateId('page'), 1);
    let currentY = DEFAULT_MARGINS.top;

    // 获取有序区块
    const blocks = this.getOrderedBlocks(layoutResume);

    // 渲染每个区块
    for (const block of blocks) {
      const result = this.convertBlock(block, currentY, theme, layoutConfig);

      // 检查是否需要分页
      if (result.nextY > A4_SIZE.height - DEFAULT_MARGINS.bottom) {
        pages.push(currentPage);
        currentPage = createResumePage(generateId('page'), pages.length + 1);
        currentY = DEFAULT_MARGINS.top;
      }

      currentPage.shapes.push(...result.shapes);
      currentY = result.nextY + SPACING.sectionGap;
    }

    // 添加最后一页
    if (currentPage.shapes.length > 0) {
      pages.push(currentPage);
    }

    // 创建 CanvasResume
    return createCanvasResume(layoutResume.meta.templateId, {
      meta: {
        templateId: layoutResume.meta.templateId,
        colorTheme: theme,
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
    });
  }

  /**
   * 将旧格式简历内容转换为 CanvasResume
   */
  convertLegacyContent(
    content: {
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
    },
    options?: {
      theme?: ColorTheme;
      layoutType?: LayoutType;
    }
  ): CanvasResume {
    const theme = options?.theme || 'modern';
    const layoutType = options?.layoutType || 'single-column';

    // 转换为 LayoutResume 格式
    const layoutResume: LayoutResume = {
      meta: {
        templateId: 'legacy-converted',
        generatedAt: new Date().toISOString(),
      },
      layoutConfig: {
        colorTheme: theme,
        layoutType,
        highlightMatchedSkills: true,
      },
      blocks: this.legacyToBlocks(content),
    };

    return this.convertLayoutResume(layoutResume);
  }

  /**
   * 将单个区块内容转换为 shapes（用于增量更新）
   */
  convertBlockToShapes(
    block: ResumeLayoutBlock,
    startY: number,
    theme: ColorTheme,
    layoutConfig?: ResumeLayoutConfig
  ): { shapes: ResumeShape[]; nextY: number } {
    return this.convertBlock(block, startY, theme, layoutConfig);
  }

  // ============== 私有方法 ==============

  /**
   * 获取有序区块
   */
  private getOrderedBlocks(layoutResume: LayoutResume): ResumeLayoutBlock[] {
    const sectionOrder = layoutResume.layoutConfig?.sectionOrder;
    if (sectionOrder) {
      return sectionOrder
        .map((id) => layoutResume.blocks.find((b) => b.id === id || b.type === id))
        .filter((b): b is ResumeLayoutBlock => b !== undefined);
    }
    return layoutResume.blocks;
  }

  /**
   * 转换单个区块
   */
  private convertBlock(
    block: ResumeLayoutBlock,
    startY: number,
    theme: ColorTheme,
    layoutConfig?: ResumeLayoutConfig
  ): { shapes: ResumeShape[]; nextY: number } {
    const x = DEFAULT_MARGINS.left;
    const w = CONTENT_WIDTH;
    const themeColors = THEME_COLORS[theme];

    switch (block.type) {
      case 'header':
        return this.convertHeader(block, x, startY, w, themeColors);
      case 'summary':
        return this.convertSummary(block, x, startY, w, themeColors);
      case 'experience':
        return this.convertExperience(block, x, startY, w, themeColors);
      case 'skills':
        return this.convertSkills(block, x, startY, w, themeColors, layoutConfig);
      case 'projects':
        return this.convertProjects(block, x, startY, w, themeColors);
      case 'education':
        return this.convertEducation(block, x, startY, w, themeColors);
      default:
        return { shapes: [], nextY: startY };
    }
  }

  /**
   * 转换头部区块
   */
  private convertHeader(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    theme: ThemeColors
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
    const content = block.content as ResumeHeaderContent;
    let currentY = y;

    // 姓名
    shapes.push(
      createTextShape(generateId('name'), content.name, x, currentY, w, {
        size: 'xl',
        color: theme.text.primary,
        align: 'middle',
        bold: true,
      })
    );
    currentY += 30;

    // 求职意向
    if (content.targetPosition) {
      shapes.push(
        createTextShape(generateId('position'), content.targetPosition, x, currentY, w, {
          size: 'm',
          color: theme.text.secondary,
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
        createTextShape(generateId('contact'), contactParts.join('  •  '), x, currentY, w, {
          size: 's',
          color: theme.text.secondary,
          align: 'middle',
        })
      );
      currentY += 16;
    }

    // 链接
    if (content.links && content.links.length > 0) {
      const linkParts = content.links.map((link) => link.label || link.url);
      shapes.push(
        createTextShape(generateId('links'), linkParts.join('  |  '), x, currentY, w, {
          size: 's',
          color: theme.primary,
          align: 'middle',
        })
      );
      currentY += 16;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 转换简介区块
   */
  private convertSummary(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    theme: ThemeColors
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
    const content = block.content as ResumeSummaryContent;
    let currentY = y;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('sum-title'), block.title || '个人简介', x, currentY, w)
    );
    currentY += 28;

    // 简介文本
    shapes.push(
      createTextShape(generateId('sum-text'), content.summary, x, currentY, w, { size: 's' })
    );
    currentY += estimateTextHeight(content.summary, w, 10) + SPACING.paragraphGap;

    // 核心优势
    if (content.coreStrengths && content.coreStrengths.length > 0) {
      const tagsResult = this.createTags(
        content.coreStrengths.map((s) => ({ name: s, matched: true })),
        x,
        currentY,
        w
      );
      shapes.push(...tagsResult.shapes);
      currentY = tagsResult.nextY;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 转换工作经历区块
   */
  private convertExperience(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    theme: ThemeColors
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
    const content = block.content as ResumeExperienceContent;
    let currentY = y;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('exp-title'), block.title || '工作经历', x, currentY, w)
    );
    currentY += 32;

    // 渲染每段经历
    for (let i = 0; i < content.items.length; i++) {
      const item = content.items[i];
      const startY = currentY;

      // 职位
      shapes.push(
        createTextShape(generateId(`exp-${i}-pos`), item.position, x, currentY, w, {
          size: 'm',
          bold: true,
        })
      );
      currentY += 18;

      // 公司 | 时间 | 地点
      const period = formatPeriod(item.startDate, item.endDate, item.current);
      const metaParts = [item.company, period, item.location].filter(Boolean);
      shapes.push(
        createTextShape(generateId(`exp-${i}-meta`), metaParts.join('  |  '), x, currentY, w, {
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
          createTextShape(
            generateId(`exp-${i}-ach`),
            `• ${achievement}`,
            x + SPACING.leftIndent,
            currentY,
            w - SPACING.leftIndent,
            { size: 's' }
          )
        );
        currentY += SPACING.lineGap + 4;
      }

      // 左侧装饰线
      if (currentY - startY > 30) {
        shapes.push(
          createDividerShape(generateId(`exp-${i}-deco`), x - 8, startY + 4, 2, {
            color: theme.primary,
            thickness: currentY - startY - 8,
          })
        );
      }

      currentY += SPACING.itemGap;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 转换技能区块
   */
  private convertSkills(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    theme: ThemeColors,
    layoutConfig?: ResumeLayoutConfig
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
    const content = block.content as ResumeSkillContent;
    const highlightMatched = layoutConfig?.highlightMatchedSkills ?? true;
    let currentY = y;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('skill-title'), block.title || '专业技能', x, currentY, w)
    );
    currentY += 28;

    // 分类显示
    if (content.displayMode === 'categorized' && content.categories) {
      for (const category of content.categories) {
        shapes.push(
          createTextShape(generateId('skill-cat'), category.category, x, currentY, w, {
            size: 's',
            color: 'grey',
          })
        );
        currentY += 16;

        const tagsResult = this.createTags(
          category.skills.map((s) => ({ name: s.name, matched: highlightMatched && s.isMatched })),
          x,
          currentY,
          w
        );
        shapes.push(...tagsResult.shapes);
        currentY = tagsResult.nextY + 12;
      }
    } else if (content.items) {
      const tagsResult = this.createTags(
        content.items.map((s) => ({ name: s.name, matched: highlightMatched && s.isMatched })),
        x,
        currentY,
        w
      );
      shapes.push(...tagsResult.shapes);
      currentY = tagsResult.nextY;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 转换项目区块
   */
  private convertProjects(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    theme: ThemeColors
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
    const content = block.content as ResumeProjectContent;
    let currentY = y;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('proj-title'), block.title || '项目经历', x, currentY, w)
    );
    currentY += 32;

    for (let i = 0; i < content.items.length; i++) {
      const project = content.items[i];

      // 项目名称
      shapes.push(
        createTextShape(generateId(`proj-${i}-name`), project.name, x, currentY, w, {
          size: 'm',
          bold: true,
        })
      );
      currentY += 18;

      // 角色 | 时间
      const period = formatPeriod(project.startDate, project.endDate, project.ongoing);
      const roleParts = [project.role, period].filter(Boolean);
      shapes.push(
        createTextShape(generateId(`proj-${i}-meta`), roleParts.join('  |  '), x, currentY, w, {
          size: 's',
          color: 'grey',
        })
      );
      currentY += 16;

      // 技术栈
      if (project.technologies && project.technologies.length > 0) {
        const tagsResult = this.createTags(
          project.technologies.map((t) => ({ name: t, matched: false })),
          x,
          currentY,
          w
        );
        shapes.push(...tagsResult.shapes);
        currentY = tagsResult.nextY + 8;
      }

      // 成就列表
      for (const achievement of project.achievements) {
        shapes.push(
          createTextShape(
            generateId(`proj-${i}-ach`),
            `• ${achievement}`,
            x + SPACING.leftIndent,
            currentY,
            w - SPACING.leftIndent,
            { size: 's' }
          )
        );
        currentY += SPACING.lineGap + 4;
      }

      currentY += SPACING.itemGap;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 转换教育区块
   */
  private convertEducation(
    block: ResumeLayoutBlock,
    x: number,
    y: number,
    w: number,
    theme: ThemeColors
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
    const content = block.content as ResumeEducationContent;
    let currentY = y;

    // 标题
    shapes.push(
      createSectionTitleShape(generateId('edu-title'), block.title || '教育背景', x, currentY, w)
    );
    currentY += 32;

    for (let i = 0; i < content.items.length; i++) {
      const edu = content.items[i];

      // 学校
      shapes.push(
        createTextShape(generateId(`edu-${i}-school`), edu.school, x, currentY, w, {
          size: 'm',
          bold: true,
        })
      );
      currentY += 18;

      // 专业 | 学位 | 时间 | GPA
      const period = formatPeriod(edu.startDate, edu.endDate);
      const detailParts = [
        `${edu.major} · ${edu.degree}`,
        period,
        edu.gpa ? `GPA: ${edu.gpa}` : null,
      ].filter(Boolean);
      shapes.push(
        createTextShape(generateId(`edu-${i}-detail`), detailParts.join('  |  '), x, currentY, w, {
          size: 's',
          color: 'grey',
        })
      );
      currentY += 20;
    }

    return { shapes, nextY: currentY };
  }

  /**
   * 创建标签
   */
  private createTags(
    tags: Array<{ name: string; matched?: boolean }>,
    x: number,
    y: number,
    maxWidth: number
  ): { shapes: ResumeShape[]; nextY: number } {
    const shapes: ResumeShape[] = [];
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

    return { shapes, nextY: currentY + maxHeightInRow };
  }

  /**
   * 将旧格式转换为区块
   */
  private legacyToBlocks(content: {
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
  }): ResumeLayoutBlock[] {
    const blocks: ResumeLayoutBlock[] = [];

    // 头部
    blocks.push({
      id: 'header',
      type: 'header',
      content: {
        name: content.name,
        email: content.contact?.email || '',
        phone: content.contact?.phone,
        location: content.contact?.location,
        links: [
          content.contact?.website
            ? { type: 'other' as const, url: content.contact.website }
            : null,
          content.contact?.linkedin
            ? { type: 'linkedin' as const, url: content.contact.linkedin }
            : null,
        ].filter(Boolean) as ResumeHeaderContent['links'],
      },
    });

    // 简介
    if (content.summary) {
      blocks.push({
        id: 'summary',
        type: 'summary',
        content: { summary: content.summary },
      });
    }

    // 工作经历
    if (content.experience.length > 0) {
      blocks.push({
        id: 'experience',
        type: 'experience',
        content: {
          items: content.experience.map((exp) => {
            const [startDate, endDate] = exp.period.split(' - ');
            return {
              company: exp.company,
              position: exp.position,
              location: exp.location,
              startDate: startDate || '',
              endDate: endDate,
              achievements: exp.highlights,
            };
          }),
        },
      });
    }

    // 技能
    if (content.skills.length > 0) {
      blocks.push({
        id: 'skills',
        type: 'skills',
        content: {
          items: content.skills.map((skill) => ({
            name: skill,
            isMatched: content.matchedSkills?.includes(skill),
          })),
        },
      });
    }

    // 项目
    if (content.projects && content.projects.length > 0) {
      blocks.push({
        id: 'projects',
        type: 'projects',
        content: {
          items: content.projects.map((proj) => {
            const [startDate, endDate] = (proj.period || '').split(' - ');
            return {
              name: proj.name,
              role: proj.role,
              startDate: startDate || '',
              endDate: endDate,
              technologies: proj.techStack,
              achievements: proj.highlights,
            };
          }),
        },
      });
    }

    // 教育
    if (content.education.length > 0) {
      blocks.push({
        id: 'education',
        type: 'education',
        content: {
          items: content.education.map((edu) => {
            const [startDate, endDate] = edu.period.split(' - ');
            return {
              school: edu.school,
              degree: edu.degree,
              major: edu.major,
              startDate: startDate || '',
              endDate: endDate,
              gpa: edu.gpa,
            };
          }),
        },
      });
    }

    return blocks;
  }
}

// ============== 导出 ==============

export const aiContentConverter = new AIContentConverter();

export function createAIContentConverter(): AIContentConverter {
  return new AIContentConverter();
}

/**
 * 将 LayoutResume 转换为 CanvasResume
 */
export function convertLayoutResumeToCanvas(layoutResume: LayoutResume): CanvasResume {
  return aiContentConverter.convertLayoutResume(layoutResume);
}

/**
 * 将旧格式简历内容转换为 CanvasResume
 */
export function convertLegacyContentToCanvas(
  content: Parameters<AIContentConverter['convertLegacyContent']>[0],
  options?: Parameters<AIContentConverter['convertLegacyContent']>[1]
): CanvasResume {
  return aiContentConverter.convertLegacyContent(content, options);
}
