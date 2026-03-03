/**
 * PDF 导出器
 * 使用 pdf-lib 生成高质量矢量 PDF
 */

import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import type { ResumeContent, LayoutResult, PageData, ResumeElement } from '../types/resume-canvas.types';
import type { ResumeTemplate } from '../types/template.types';
import { A4_PAGE } from '../types/template.types';
import { LayoutEngine } from '../core/layout-engine';

export interface PDFExportOptions {
  /** 文件名 */
  filename?: string;
  /** 是否嵌入字体 */
  embedFonts?: boolean;
  /** PDF 元数据 */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export class PDFExporter {
  private layoutEngine: LayoutEngine;

  constructor(private template: ResumeTemplate) {
    this.layoutEngine = new LayoutEngine(template);
  }

  /**
   * 导出简历为 PDF
   */
  async export(content: ResumeContent, options: PDFExportOptions = {}): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // 设置元数据
    if (options.metadata) {
      if (options.metadata.title) {
        pdfDoc.setTitle(options.metadata.title);
      }
      if (options.metadata.author) {
        pdfDoc.setAuthor(options.metadata.author);
      }
      if (options.metadata.subject) {
        pdfDoc.setSubject(options.metadata.subject);
      }
    }

    // 嵌入字体
    const fonts = await this.embedFonts(pdfDoc);

    // 计算布局
    const layout = this.layoutEngine.layout(content);

    // 渲染每一页
    for (const page of layout.pages) {
      await this.renderPage(pdfDoc, page, fonts);
    }

    // 保存 PDF
    return pdfDoc.save();
  }

  /**
   * 嵌入字体
   */
  private async embedFonts(pdfDoc: PDFDocument): Promise<{
    regular: PDFFont;
    bold: PDFFont;
  }> {
    // 使用标准字体（后续可替换为中文字体）
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    return { regular, bold };
  }

  /**
   * 渲染单页
   */
  private async renderPage(
    pdfDoc: PDFDocument,
    page: PageData,
    fonts: { regular: PDFFont; bold: PDFFont }
  ): Promise<void> {
    const pdfPage = pdfDoc.addPage([A4_PAGE.width, A4_PAGE.height]);
    const { width, height } = pdfPage.getSize();

    // 渲染背景
    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
    });

    // 渲染所有元素
    for (const element of page.elements) {
      this.renderElement(pdfPage, element, fonts, height);
    }
  }

  /**
   * 渲染元素
   */
  private renderElement(
    pdfPage: any,
    element: ResumeElement,
    fonts: { regular: PDFFont; bold: PDFFont },
    pageHeight: number
  ): void {
    // PDF 坐标系 Y 轴从底部开始，需要转换
    const y = pageHeight - element.y - element.height;

    switch (element.type) {
      case 'text':
        this.renderText(pdfPage, element as any, fonts, pageHeight);
        break;
      case 'section-header':
        this.renderSectionHeader(pdfPage, element as any, fonts, pageHeight);
        break;
      case 'divider':
        this.renderDivider(pdfPage, element as any, pageHeight);
        break;
      case 'skill-tags':
        this.renderSkillTags(pdfPage, element as any, fonts, pageHeight);
        break;
      case 'education-item':
        this.renderEducationItem(pdfPage, element as any, fonts, pageHeight);
        break;
      case 'experience-card':
        this.renderExperienceCard(pdfPage, element as any, fonts, pageHeight);
        break;
    }
  }

  /**
   * 渲染文本
   */
  private renderText(
    pdfPage: any,
    element: import('../types/resume-canvas.types').TextElement,
    fonts: { regular: PDFFont; bold: PDFFont },
    pageHeight: number
  ): void {
    const { content, style, x, y, height } = element;
    const font = style.fontWeight === 'bold' ? fonts.bold : fonts.regular;
    const color = this.parseColor(style.color);
    const lines = content.split('\n');
    const lineHeight = style.fontSize * style.lineHeight;

    lines.forEach((line, index) => {
      pdfPage.drawText(line, {
        x,
        y: pageHeight - y - (index + 1) * lineHeight,
        size: style.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    });
  }

  /**
   * 渲染区块标题
   */
  private renderSectionHeader(
    pdfPage: any,
    element: import('../types/resume-canvas.types').SectionHeaderElement,
    fonts: { regular: PDFFont; bold: PDFFont },
    pageHeight: number
  ): void {
    const { title, style, x, y, height } = element;
    const color = this.parseColor(style.title.color);
    const accentColor = this.parseColor(style.accentColor || style.title.color);

    // 标题文本
    pdfPage.drawText(title, {
      x,
      y: pageHeight - y - style.title.fontSize,
      size: style.title.fontSize,
      font: fonts.bold,
      color: rgb(color.r, color.g, color.b),
    });

    // 下划线
    pdfPage.drawLine({
      start: { x, y: pageHeight - y - height - 5 },
      end: { x: x + element.width, y: pageHeight - y - height - 5 },
      thickness: 2,
      color: rgb(accentColor.r, accentColor.g, accentColor.b),
    });
  }

  /**
   * 渲染分割线
   */
  private renderDivider(
    pdfPage: any,
    element: import('../types/resume-canvas.types').DividerElement,
    pageHeight: number
  ): void {
    const { x, y, width, color, thickness } = element;
    const parsedColor = this.parseColor(color);

    pdfPage.drawLine({
      start: { x, y: pageHeight - y },
      end: { x: x + width, y: pageHeight - y },
      thickness,
      color: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
    });
  }

  /**
   * 渲染技能标签
   */
  private renderSkillTags(
    pdfPage: any,
    element: import('../types/resume-canvas.types').SkillTagsElement,
    fonts: { regular: PDFFont; bold: PDFFont },
    pageHeight: number
  ): void {
    const { skills, style, x, y, width } = element;
    const tagHeight = style.tag.fontSize * 1.5 + style.tag.paddingY * 2;
    let currentX = x;
    let currentY = y;

    skills.forEach((skill) => {
      const tagWidth = skill.name.length * style.tag.fontSize * 0.6 + style.tag.paddingX * 2;

      // 检查换行
      if (currentX + tagWidth > x + width && currentX > x) {
        currentX = x;
        currentY += tagHeight + 5;
      }

      // 标签背景
      const bgColor = skill.matched
        ? this.parseColor('#dcfce7')
        : this.parseColor(style.tag.backgroundColor);
      pdfPage.drawRectangle({
        x: currentX,
        y: pageHeight - currentY - tagHeight,
        width: tagWidth,
        height: tagHeight,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
        borderRadius: style.tag.borderRadius,
      });

      // 标签文本
      const textColor = skill.matched
        ? this.parseColor('#166534')
        : this.parseColor(style.tag.color);
      pdfPage.drawText(skill.name, {
        x: currentX + style.tag.paddingX,
        y: pageHeight - currentY - tagHeight / 2 - style.tag.fontSize / 2,
        size: style.tag.fontSize,
        font: fonts.regular,
        color: rgb(textColor.r, textColor.g, textColor.b),
      });

      currentX += tagWidth + style.gap;
    });
  }

  /**
   * 渲染教育经历
   */
  private renderEducationItem(
    pdfPage: any,
    element: import('../types/resume-canvas.types').EducationElement,
    fonts: { regular: PDFFont; bold: PDFFont },
    pageHeight: number
  ): void {
    const { school, major, degree, period, style, x, y } = element;

    // 学校名称
    const schoolColor = this.parseColor(style.school.color);
    pdfPage.drawText(school, {
      x,
      y: pageHeight - y - style.school.fontSize,
      size: style.school.fontSize,
      font: fonts.bold,
      color: rgb(schoolColor.r, schoolColor.g, schoolColor.b),
    });

    // 专业和学位
    const detailColor = this.parseColor(style.detail.color);
    pdfPage.drawText(`${major} · ${degree} | ${period}`, {
      x,
      y: pageHeight - y - style.school.fontSize * 1.3 - style.detail.fontSize,
      size: style.detail.fontSize,
      font: fonts.regular,
      color: rgb(detailColor.r, detailColor.g, detailColor.b),
    });
  }

  /**
   * 渲染工作经历卡片
   */
  private renderExperienceCard(
    pdfPage: any,
    element: import('../types/resume-canvas.types').ExperienceCardElement,
    fonts: { regular: PDFFont; bold: PDFFont },
    pageHeight: number
  ): void {
    const { position, company, period, highlights, style, x, y, height } = element;
    let currentY = y;

    // 左侧竖线
    const bulletColor = this.parseColor(style.bulletColor);
    pdfPage.drawLine({
      start: { x, y: pageHeight - y },
      end: { x, y: pageHeight - y - height },
      thickness: 3,
      color: rgb(bulletColor.r, bulletColor.g, bulletColor.b),
    });

    const contentX = x + 15;

    // 职位
    const titleColor = this.parseColor(style.title.color);
    pdfPage.drawText(position, {
      x: contentX,
      y: pageHeight - currentY - style.title.fontSize,
      size: style.title.fontSize,
      font: fonts.bold,
      color: rgb(titleColor.r, titleColor.g, titleColor.b),
    });
    currentY += style.title.fontSize * 1.3;

    // 公司和时间段
    const subtitleColor = this.parseColor(style.subtitle.color);
    pdfPage.drawText(`${company} | ${period}`, {
      x: contentX,
      y: pageHeight - currentY - style.subtitle.fontSize,
      size: style.subtitle.fontSize,
      font: fonts.regular,
      color: rgb(subtitleColor.r, subtitleColor.g, subtitleColor.b),
    });
    currentY += style.subtitle.fontSize * 1.5;

    // 工作亮点
    const highlightColor = this.parseColor(style.highlight.color);
    highlights.forEach((highlight) => {
      pdfPage.drawText(`• ${highlight}`, {
        x: contentX,
        y: pageHeight - currentY - style.highlight.fontSize,
        size: style.highlight.fontSize,
        font: fonts.regular,
        color: rgb(highlightColor.r, highlightColor.g, highlightColor.b),
      });
      currentY += style.highlight.fontSize * style.highlight.lineHeight;
    });
  }

  /**
   * 解析颜色
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // 处理十六进制颜色
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const bigint = parseInt(hex, 16);
      return {
        r: ((bigint >> 16) & 255) / 255,
        g: ((bigint >> 8) & 255) / 255,
        b: (bigint & 255) / 255,
      };
    }

    // 默认黑色
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * 下载 PDF
   */
  static download(pdfBytes: Uint8Array, filename: string): void {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
