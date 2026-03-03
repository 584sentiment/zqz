/**
 * 文本测量器
 * 用于测量文本宽度和自动换行
 */

import type { TextStyle } from '../types/resume-canvas.types';
import { DEFAULT_FONTS } from '../types/template.types';

export interface TextMeasurement {
  /** 换行后的文本行 */
  lines: string[];
  /** 总宽度（最长行） */
  width: number;
  /** 总高度 */
  height: number;
  /** 每行的宽度 */
  lineWidths: number[];
}

export class TextMeasurer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * 获取 Canvas 上下文（延迟初始化）
   */
  private getContext(): CanvasRenderingContext2D {
    if (!this.ctx) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
    return this.ctx!;
  }

  /**
   * 设置字体
   */
  private setFont(style: TextStyle): void {
    const ctx = this.getContext();
    const fontFamily = this.getFontFamily(style.fontFamily);
    ctx.font = `${style.fontWeight} ${style.fontSize}px ${fontFamily}`;
  }

  /**
   * 获取字体族（处理中英文字体）
   */
  private getFontFamily(fontFamily: string): string {
    // 如果包含中文字符，使用主字体
    return fontFamily || `${DEFAULT_FONTS.english}, ${DEFAULT_FONTS.primary}`;
  }

  /**
   * 测量单行文本宽度
   */
  measureWidth(text: string, style: TextStyle): number {
    const ctx = this.getContext();
    this.setFont(style);
    const metrics = ctx.measureText(text);
    return metrics.width + style.letterSpacing * (text.length - 1);
  }

  /**
   * 自动换行
   * @param text 原始文本
   * @param style 文本样式
   * @param maxWidth 最大宽度
   * @returns 换行后的文本行数组和测量结果
   */
  wrapText(text: string, style: TextStyle, maxWidth: number): TextMeasurement {
    const lines: string[] = [];
    const lineWidths: number[] = [];

    // 处理段落（保留用户输入的换行）
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('');
        lineWidths.push(0);
        continue;
      }

      // 中英文分词
      const words = this.splitWords(paragraph);
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine}${word}` : word;
        const width = this.measureWidth(testLine, style);

        if (width > maxWidth && currentLine) {
          // 当前行已满，保存当前行并开始新行
          lines.push(currentLine.trim());
          lineWidths.push(this.measureWidth(currentLine.trim(), style));
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      // 保存最后一行
      if (currentLine) {
        lines.push(currentLine.trim());
        lineWidths.push(this.measureWidth(currentLine.trim(), style));
      }
    }

    // 计算总高度
    const lineHeight = style.fontSize * style.lineHeight;
    const totalHeight = lines.length * lineHeight;

    // 计算最大宽度
    const maxWidthUsed = Math.max(...lineWidths, 0);

    return {
      lines,
      width: maxWidthUsed,
      height: totalHeight,
      lineWidths,
    };
  }

  /**
   * 中英文分词
   * 中文字符单独成词，英文按空格分割
   */
  private splitWords(text: string): string[] {
    const result: string[] = [];
    let currentWord = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 判断是否为中文字符（包括中文标点）
      if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
        // 中文字符
        if (currentWord) {
          result.push(currentWord);
          currentWord = '';
        }
        result.push(char);
      } else if (char === ' ' || char === '\t') {
        // 空白字符，分割单词
        if (currentWord) {
          result.push(currentWord);
          currentWord = '';
        }
        // 保留空格用于英文单词分隔
        result.push(' ');
      } else {
        // 英文和其他字符，累积
        currentWord += char;
      }
    }

    // 保存最后一个单词
    if (currentWord) {
      result.push(currentWord);
    }

    return result;
  }

  /**
   * 测量文本高度
   */
  measureHeight(text: string, style: TextStyle): number {
    const lineHeight = style.fontSize * style.lineHeight;
    const lineCount = text.split('\n').length;
    return lineCount * lineHeight;
  }

  /**
   * 截断文本以适应最大宽度
   */
  truncateText(text: string, style: TextStyle, maxWidth: number, ellipsis = '...'): string {
    if (this.measureWidth(text, style) <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (truncated.length > 0 && this.measureWidth(truncated + ellipsis, style) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }

    return truncated + ellipsis;
  }
}

// 单例导出
export const textMeasurer = new TextMeasurer();
