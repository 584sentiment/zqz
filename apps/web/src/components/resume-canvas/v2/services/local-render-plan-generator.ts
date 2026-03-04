/**
 * 本地渲染方案生成器
 * 使用预定义的布局算法生成渲染方案，不依赖 AI
 */

import type {
  ResumeContent,
  StylePreset,
  RenderPlan,
  PageCommand,
  DrawCommand,
  RectCommand,
  TextCommand,
  LineCommand,
  SkillTagCommand,
  ContainerCommand,
} from '../types';

/** A4 页面尺寸 */
const A4 = { width: 595, height: 842 };
const MARGIN = { top: 45, right: 45, bottom: 45, left: 45 };
const CONTENT_WIDTH = A4.width - MARGIN.left - MARGIN.right;
const CONTENT_HEIGHT = A4.height - MARGIN.top - MARGIN.bottom;

/** 区块间距 */
const SECTION_GAP = 20;
const ITEM_GAP = 12;

/**
 * 获取字符宽度系数（相对于 fontSize）
 */
function getCharWidthFactor(char: string): number {
  // 中文字符
  if (/[\u4e00-\u9fa5]/.test(char)) return 1.0;
  // 中文标点
  if (/[\u3000-\u303f\uff00-\uffef]/.test(char)) return 1.0;
  // 英文大写
  if (/[A-Z]/.test(char)) return 0.7;
  // 英文小写
  if (/[a-z]/.test(char)) return 0.5;
  // 数字
  if (/[0-9]/.test(char)) return 0.55;
  // 空格
  if (char === ' ') return 0.3;
  // 其他符号
  return 0.4;
}

/**
 * 估算文本高度（模拟 Canvas 换行逻辑）
 * @param text 文本内容
 * @param maxWidth 最大宽度
 * @param fontSize 字体大小
 * @param lineHeight 行高
 * @returns 估算的高度（包含安全边距）
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

  // 至少一行，添加 10% 安全边距
  const lineCount = Math.max(1, lines.length);
  return lineCount * fontSize * lineHeight * 1.1;
}

/**
 * 本地渲染方案生成器
 * 根据预设样式和内容生成布局
 */
export class LocalRenderPlanGenerator {
  private preset: StylePreset;
  private content!: ResumeContent;
  private currentY: number = MARGIN.top;
  private commands: DrawCommand[] = [];
  private commandId: number = 0;

  constructor(preset: StylePreset) {
    this.preset = preset;
  }

  /**
   * 生成渲染方案
   */
  generate(content: ResumeContent): RenderPlan {
    this.content = content;
    this.currentY = MARGIN.top;
    this.commands = [];
    this.commandId = 0;

    // 根据 preset.category 选择布局策略
    switch (this.preset.category) {
      case 'creative':
        this.generateCreativeLayout();
        break;
      case 'executive':
        this.generateExecutiveLayout();
        break;
      case 'minimal':
        this.generateMinimalLayout();
        break;
      default:
        this.generateProfessionalLayout();
    }

    // 创建页面
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
      meta: {
        generatedAt: new Date().toISOString(),
        model: 'local-generator',
      },
    };
  }

  /**
   * 专业布局（单栏，带侧边栏色块）
   */
  private generateProfessionalLayout(): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 1. 左侧边栏背景
    const sidebarWidth = 180;
    this.addCommand({
      id: this.nextId(),
      type: 'rect',
      rect: { x: 0, y: 0, width: sidebarWidth, height: A4.height },
      fill: colors.primary,
      zIndex: 0,
    });

    // 2. 侧边栏内容
    let sidebarY = MARGIN.top;

    // 姓名在侧边栏
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: sidebarY },
      content: this.content.name,
      style: {
        fontFamily: typo.pageTitle.fontFamily,
        fontSize: typo.pageTitle.fontSize - 4,
        fontWeight: 'bold',
        color: colors.text.inverse,
        lineHeight: 1.3,
        textAlign: 'left',
      },
      maxWidth: sidebarWidth - MARGIN.left * 2,
    });
    sidebarY += 35;

    // 职位
    if (this.content.title) {
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: MARGIN.left, y: sidebarY },
        content: this.content.title,
        style: {
          fontFamily: typo.subtitle.fontFamily,
          fontSize: typo.subtitle.fontSize,
          fontWeight: 'normal',
          color: colors.text.inverse + 'cc',
          lineHeight: 1.4,
          textAlign: 'left',
        },
        maxWidth: sidebarWidth - MARGIN.left * 2,
      });
      sidebarY += 25;
    }

    // 联系方式
    if (this.content.contact) {
      const contactLines: string[] = [];
      if (this.content.contact.email) contactLines.push(this.content.contact.email);
      if (this.content.contact.phone) contactLines.push(this.content.contact.phone);
      if (this.content.contact.location) contactLines.push(this.content.contact.location);

      contactLines.forEach((line, i) => {
        this.addCommand({
          id: this.nextId(),
          type: 'text',
          position: { x: MARGIN.left, y: sidebarY + i * 16 },
          content: line,
          style: {
            fontFamily: typo.caption.fontFamily,
            fontSize: typo.caption.fontSize,
            fontWeight: 'normal',
            color: colors.text.inverse + 'aa',
            lineHeight: 1.4,
            textAlign: 'left',
          },
          maxWidth: sidebarWidth - MARGIN.left * 2,
        });
      });
      sidebarY += contactLines.length * 16 + 30;
    }

    // 技能区块（侧边栏）
    if (this.content.skills.length > 0) {
      sidebarY = this.renderSidebarSkills(sidebarY, sidebarWidth);
    }

    // 教育区块（侧边栏）
    if (this.content.education.length > 0) {
      sidebarY = this.renderSidebarEducation(sidebarY, sidebarWidth);
    }

    // 3. 主内容区
    const mainX = sidebarWidth + 20;
    const mainWidth = CONTENT_WIDTH - sidebarWidth - 20;
    this.currentY = MARGIN.top;

    // 个人简介
    if (this.content.summary) {
      this.renderSection('个人简介', mainX, mainWidth);
      this.renderText(this.content.summary, mainX, mainWidth);
      this.currentY += 15;
    }

    // 工作经历
    if (this.content.experience.length > 0) {
      this.renderSection('工作经历', mainX, mainWidth);
      this.content.experience.forEach((exp) => {
        this.renderExperience(exp, mainX, mainWidth);
      });
    }

    // 项目经历
    if (this.content.projects && this.content.projects.length > 0) {
      this.currentY += 10;
      this.renderSection('项目经历', mainX, mainWidth);
      this.content.projects.forEach((proj) => {
        this.renderProject(proj, mainX, mainWidth);
      });
    }
  }

  /**
   * 创意布局（顶部横幅）
   */
  private generateCreativeLayout(): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 1. 顶部横幅背景
    const bannerHeight = 110;
    this.addCommand({
      id: this.nextId(),
      type: 'rect',
      rect: { x: 0, y: 0, width: A4.width, height: bannerHeight },
      fill: colors.primary,
      zIndex: 0,
    });

    // 2. 横幅内容
    let bannerY = 30;

    // 姓名
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: 0, y: bannerY },
      content: this.content.name,
      style: {
        fontFamily: typo.pageTitle.fontFamily,
        fontSize: typo.pageTitle.fontSize,
        fontWeight: 'bold',
        color: colors.text.inverse,
        lineHeight: 1.2,
        textAlign: 'center',
      },
      maxWidth: A4.width,
    });
    bannerY += 35;

    // 职位
    if (this.content.title) {
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: 0, y: bannerY },
        content: this.content.title,
        style: {
          fontFamily: typo.subtitle.fontFamily,
          fontSize: typo.subtitle.fontSize + 2,
          fontWeight: 'normal',
          color: colors.text.inverse + 'dd',
          lineHeight: 1.4,
          textAlign: 'center',
        },
        maxWidth: A4.width,
      });
      bannerY += 25;
    }

    // 联系方式
    if (this.content.contact) {
      const contactParts: string[] = [];
      if (this.content.contact.email) contactParts.push(this.content.contact.email);
      if (this.content.contact.phone) contactParts.push(this.content.contact.phone);
      if (this.content.contact.location) contactParts.push(this.content.contact.location);

      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: 0, y: bannerY },
        content: contactParts.join(' | '),
        style: {
          fontFamily: typo.caption.fontFamily,
          fontSize: typo.caption.fontSize,
          fontWeight: 'normal',
          color: colors.text.inverse + 'aa',
          lineHeight: 1.4,
          textAlign: 'center',
        },
        maxWidth: A4.width,
      });
    }

    // 3. 主内容
    this.currentY = bannerHeight + 20;

    if (this.content.summary) {
      this.renderSection('个人简介', MARGIN.left, CONTENT_WIDTH);
      this.renderText(this.content.summary, MARGIN.left, CONTENT_WIDTH);
      this.currentY += 15;
    }

    if (this.content.experience.length > 0) {
      this.renderSection('工作经历', MARGIN.left, CONTENT_WIDTH);
      this.content.experience.forEach((exp) => {
        this.renderExperience(exp, MARGIN.left, CONTENT_WIDTH);
      });
    }

    if (this.content.skills.length > 0) {
      this.currentY += 10;
      this.renderSection('专业技能', MARGIN.left, CONTENT_WIDTH);
      this.renderSkillTags(MARGIN.left, CONTENT_WIDTH);
    }

    if (this.content.education.length > 0) {
      this.currentY += 15;
      this.renderSection('教育经历', MARGIN.left, CONTENT_WIDTH);
      this.content.education.forEach((edu) => {
        this.renderEducation(edu, MARGIN.left, CONTENT_WIDTH);
      });
    }
  }

  /**
   * 高管布局（双栏）
   */
  private generateExecutiveLayout(): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 1. 顶部区域
    let topY = MARGIN.top;

    // 姓名居中
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: 0, y: topY },
      content: this.content.name,
      style: {
        fontFamily: typo.pageTitle.fontFamily,
        fontSize: typo.pageTitle.fontSize,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.2,
        textAlign: 'center',
      },
      maxWidth: A4.width,
    });
    topY += 32;

    // 职位
    if (this.content.title) {
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: 0, y: topY },
        content: this.content.title,
        style: {
          fontFamily: typo.subtitle.fontFamily,
          fontSize: typo.subtitle.fontSize,
          fontWeight: 'normal',
          color: colors.text.secondary,
          lineHeight: 1.4,
          textAlign: 'center',
        },
        maxWidth: A4.width,
      });
      topY += 20;
    }

    // 分隔线
    this.addCommand({
      id: this.nextId(),
      type: 'line',
      start: { x: MARGIN.left, y: topY + 5 },
      end: { x: A4.width - MARGIN.right, y: topY + 5 },
      stroke: colors.border.light,
      strokeWidth: 1,
    });
    topY += 20;

    // 2. 双栏布局
    const leftWidth = CONTENT_WIDTH * 0.55;
    const rightWidth = CONTENT_WIDTH * 0.45 - 20;
    const rightX = MARGIN.left + leftWidth + 20;

    // 左栏：工作经历、项目
    let leftY = topY;
    if (this.content.experience.length > 0) {
      leftY = this.renderSectionAt('工作经历', MARGIN.left, leftWidth, leftY);
      this.content.experience.forEach((exp) => {
        leftY = this.renderExperienceAt(exp, MARGIN.left, leftWidth, leftY);
      });
    }

    // 右栏：技能、教育
    let rightY = topY;
    if (this.content.skills.length > 0) {
      rightY = this.renderSectionAt('专业技能', rightX, rightWidth, rightY);
      rightY = this.renderSkillTagsAt(rightX, rightWidth, rightY);
      rightY += 15;
    }

    if (this.content.education.length > 0) {
      rightY = this.renderSectionAt('教育经历', rightX, rightWidth, rightY);
      this.content.education.forEach((edu) => {
        rightY = this.renderEducationAt(edu, rightX, rightWidth, rightY);
      });
    }
  }

  /**
   * 极简布局（单栏无装饰）
   */
  private generateMinimalLayout(): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 姓名左对齐
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: this.content.name.toUpperCase(),
      style: {
        fontFamily: typo.pageTitle.fontFamily,
        fontSize: typo.pageTitle.fontSize,
        fontWeight: 'normal',
        color: colors.text.primary,
        lineHeight: 1.3,
        letterSpacing: 2,
        textAlign: 'left',
      },
    });
    this.currentY += 30;

    // 职位和联系方式
    const headerParts: string[] = [];
    if (this.content.title) headerParts.push(this.content.title);
    if (this.content.contact?.email) headerParts.push(this.content.contact.email);
    if (this.content.contact?.phone) headerParts.push(this.content.contact.phone);

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: headerParts.join(' · '),
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'left',
      },
      maxWidth: CONTENT_WIDTH,
    });
    this.currentY += 25;

    // 内容区块
    if (this.content.summary) {
      this.renderMinimalSection('个人简介');
      this.renderText(this.content.summary, MARGIN.left, CONTENT_WIDTH);
      this.currentY += 15;
    }

    if (this.content.experience.length > 0) {
      this.renderMinimalSection('工作经历');
      this.content.experience.forEach((exp) => {
        this.renderMinimalExperience(exp);
      });
    }

    if (this.content.skills.length > 0) {
      this.currentY += 5;
      this.renderMinimalSection('专业技能');
      this.renderText(this.content.skills.join(' · '), MARGIN.left, CONTENT_WIDTH);
      this.currentY += 15;
    }

    if (this.content.education.length > 0) {
      this.renderMinimalSection('教育经历');
      this.content.education.forEach((edu) => {
        this.renderMinimalEducation(edu);
      });
    }
  }

  // ============ 辅助方法 ============

  private nextId(): string {
    return `cmd-${++this.commandId}`;
  }

  private addCommand(command: DrawCommand): void {
    this.commands.push(command);
  }

  private renderSection(title: string, x: number, width: number): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 区块前增加间距
    this.currentY += SECTION_GAP;

    // 区块标题
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: title,
      style: {
        fontFamily: typo.sectionTitle.fontFamily,
        fontSize: typo.sectionTitle.fontSize,
        fontWeight: 'bold',
        color: colors.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    // 下划线
    this.addCommand({
      id: this.nextId(),
      type: 'line',
      start: { x, y: this.currentY + 22 },
      end: { x: x + width, y: this.currentY + 22 },
      stroke: colors.border.medium,
      strokeWidth: 1,
    });

    this.currentY += 38;
  }

  private renderSectionAt(title: string, x: number, width: number, y: number): number {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: title,
      style: {
        fontFamily: typo.sectionTitle.fontFamily,
        fontSize: typo.sectionTitle.fontSize,
        fontWeight: 'bold',
        color: colors.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.addCommand({
      id: this.nextId(),
      type: 'line',
      start: { x, y: y + 20 },
      end: { x: x + width, y: y + 20 },
      stroke: colors.border.medium,
      strokeWidth: 1,
    });

    return y + 35;
  }

  private renderText(text: string, x: number, width: number): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: text,
      style: {
        fontFamily: typo.body.fontFamily,
        fontSize: typo.body.fontSize,
        fontWeight: 'normal',
        color: colors.text.secondary,
        lineHeight: typo.body.lineHeight,
        textAlign: 'left',
      },
      maxWidth: width,
    });

    // 使用更准确的高度估算
    const height = estimateTextHeight(text, width, typo.body.fontSize, typo.body.lineHeight);
    this.currentY += height + ITEM_GAP;
  }

  private renderExperience(exp: ResumeContent['experience'][0], x: number, width: number): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 增加条目间距
    this.currentY += ITEM_GAP;

    // 职位
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: exp.position,
      style: {
        fontFamily: typo.subtitle.fontFamily,
        fontSize: typo.subtitle.fontSize,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    // 公司和时间段
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: x + width - 100, y: this.currentY },
      content: exp.period,
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'right',
      },
      maxWidth: 100,
    });

    this.currentY += 22;

    // 公司
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: exp.company,
      style: {
        fontFamily: typo.body.fontFamily,
        fontSize: typo.body.fontSize,
        fontWeight: 'normal',
        color: colors.text.secondary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 20;

    // 工作亮点
    exp.highlights.forEach((h) => {
      const bulletText = '• ' + h;
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: x + 10, y: this.currentY },
        content: bulletText,
        style: {
          fontFamily: typo.body.fontFamily,
          fontSize: typo.body.fontSize,
          fontWeight: 'normal',
          color: colors.text.secondary,
          lineHeight: typo.body.lineHeight,
          textAlign: 'left',
        },
        maxWidth: width - 20,
      });
      // 使用更准确的高度估算
      const hHeight = estimateTextHeight(bulletText, width - 20, typo.body.fontSize, typo.body.lineHeight);
      this.currentY += hHeight + 6;
    });

    this.currentY += SECTION_GAP / 2;
  }

  private renderExperienceAt(exp: ResumeContent['experience'][0], x: number, width: number, y: number): number {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: exp.position,
      style: {
        fontFamily: typo.subtitle.fontFamily,
        fontSize: typo.subtitle.fontSize - 1,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    y += 16;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: `${exp.company} | ${exp.period}`,
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    y += 16;

    exp.highlights.forEach((h) => {
      const bulletText = '• ' + h;
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: x + 8, y },
        content: bulletText,
        style: {
          fontFamily: typo.body.fontFamily,
          fontSize: typo.body.fontSize - 1,
          fontWeight: 'normal',
          color: colors.text.secondary,
          lineHeight: 1.5,
          textAlign: 'left',
        },
        maxWidth: width - 16,
      });
      // 使用高度估算
      const hHeight = estimateTextHeight(bulletText, width - 16, typo.body.fontSize - 1, 1.5);
      y += hHeight + 4;
    });

    return y + 12;
  }

  private renderProject(proj: NonNullable<ResumeContent['projects']>[0], x: number, width: number): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 增加条目间距
    this.currentY += ITEM_GAP;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: proj.name,
      style: {
        fontFamily: typo.subtitle.fontFamily,
        fontSize: typo.subtitle.fontSize,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 20;

    if (proj.techStack && proj.techStack.length > 0) {
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x, y: this.currentY },
        content: '技术栈: ' + proj.techStack.join(', '),
        style: {
          fontFamily: typo.caption.fontFamily,
          fontSize: typo.caption.fontSize,
          fontWeight: 'normal',
          color: colors.text.muted,
          lineHeight: 1.4,
          textAlign: 'left',
        },
        maxWidth: width,
      });
      this.currentY += 18;
    }

    proj.highlights.forEach((h) => {
      const bulletText = '• ' + h;
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: x + 10, y: this.currentY },
        content: bulletText,
        style: {
          fontFamily: typo.body.fontFamily,
          fontSize: typo.body.fontSize,
          fontWeight: 'normal',
          color: colors.text.secondary,
          lineHeight: typo.body.lineHeight,
          textAlign: 'left',
        },
        maxWidth: width - 20,
      });
      // 使用更准确的高度估算
      const hHeight = estimateTextHeight(bulletText, width - 20, typo.body.fontSize, typo.body.lineHeight);
      this.currentY += hHeight + 6;
    });

    this.currentY += SECTION_GAP / 2;
  }

  private renderSkillTags(x: number, width: number): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;
    const matchedSet = new Set(this.content.matchedSkills || []);

    let currentX = x;
    let currentY = this.currentY;
    const tagHeight = 26;
    const gap = 10;

    this.content.skills.forEach((skill) => {
      const tagWidth = skill.length * typo.label.fontSize * 0.7 + 24;

      if (currentX + tagWidth > x + width && currentX > x) {
        currentX = x;
        currentY += tagHeight + 6;
      }

      const isMatched = matchedSet.has(skill);

      this.addCommand({
        id: this.nextId(),
        type: 'skillTag',
        position: { x: currentX, y: currentY },
        skill,
        matched: isMatched,
        style: {
          backgroundColor: isMatched ? colors.semantic.success + '20' : colors.background.tertiary,
          textColor: isMatched ? colors.semantic.success : colors.primary,
          borderRadius: 12,
          paddingX: 12,
          paddingY: 6,
          fontSize: typo.label.fontSize,
          fontFamily: typo.label.fontFamily,
          borderColor: isMatched ? colors.semantic.success : undefined,
        },
      });

      currentX += tagWidth + gap;
    });

    this.currentY = currentY + tagHeight + SECTION_GAP;
  }

  private renderSkillTagsAt(x: number, width: number, y: number): number {
    const colors = this.preset.colors;
    const typo = this.preset.typography;
    const matchedSet = new Set(this.content.matchedSkills || []);

    let currentX = x;
    let currentY = y;
    const tagHeight = 22;
    const gap = 6;

    this.content.skills.forEach((skill) => {
      const tagWidth = skill.length * typo.label.fontSize * 0.6 + 18;

      if (currentX + tagWidth > x + width && currentX > x) {
        currentX = x;
        currentY += tagHeight + 4;
      }

      const isMatched = matchedSet.has(skill);

      this.addCommand({
        id: this.nextId(),
        type: 'skillTag',
        position: { x: currentX, y: currentY },
        skill,
        matched: isMatched,
        style: {
          backgroundColor: isMatched ? colors.semantic.success + '20' : colors.background.tertiary,
          textColor: isMatched ? colors.semantic.success : colors.primary,
          borderRadius: 10,
          paddingX: 8,
          paddingY: 4,
          fontSize: typo.label.fontSize - 1,
          fontFamily: typo.label.fontFamily,
          borderColor: isMatched ? colors.semantic.success : undefined,
        },
      });

      currentX += tagWidth + gap;
    });

    return currentY + tagHeight + 10;
  }

  private renderEducation(edu: ResumeContent['education'][0], x: number, width: number): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 增加条目间距
    this.currentY += ITEM_GAP;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: edu.school,
      style: {
        fontFamily: typo.subtitle.fontFamily,
        fontSize: typo.subtitle.fontSize,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 20;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y: this.currentY },
      content: `${edu.major} · ${edu.degree} | ${edu.period}`,
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 24;
  }

  private renderEducationAt(edu: ResumeContent['education'][0], x: number, width: number, y: number): number {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: edu.school,
      style: {
        fontFamily: typo.subtitle.fontFamily,
        fontSize: typo.subtitle.fontSize - 1,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    y += 15;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x, y },
      content: `${edu.major} · ${edu.degree}`,
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    return y + 20;
  }

  private renderSidebarSkills(startY: number, sidebarWidth: number): number {
    const colors = this.preset.colors;
    const typo = this.preset.typography;
    const matchedSet = new Set(this.content.matchedSkills || []);

    // 区块标题
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: startY },
      content: '专业技能',
      style: {
        fontFamily: typo.sectionTitle.fontFamily,
        fontSize: typo.sectionTitle.fontSize - 2,
        fontWeight: 'bold',
        color: colors.text.inverse,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    let y = startY + 22;
    const maxWidth = sidebarWidth - MARGIN.left * 2;

    this.content.skills.forEach((skill) => {
      const isMatched = matchedSet.has(skill);
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: MARGIN.left, y },
        content: (isMatched ? '✓ ' : '• ') + skill,
        style: {
          fontFamily: typo.body.fontFamily,
          fontSize: typo.body.fontSize - 1,
          fontWeight: isMatched ? 'bold' : 'normal',
          color: isMatched ? colors.semantic.success : colors.text.inverse + 'cc',
          lineHeight: 1.5,
          textAlign: 'left',
        },
        maxWidth,
      });
      y += 16;
    });

    return y + 15;
  }

  private renderSidebarEducation(startY: number, sidebarWidth: number): number {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 区块标题
    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: startY },
      content: '教育经历',
      style: {
        fontFamily: typo.sectionTitle.fontFamily,
        fontSize: typo.sectionTitle.fontSize - 2,
        fontWeight: 'bold',
        color: colors.text.inverse,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    let y = startY + 22;

    this.content.education.forEach((edu) => {
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: MARGIN.left, y },
        content: edu.school,
        style: {
          fontFamily: typo.subtitle.fontFamily,
          fontSize: typo.subtitle.fontSize - 2,
          fontWeight: 'bold',
          color: colors.text.inverse,
          lineHeight: 1.4,
          textAlign: 'left',
        },
        maxWidth: sidebarWidth - MARGIN.left * 2,
      });
      y += 15;

      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: MARGIN.left, y },
        content: `${edu.major} · ${edu.degree}`,
        style: {
          fontFamily: typo.caption.fontFamily,
          fontSize: typo.caption.fontSize - 1,
          fontWeight: 'normal',
          color: colors.text.inverse + 'aa',
          lineHeight: 1.4,
          textAlign: 'left',
        },
        maxWidth: sidebarWidth - MARGIN.left * 2,
      });
      y += 20;
    });

    return y + 10;
  }

  private renderMinimalSection(title: string): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 区块前增加间距
    this.currentY += SECTION_GAP;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: title.toUpperCase(),
      style: {
        fontFamily: typo.sectionTitle.fontFamily,
        fontSize: typo.sectionTitle.fontSize - 2,
        fontWeight: 'normal',
        color: colors.text.primary,
        lineHeight: 1.4,
        letterSpacing: 2,
        textAlign: 'left',
      },
    });

    this.currentY += 24;
  }

  private renderMinimalExperience(exp: ResumeContent['experience'][0]): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 增加条目间距
    this.currentY += ITEM_GAP;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: exp.position,
      style: {
        fontFamily: typo.body.fontFamily,
        fontSize: typo.body.fontSize,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left + CONTENT_WIDTH - 80, y: this.currentY },
      content: exp.period,
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize - 1,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'right',
      },
      maxWidth: 80,
    });

    this.currentY += 18;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: exp.company,
      style: {
        fontFamily: typo.body.fontFamily,
        fontSize: typo.body.fontSize - 1,
        fontWeight: 'normal',
        color: colors.text.secondary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 20;

    exp.highlights.forEach((h) => {
      const bulletText = '— ' + h;
      this.addCommand({
        id: this.nextId(),
        type: 'text',
        position: { x: MARGIN.left + 8, y: this.currentY },
        content: bulletText,
        style: {
          fontFamily: typo.body.fontFamily,
          fontSize: typo.body.fontSize - 1,
          fontWeight: 'normal',
          color: colors.text.secondary,
          lineHeight: 1.6,
          textAlign: 'left',
        },
        maxWidth: CONTENT_WIDTH - 16,
      });
      // 使用更准确的高度估算
      const hHeight = estimateTextHeight(bulletText, CONTENT_WIDTH - 16, typo.body.fontSize - 1, 1.6);
      this.currentY += hHeight + 4;
    });

    this.currentY += SECTION_GAP / 2;
  }

  private renderMinimalEducation(edu: ResumeContent['education'][0]): void {
    const colors = this.preset.colors;
    const typo = this.preset.typography;

    // 增加条目间距
    this.currentY += ITEM_GAP;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: edu.school,
      style: {
        fontFamily: typo.body.fontFamily,
        fontSize: typo.body.fontSize,
        fontWeight: 'bold',
        color: colors.text.primary,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 18;

    this.addCommand({
      id: this.nextId(),
      type: 'text',
      position: { x: MARGIN.left, y: this.currentY },
      content: `${edu.major} · ${edu.degree} · ${edu.period}`,
      style: {
        fontFamily: typo.caption.fontFamily,
        fontSize: typo.caption.fontSize - 1,
        fontWeight: 'normal',
        color: colors.text.muted,
        lineHeight: 1.4,
        textAlign: 'left',
      },
    });

    this.currentY += 22;
  }
}

/**
 * 创建本地渲染方案生成器
 */
export function createLocalRenderPlanGenerator(preset: StylePreset): LocalRenderPlanGenerator {
  return new LocalRenderPlanGenerator(preset);
}
