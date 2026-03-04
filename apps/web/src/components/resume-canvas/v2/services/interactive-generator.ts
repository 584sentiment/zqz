/**
 * 交互式简历渲染方案生成器
 * 扩展原有的生成器，添加可编辑区域信息
 */

import type {
  ResumeContent,
  StylePreset,
  RenderPlan,
  PageCommand,
  DrawCommand,
  TextCommand,
  ContainerCommand,
  Position,
  Rect,
  TypographyLevel,
} from '../types';

/** A4 页面尺寸 */
const A4 = { width: 595, height: 842 };
const MARGIN = { top: 45, right: 45, bottom: 45, left: 45 };
const CONTENT_WIDTH = A4.width - MARGIN.left - MARGIN.right;

/** 区块间距 */
const SECTION_GAP = 20;
const ITEM_GAP = 12;

/** 可编辑区域信息 */
export interface EditableRegion {
  id: string;
  type: 'text' | 'list' | 'tags';
  /** 数据路径，用于定位数据 */
  path: string;
  /** 渲染位置 */
  rect: Rect;
  /** 当前值 */
  value: string | string[];
  /** 样式信息 */
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string | number;
    color: string;
    lineHeight: number;
  };
}

/** 区块区域信息（用于拖拽排序） */
export interface SectionRegion {
  id: string;
  /** 区块类型 */
  type: 'header' | 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'contact';
  /** 区块名称 */
  name: string;
  /** 渲染位置 */
  rect: Rect;
  /** 数据路径 */
  path: string;
}

/** 交互式渲染方案 */
export interface InteractiveRenderPlan extends RenderPlan {
  /** 可编辑区域列表 */
  editableRegions: EditableRegion[];
  /** 区块区域列表（用于拖拽排序） */
  sectionRegions: SectionRegion[];
}

/**
 * 获取字符宽度系数
 */
function getCharWidthFactor(char: string): number {
  if (/[\u4e00-\u9fa5]/.test(char)) return 1.0;
  if (/[\u3000-\u303f\uff00-\uffef]/.test(char)) return 1.0;
  if (/[A-Z]/.test(char)) return 0.7;
  if (/[a-z]/.test(char)) return 0.5;
  if (/[0-9]/.test(char)) return 0.55;
  if (char === ' ') return 0.3;
  return 0.4;
}

/**
 * 估算文本高度
 */
function estimateTextHeight(text: string, maxWidth: number, fontSize: number, lineHeight: number): number {
  if (!text) return fontSize * lineHeight;

  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    let currentLine = '';
    let currentWidth = 0;

    for (const char of paragraph) {
      const charWidth = getCharWidthFactor(char) * fontSize;
      const testWidth = currentWidth + charWidth;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
        currentWidth = charWidth;
      } else {
        currentLine += char;
        currentWidth = testWidth;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  const lineCount = Math.max(1, lines.length);
  return lineCount * fontSize * lineHeight * 1.1;
}

/** 默认区块顺序 */
const DEFAULT_SECTION_ORDER = ['summary', 'skills', 'education', 'experience', 'projects'];

/**
 * 交互式渲染方案生成器
 */
export class InteractiveRenderPlanGenerator {
  private preset: StylePreset;
  private content!: ResumeContent;
  private sectionOrder: string[] = DEFAULT_SECTION_ORDER;
  private currentY: number = MARGIN.top;
  private commands: DrawCommand[] = [];
  private editableRegions: EditableRegion[] = [];
  private sectionRegions: SectionRegion[] = [];
  private commandId: number = 0;

  constructor(preset: StylePreset) {
    this.preset = preset;
  }

  /**
   * 生成交互式渲染方案
   * @param content 简历内容
   * @param sectionOrder 可选的区块顺序，如 ['experience', 'skills', 'education']
   */
  generate(content: ResumeContent, sectionOrder?: string[]): InteractiveRenderPlan {
    this.content = content;
    this.sectionOrder = sectionOrder || DEFAULT_SECTION_ORDER;
    this.currentY = MARGIN.top;
    this.commands = [];
    this.editableRegions = [];
    this.sectionRegions = [];
    this.commandId = 0;

    // 根据预设类型选择布局
    switch (this.preset.category) {
      case 'executive':
        this.generateExecutiveLayout();
        break;
      case 'creative':
        this.generateCreativeLayout();
        break;
      case 'minimal':
        this.generateMinimalLayout();
        break;
      default:
        this.generateProfessionalLayout();
    }

    const page: PageCommand = {
      id: 'page-1',
      type: 'page',
      number: 1,
      size: { width: A4.width, height: A4.height },
      children: this.commands,
    };

    return {
      version: '1.0',
      presetId: this.preset.id,
      pages: [page],
      editableRegions: this.editableRegions,
      sectionRegions: this.sectionRegions,
      meta: {
        generatedAt: new Date().toISOString(),
        model: 'interactive-generator',
      },
    };
  }

  /**
   * 生成专业布局（左侧边栏 + 右侧主内容）
   */
  private generateProfessionalLayout(): void {
    const { colors, typography } = this.preset;
    const sidebarWidth = 180;
    const mainX = MARGIN.left + sidebarWidth + 20;
    const mainWidth = CONTENT_WIDTH - sidebarWidth - 20;

    // 左侧边栏背景
    this.addRect({
      x: 0,
      y: 0,
      width: MARGIN.left + sidebarWidth,
      height: A4.height,
    }, colors.background.secondary);

    // 左侧边栏内容
    let sidebarY = MARGIN.top;

    // 联系方式（带标签）
    if (this.content.contact) {
      sidebarY = this.addSectionHeader('联系方式', MARGIN.left, sidebarY, sidebarWidth);
      sidebarY += 10;

      if (this.content.contact.email) {
        this.addEditableText({
          path: 'contact.email',
          value: `Email: ${this.content.contact.email}`,
          x: MARGIN.left,
          y: sidebarY,
          maxWidth: sidebarWidth,
          style: typography.caption,
        });
        sidebarY += 20;
      }

      if (this.content.contact.phone) {
        this.addEditableText({
          path: 'contact.phone',
          value: `Tel: ${this.content.contact.phone}`,
          x: MARGIN.left,
          y: sidebarY,
          maxWidth: sidebarWidth,
          style: typography.caption,
        });
        sidebarY += 20;
      }

      if (this.content.contact.location) {
        this.addEditableText({
          path: 'contact.location',
          value: `地址: ${this.content.contact.location}`,
          x: MARGIN.left,
          y: sidebarY,
          maxWidth: sidebarWidth,
          style: typography.caption,
        });
        sidebarY += SECTION_GAP;
      }
    }

    // 技能
    if (this.content.skills.length > 0) {
      sidebarY = this.addSectionHeader('专业技能', MARGIN.left, sidebarY, sidebarWidth);
      sidebarY += 10;
      sidebarY = this.addSkillTags(this.content.skills, MARGIN.left, sidebarY, sidebarWidth);
    }

    // 右侧主内容
    let mainY = MARGIN.top;

    // 姓名 + 职位
    mainY = this.addEditableText({
      path: 'name',
      value: this.content.name,
      x: mainX,
      y: mainY,
      maxWidth: mainWidth,
      style: typography.pageTitle,
    });
    mainY += 35;

    if (this.content.title) {
      mainY = this.addEditableText({
        path: 'title',
        value: this.content.title,
        x: mainX,
        y: mainY,
        maxWidth: mainWidth,
        style: typography.subtitle,
      });
      mainY += 25;
    }

    // 分隔线
    this.addLine(mainX, mainY, mainX + mainWidth, mainY, colors.border.medium);
    mainY += SECTION_GAP;

    // 根据 sectionOrder 渲染主内容区块
    const mainContentSections = ['summary', 'experience', 'projects', 'education'];
    const orderedSections = this.sectionOrder.filter(s => mainContentSections.includes(s));

    for (const sectionType of orderedSections) {
      if (sectionType === 'summary' && this.content.summary) {
        mainY = this.addSectionHeader('个人简介', mainX, mainY, mainWidth);
        mainY += 10;
        mainY = this.addEditableText({
          path: 'summary',
          value: this.content.summary,
          x: mainX,
          y: mainY,
          maxWidth: mainWidth,
          style: typography.body,
        });
        mainY += SECTION_GAP;
      }

      if (sectionType === 'experience' && this.content.experience.length > 0) {
        mainY = this.addSectionHeader('工作经历', mainX, mainY, mainWidth);
        mainY += 10;

        for (let i = 0; i < this.content.experience.length; i++) {
          const exp = this.content.experience[i];
          mainY = this.addExperienceItem(exp, mainX, mainY, mainWidth, i);
          mainY += i < this.content.experience.length - 1 ? ITEM_GAP : SECTION_GAP;
        }
      }

      if (sectionType === 'projects' && this.content.projects && this.content.projects.length > 0) {
        mainY = this.addSectionHeader('项目经历', mainX, mainY, mainWidth);
        mainY += 10;

        for (let i = 0; i < this.content.projects.length; i++) {
          const proj = this.content.projects[i];
          mainY = this.addProjectItem(proj, mainX, mainY, mainWidth, i);
          mainY += i < this.content.projects.length - 1 ? ITEM_GAP : SECTION_GAP;
        }
      }

      if (sectionType === 'education' && this.content.education.length > 0) {
        mainY = this.addSectionHeader('教育背景', mainX, mainY, mainWidth);
        mainY += 10;

        for (const edu of this.content.education) {
          mainY = this.addEducationItem(edu, mainX, mainY, mainWidth);
          mainY += ITEM_GAP;
        }
      }
    }
  }

  /**
   * 生成高管双栏布局
   */
  private generateExecutiveLayout(): void {
    const { colors, typography } = this.preset;
    const leftWidth = CONTENT_WIDTH / 2 - 15;
    const rightX = MARGIN.left + leftWidth + 30;

    // 头部区域
    let headerY = MARGIN.top;

    // 姓名
    headerY = this.addEditableText({
      path: 'name',
      value: this.content.name,
      x: MARGIN.left,
      y: headerY,
      maxWidth: CONTENT_WIDTH,
      style: typography.pageTitle,
    });
    headerY += 35;

    // 职位
    if (this.content.title) {
      this.addEditableText({
        path: 'title',
        value: this.content.title,
        x: MARGIN.left,
        y: headerY,
        maxWidth: CONTENT_WIDTH,
        style: typography.subtitle,
      });
      headerY += 25;
    }

    // 联系方式（一行显示，带标签）
    const contactParts: string[] = [];
    if (this.content.contact?.email) contactParts.push(`Email: ${this.content.contact.email}`);
    if (this.content.contact?.phone) contactParts.push(`Tel: ${this.content.contact.phone}`);
    if (this.content.contact?.location) contactParts.push(`地址: ${this.content.contact.location}`);

    if (contactParts.length > 0) {
      this.addEditableText({
        path: 'contact.line',
        value: contactParts.join('  |  '),
        x: MARGIN.left,
        y: headerY,
        maxWidth: CONTENT_WIDTH,
        style: typography.caption,
      });
      headerY += 25;
    }

    // 分隔线
    this.addLine(MARGIN.left, headerY, A4.width - MARGIN.right, headerY, colors.primary, 2);
    headerY += SECTION_GAP;

    // 双栏内容 - 根据区块顺序动态分配到左右栏
    let leftY = headerY;
    let rightY = headerY;

    // 过滤出实际存在的区块
    const existingSections = this.sectionOrder.filter(s => {
      if (s === 'summary') return !!this.content.summary;
      if (s === 'skills') return this.content.skills.length > 0;
      if (s === 'education') return this.content.education.length > 0;
      if (s === 'experience') return this.content.experience.length > 0;
      if (s === 'projects') return (this.content.projects?.length ?? 0) > 0;
      return false;
    });

    // 按顺序交替分配到左右栏（奇数位置左栏，偶数位置右栏）
    const leftSectionSet = new Set<string>();
    const rightSectionSet = new Set<string>();

    existingSections.forEach((section, index) => {
      if (index % 2 === 0) {
        leftSectionSet.add(section);
      } else {
        rightSectionSet.add(section);
      }
    });

    // 按原始顺序渲染左栏区块
    for (const sectionType of existingSections) {
      if (!leftSectionSet.has(sectionType)) continue;

      if (sectionType === 'summary' && this.content.summary) {
        leftY = this.addSectionHeader('个人简介', MARGIN.left, leftY, leftWidth);
        leftY += 10;
        leftY = this.addEditableText({
          path: 'summary',
          value: this.content.summary,
          x: MARGIN.left,
          y: leftY,
          maxWidth: leftWidth,
          style: typography.body,
        });
        leftY += SECTION_GAP;
      }

      if (sectionType === 'skills' && this.content.skills.length > 0) {
        leftY = this.addSectionHeader('专业技能', MARGIN.left, leftY, leftWidth);
        leftY += 10;
        leftY = this.addSkillTags(this.content.skills, MARGIN.left, leftY, leftWidth);
        leftY += SECTION_GAP;
      }

      if (sectionType === 'education' && this.content.education.length > 0) {
        leftY = this.addSectionHeader('教育背景', MARGIN.left, leftY, leftWidth);
        leftY += 10;
        for (const edu of this.content.education) {
          leftY = this.addEducationItem(edu, MARGIN.left, leftY, leftWidth);
          leftY += ITEM_GAP;
        }
        leftY += SECTION_GAP - ITEM_GAP;
      }

      if (sectionType === 'experience' && this.content.experience.length > 0) {
        leftY = this.addSectionHeader('工作经历', MARGIN.left, leftY, leftWidth);
        leftY += 10;

        for (let i = 0; i < this.content.experience.length; i++) {
          const exp = this.content.experience[i];
          leftY = this.addExperienceItem(exp, MARGIN.left, leftY, leftWidth, i);
          leftY += ITEM_GAP;
        }
        leftY += SECTION_GAP - ITEM_GAP;
      }

      if (sectionType === 'projects' && this.content.projects && this.content.projects.length > 0) {
        leftY = this.addSectionHeader('项目经历', MARGIN.left, leftY, leftWidth);
        leftY += 10;

        for (let i = 0; i < this.content.projects.length; i++) {
          const proj = this.content.projects[i];
          leftY = this.addProjectItem(proj, MARGIN.left, leftY, leftWidth, i);
          leftY += ITEM_GAP;
        }
        leftY += SECTION_GAP - ITEM_GAP;
      }
    }

    // 按原始顺序渲染右栏区块
    for (const sectionType of existingSections) {
      if (!rightSectionSet.has(sectionType)) continue;

      if (sectionType === 'summary' && this.content.summary) {
        rightY = this.addSectionHeader('个人简介', rightX, rightY, leftWidth);
        rightY += 10;
        rightY = this.addEditableText({
          path: 'summary',
          value: this.content.summary,
          x: rightX,
          y: rightY,
          maxWidth: leftWidth,
          style: typography.body,
        });
        rightY += SECTION_GAP;
      }

      if (sectionType === 'skills' && this.content.skills.length > 0) {
        rightY = this.addSectionHeader('专业技能', rightX, rightY, leftWidth);
        rightY += 10;
        rightY = this.addSkillTags(this.content.skills, rightX, rightY, leftWidth);
        rightY += SECTION_GAP;
      }

      if (sectionType === 'education' && this.content.education.length > 0) {
        rightY = this.addSectionHeader('教育背景', rightX, rightY, leftWidth);
        rightY += 10;
        for (const edu of this.content.education) {
          rightY = this.addEducationItem(edu, rightX, rightY, leftWidth);
          rightY += ITEM_GAP;
        }
        rightY += SECTION_GAP - ITEM_GAP;
      }

      if (sectionType === 'experience' && this.content.experience.length > 0) {
        rightY = this.addSectionHeader('工作经历', rightX, rightY, leftWidth);
        rightY += 10;

        for (let i = 0; i < this.content.experience.length; i++) {
          const exp = this.content.experience[i];
          rightY = this.addExperienceItem(exp, rightX, rightY, leftWidth, i);
          rightY += ITEM_GAP;
        }
        rightY += SECTION_GAP - ITEM_GAP;
      }

      if (sectionType === 'projects' && this.content.projects && this.content.projects.length > 0) {
        rightY = this.addSectionHeader('项目经历', rightX, rightY, leftWidth);
        rightY += 10;

        for (let i = 0; i < this.content.projects.length; i++) {
          const proj = this.content.projects[i];
          rightY = this.addProjectItem(proj, rightX, rightY, leftWidth, i);
          rightY += ITEM_GAP;
        }
        rightY += SECTION_GAP - ITEM_GAP;
      }
    }
  }

  /**
   * 生成创意布局
   */
  private generateCreativeLayout(): void {
    this.generateProfessionalLayout();
  }

  /**
   * 生成极简布局
   */
  private generateMinimalLayout(): void {
    const { typography } = this.preset;
    let y = MARGIN.top;

    // 姓名
    y = this.addEditableText({
      path: 'name',
      value: this.content.name,
      x: MARGIN.left,
      y,
      maxWidth: CONTENT_WIDTH,
      style: typography.pageTitle,
    });
    y += 35;

    // 职位
    if (this.content.title) {
      y = this.addEditableText({
        path: 'title',
        value: this.content.title,
        x: MARGIN.left,
        y,
        maxWidth: CONTENT_WIDTH,
        style: typography.subtitle,
      });
      y += 25;
    }

    // 联系方式（带标签）
    const contactParts: string[] = [];
    if (this.content.contact?.email) contactParts.push(`Email: ${this.content.contact.email}`);
    if (this.content.contact?.phone) contactParts.push(`Tel: ${this.content.contact.phone}`);
    if (this.content.contact?.location) contactParts.push(`地址: ${this.content.contact.location}`);
    if (contactParts.length > 0) {
      y = this.addEditableText({
        path: 'contact.line',
        value: contactParts.join('  ·  '),
        x: MARGIN.left,
        y,
        maxWidth: CONTENT_WIDTH,
        style: typography.caption,
      });
      y += SECTION_GAP;
    }

    // 个人简介
    if (this.content.summary) {
      y = this.addSectionHeader('个人简介', MARGIN.left, y, CONTENT_WIDTH);
      y += 10;
      y = this.addEditableText({
        path: 'summary',
        value: this.content.summary,
        x: MARGIN.left,
        y,
        maxWidth: CONTENT_WIDTH,
        style: typography.body,
      });
      y += SECTION_GAP;
    }

    // 技能
    if (this.content.skills.length > 0) {
      y = this.addSectionHeader('专业技能', MARGIN.left, y, CONTENT_WIDTH);
      y += 10;
      y = this.addSkillTags(this.content.skills, MARGIN.left, y, CONTENT_WIDTH);
      y += SECTION_GAP;
    }

    // 工作经历
    if (this.content.experience.length > 0) {
      y = this.addSectionHeader('工作经历', MARGIN.left, y, CONTENT_WIDTH);
      y += 10;
      for (let i = 0; i < this.content.experience.length; i++) {
        y = this.addExperienceItem(this.content.experience[i], MARGIN.left, y, CONTENT_WIDTH, i);
        y += ITEM_GAP;
      }
      y += SECTION_GAP - ITEM_GAP;
    }

    // 项目经历
    if (this.content.projects && this.content.projects.length > 0) {
      y = this.addSectionHeader('项目经历', MARGIN.left, y, CONTENT_WIDTH);
      y += 10;
      for (let i = 0; i < this.content.projects.length; i++) {
        y = this.addProjectItem(this.content.projects[i], MARGIN.left, y, CONTENT_WIDTH, i);
        y += ITEM_GAP;
      }
      y += SECTION_GAP - ITEM_GAP;
    }

    // 教育背景
    if (this.content.education.length > 0) {
      y = this.addSectionHeader('教育背景', MARGIN.left, y, CONTENT_WIDTH);
      y += 10;
      for (const edu of this.content.education) {
        y = this.addEducationItem(edu, MARGIN.left, y, CONTENT_WIDTH);
        y += ITEM_GAP;
      }
    }
  }

  // ===== 辅助方法 =====

  private nextId(): string {
    return `cmd-${++this.commandId}`;
  }

  private addRect(rect: Rect, fill: string): void {
    this.commands.push({
      id: this.nextId(),
      type: 'rect',
      rect,
      fill,
    });
  }

  private addLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    this.commands.push({
      id: this.nextId(),
      type: 'line',
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      stroke: color,
      strokeWidth: width,
    });
  }

  private addSectionHeader(title: string, x: number, y: number, maxWidth: number): number {
    const { colors, typography } = this.preset;

    this.commands.push({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: title,
      style: {
        ...typography.sectionTitle,
        color: colors.primary,
      },
      maxWidth,
    });

    return y + typography.sectionTitle.fontSize * typography.sectionTitle.lineHeight;
  }

  /**
   * 开始记录一个区块（记录起始位置）
   */
  private startSection(type: SectionRegion['type'], name: string, path: string, x: number, y: number): void {
    // 暂存区块信息，结束时更新高度
    this.sectionRegions.push({
      id: `section-${type}`,
      type,
      name,
      path,
      rect: { x, y, width: 0, height: 0 },
    });
  }

  /**
   * 结束记录区块（更新高度和宽度）
   */
  private endSection(width: number, endY: number): void {
    const lastSection = this.sectionRegions[this.sectionRegions.length - 1];
    if (lastSection) {
      lastSection.rect.width = width;
      lastSection.rect.height = endY - lastSection.rect.y;
    }
  }

  private addEditableText(params: {
    path: string;
    value: string;
    x: number;
    y: number;
    maxWidth: number;
    style: TypographyLevel;
  }): number {
    const { colors } = this.preset;
    const { path, value, x, y, maxWidth, style } = params;

    // 计算文本高度
    const height = estimateTextHeight(value, maxWidth, style.fontSize, style.lineHeight);

    // 添加可编辑区域
    this.editableRegions.push({
      id: `edit-${path.replace(/\./g, '-')}`,
      type: 'text',
      path,
      rect: { x, y, width: maxWidth, height },
      value,
      style: {
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        color: style.color || colors.text.primary,
        lineHeight: style.lineHeight,
      },
    });

    // 添加绘制命令
    this.commands.push({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: value,
      style: {
        ...style,
        color: style.color || colors.text.primary,
      },
      maxWidth,
    });

    return y + height;
  }

  private addSkillTags(skills: string[], x: number, y: number, maxWidth: number): number {
    const { colors, typography } = this.preset;
    const tagHeight = 22;
    const tagGap = 8;
    const lineGap = 6;

    let currentX = x;
    let currentY = y;
    let lineHeight = 0;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const tagWidth = this.estimateTagWidth(skill, typography.label.fontSize);

      if (currentX + tagWidth > x + maxWidth && currentX > x) {
        currentX = x;
        currentY += tagHeight + lineGap;
        lineHeight = 0;
      }

      this.commands.push({
        id: this.nextId(),
        type: 'skillTag',
        position: { x: currentX, y: currentY },
        skill,
        matched: this.content.matchedSkills?.includes(skill),
        style: {
          backgroundColor: this.content.matchedSkills?.includes(skill)
            ? colors.semantic.success + '20'
            : colors.background.tertiary,
          textColor: this.content.matchedSkills?.includes(skill)
            ? colors.semantic.success
            : colors.text.primary,
          borderRadius: 4,
          paddingX: 8,
          paddingY: 4,
          fontSize: typography.label.fontSize,
          fontFamily: typography.label.fontFamily,
        },
      });

      currentX += tagWidth + tagGap;
      lineHeight = Math.max(lineHeight, tagHeight);
    }

    return currentY + lineHeight + 10;
  }

  private estimateTagWidth(text: string, fontSize: number): number {
    let width = 0;
    for (const char of text) {
      width += getCharWidthFactor(char) * fontSize;
    }
    return width + 16; // padding
  }

  private addExperienceItem(
    exp: NonNullable<ResumeContent['experience']>[0],
    x: number,
    y: number,
    maxWidth: number,
    index: number
  ): number {
    const { colors, typography } = this.preset;

    // 公司 + 职位
    const companyText = `${exp.company}  ·  ${exp.position}`;
    y = this.addEditableText({
      path: `experience.${index}.company`,
      value: companyText,
      x,
      y,
      maxWidth,
      style: typography.subtitle,
    });

    // 时间 + 地点
    const metaParts = [exp.period];
    if (exp.location) metaParts.push(exp.location);
    y = this.addEditableText({
      path: `experience.${index}.period`,
      value: metaParts.join('  |  '),
      x,
      y,
      maxWidth,
      style: { ...typography.caption, color: colors.text.muted },
    });
    y += 5;

    // 成就列表 - 每条都是可编辑的
    for (let h = 0; h < exp.highlights.length; h++) {
      const highlight = exp.highlights[h];
      const height = estimateTextHeight(highlight, maxWidth - 10, typography.body.fontSize, typography.body.lineHeight);

      // 添加可编辑区域
      this.editableRegions.push({
        id: `edit-experience-${index}-highlights-${h}`,
        type: 'text',
        path: `experience.${index}.highlights.${h}`,
        rect: { x: x + 10, y, width: maxWidth - 10, height },
        value: highlight,
        style: {
          fontSize: typography.body.fontSize,
          fontFamily: typography.body.fontFamily,
          fontWeight: typography.body.fontWeight,
          color: colors.text.primary,
          lineHeight: typography.body.lineHeight,
        },
      });

      // 添加绘制命令
      this.commands.push({
        id: this.nextId(),
        type: 'text',
        position: { x: x + 10, y },
        content: `• ${highlight}`,
        style: {
          ...typography.body,
          color: colors.text.primary,
        },
        maxWidth: maxWidth - 10,
      });
      y += height;
    }

    return y;
  }

  private addProjectItem(
    proj: NonNullable<ResumeContent['projects']>[0],
    x: number,
    y: number,
    maxWidth: number,
    index: number
  ): number {
    const { colors, typography } = this.preset;

    // 项目名 + 角色
    const titleParts = [proj.name];
    if (proj.role) titleParts.push(proj.role);
    y = this.addEditableText({
      path: `projects.${index}.name`,
      value: titleParts.join('  ·  '),
      x,
      y,
      maxWidth,
      style: typography.subtitle,
    });

    // 时间
    if (proj.period) {
      y = this.addEditableText({
        path: `projects.${index}.period`,
        value: proj.period,
        x,
        y,
        maxWidth,
        style: { ...typography.caption, color: colors.text.muted },
      });
      y += 5;
    }

    // 技术栈
    if (proj.techStack && proj.techStack.length > 0) {
      const techStackText = `技术栈：${proj.techStack.join(', ')}`;
      const height = typography.caption.fontSize * typography.caption.lineHeight;

      // 添加可编辑区域
      this.editableRegions.push({
        id: `edit-projects-${index}-techStack`,
        type: 'tags',
        path: `projects.${index}.techStack`,
        rect: { x, y, width: maxWidth, height },
        value: proj.techStack,
        style: {
          fontSize: typography.caption.fontSize,
          fontFamily: typography.caption.fontFamily,
          fontWeight: typography.caption.fontWeight,
          color: colors.text.muted,
          lineHeight: typography.caption.lineHeight,
        },
      });

      this.commands.push({
        id: this.nextId(),
        type: 'text',
        position: { x, y },
        content: techStackText,
        style: {
          ...typography.caption,
          color: colors.text.muted,
        },
        maxWidth,
      });
      y += height + 5;
    }

    // 成就列表 - 每条都是可编辑的
    for (let h = 0; h < proj.highlights.length; h++) {
      const highlight = proj.highlights[h];
      const height = estimateTextHeight(highlight, maxWidth - 10, typography.body.fontSize, typography.body.lineHeight);

      // 添加可编辑区域
      this.editableRegions.push({
        id: `edit-projects-${index}-highlights-${h}`,
        type: 'text',
        path: `projects.${index}.highlights.${h}`,
        rect: { x: x + 10, y, width: maxWidth - 10, height },
        value: highlight,
        style: {
          fontSize: typography.body.fontSize,
          fontFamily: typography.body.fontFamily,
          fontWeight: typography.body.fontWeight,
          color: colors.text.primary,
          lineHeight: typography.body.lineHeight,
        },
      });

      // 添加绘制命令
      this.commands.push({
        id: this.nextId(),
        type: 'text',
        position: { x: x + 10, y },
        content: `• ${highlight}`,
        style: {
          ...typography.body,
          color: colors.text.primary,
        },
        maxWidth: maxWidth - 10,
      });
      y += height;
    }

    return y;
  }

  private addEducationItem(
    edu: NonNullable<ResumeContent['education']>[0],
    x: number,
    y: number,
    maxWidth: number
  ): number {
    const { colors, typography } = this.preset;

    // 学校 + 学位
    const titleText = `${edu.school}  ·  ${edu.degree}`;
    y = this.addEditableText({
      path: `education.school`,
      value: titleText,
      x,
      y,
      maxWidth,
      style: typography.subtitle,
    });

    // 专业 + 时间
    const metaText = `${edu.major}  |  ${edu.period}`;
    y = this.addEditableText({
      path: `education.major`,
      value: metaText,
      x,
      y,
      maxWidth,
      style: { ...typography.caption, color: colors.text.muted },
    });

    return y;
  }
}

/**
 * 创建交互式渲染方案生成器
 */
export function createInteractiveGenerator(preset: StylePreset): InteractiveRenderPlanGenerator {
  return new InteractiveRenderPlanGenerator(preset);
}
