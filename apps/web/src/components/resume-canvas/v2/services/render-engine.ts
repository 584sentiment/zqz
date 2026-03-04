/**
 * 绘制引擎
 * 解析和执行绘制指令，渲染到 Canvas
 */

import type {
  RenderPlan,
  DrawCommand,
  RectCommand,
  CircleCommand,
  LineCommand,
  TextCommand,
  TextBlockCommand,
  SkillTagCommand,
  DividerCommand,
  ContainerCommand,
  PageCommand,
  StylePreset,
  BorderRadius,
} from '../types';

/**
 * 绘制引擎
 * 将渲染方案绘制到 Canvas
 */
export class RenderEngine {
  private preset: StylePreset;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(preset: StylePreset) {
    this.preset = preset;
  }

  /**
   * 渲染页面到 Canvas
   */
  renderPage(
    page: PageCommand,
    canvas: HTMLCanvasElement,
    scale: number = 1
  ): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('无法获取 Canvas 上下文');
    }

    // 获取设备像素比，确保高清显示
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const totalScale = scale * dpr;

    // 设置 Canvas 实际尺寸（高分辨率）
    canvas.width = page.size.width * totalScale;
    canvas.height = page.size.height * totalScale;

    // 设置 CSS 显示尺寸
    canvas.style.width = `${page.size.width * scale}px`;
    canvas.style.height = `${page.size.height * scale}px`;

    // 应用缩放
    this.ctx.scale(totalScale, totalScale);

    // 清空画布
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, page.size.width, page.size.height);

    // 绘制页面背景
    if (page.background) {
      this.renderBackground(page.background, {
        x: 0,
        y: 0,
        width: page.size.width,
        height: page.size.height,
      });
    }

    // 按 zIndex 排序并绘制子元素
    const sortedChildren = [...(page.children || [])].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
    );

    for (const command of sortedChildren) {
      this.renderCommand(command);
    }
  }

  /**
   * 渲染单个指令
   */
  private renderCommand(command: DrawCommand): void {
    if (!this.ctx) return;

    switch (command.type) {
      case 'rect':
        this.renderRect(command as RectCommand);
        break;
      case 'circle':
        this.renderCircle(command as CircleCommand);
        break;
      case 'line':
        this.renderLine(command as LineCommand);
        break;
      case 'text':
        this.renderText(command as TextCommand);
        break;
      case 'textBlock':
        this.renderTextBlock(command as TextBlockCommand);
        break;
      case 'skillTag':
        this.renderSkillTag(command as SkillTagCommand);
        break;
      case 'divider':
        this.renderDivider(command as DividerCommand);
        break;
      case 'container':
        this.renderContainer(command as ContainerCommand);
        break;
    }
  }

  /**
   * 渲染矩形
   */
  private renderRect(command: RectCommand): void {
    if (!this.ctx) return;

    const { rect, fill, stroke, strokeWidth, borderRadius, opacity, gradient } = command;

    this.ctx.save();

    if (opacity !== undefined) {
      this.ctx.globalAlpha = opacity;
    }

    // 绘制路径
    this.ctx.beginPath();
    this.drawRoundedRect(rect, borderRadius);

    // 填充
    if (gradient) {
      const grad = this.createGradient(gradient, rect);
      if (grad) {
        this.ctx.fillStyle = grad;
      }
    } else if (fill) {
      this.ctx.fillStyle = fill;
    }

    if (fill || gradient) {
      this.ctx.fill();
    }

    // 描边
    if (stroke && strokeWidth) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * 渲染圆形
   */
  private renderCircle(command: CircleCommand): void {
    if (!this.ctx) return;

    const { center, radius, fill, stroke, strokeWidth, opacity } = command;

    this.ctx.save();

    if (opacity !== undefined) {
      this.ctx.globalAlpha = opacity;
    }

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);

    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }

    if (stroke && strokeWidth) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * 渲染线条
   */
  private renderLine(command: LineCommand): void {
    if (!this.ctx) return;

    const { start, end, stroke, strokeWidth, strokeStyle } = command;

    this.ctx.save();
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = strokeWidth || 1;

    if (strokeStyle === 'dashed') {
      this.ctx.setLineDash([5, 5]);
    } else if (strokeStyle === 'dotted') {
      this.ctx.setLineDash([2, 2]);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * 渲染文本
   */
  private renderText(command: TextCommand): void {
    if (!this.ctx) return;

    const { position, content, style, maxWidth } = command;

    this.ctx.save();

    // 设置字体样式
    this.ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    this.ctx.fillStyle = style.color;
    this.ctx.textBaseline = 'top';

    if (style.textAlign) {
      this.ctx.textAlign = style.textAlign;
    }

    if (maxWidth) {
      // 自动换行
      const lines = this.wrapText(content, maxWidth, style.fontSize);
      const lineHeight = style.fontSize * style.lineHeight;

      lines.forEach((line, index) => {
        this.ctx!.fillText(line, position.x, position.y + index * lineHeight);
      });
    } else {
      this.ctx.fillText(content, position.x, position.y);
    }

    this.ctx.restore();
  }

  /**
   * 渲染文本块
   */
  private renderTextBlock(command: TextBlockCommand): void {
    if (!this.ctx) return;

    const { rect, content, defaultStyle } = command;

    this.ctx.save();

    const lineHeight = defaultStyle.fontSize * defaultStyle.lineHeight;
    let currentY = rect.y;

    for (const item of content) {
      const style = { ...defaultStyle, ...item.style };

      this.ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
      this.ctx.fillStyle = style.color;
      this.ctx.textBaseline = 'top';

      // 自动换行
      const lines = this.wrapText(item.text, rect.width, style.fontSize);

      for (const line of lines) {
        if (currentY + lineHeight > rect.y + rect.height) break;
        this.ctx.fillText(line, rect.x, currentY);
        currentY += lineHeight;
      }
    }

    this.ctx.restore();
  }

  /**
   * 渲染技能标签
   */
  private renderSkillTag(command: SkillTagCommand): void {
    if (!this.ctx) return;

    const { position, skill, matched, style } = command;

    this.ctx.save();

    // 计算标签尺寸
    this.ctx.font = `${style.fontSize}px ${style.fontFamily}`;
    const textWidth = this.ctx.measureText(skill).width;
    const tagWidth = textWidth + style.paddingX * 2;
    const tagHeight = style.fontSize * 1.4 + style.paddingY * 2;

    // 绘制背景
    this.ctx.fillStyle = matched
      ? this.preset.colors.semantic.success + '20' // 浅绿色背景
      : style.backgroundColor;

    this.roundRect(
      position.x,
      position.y,
      tagWidth,
      tagHeight,
      style.borderRadius
    );
    this.ctx.fill();

    // 绘制边框（如果匹配）
    if (matched && style.borderColor) {
      this.ctx.strokeStyle = style.borderColor;
      this.ctx.lineWidth = 1;
      this.roundRect(
        position.x,
        position.y,
        tagWidth,
        tagHeight,
        style.borderRadius
      );
      this.ctx.stroke();
    }

    // 绘制文字
    this.ctx.fillStyle = matched ? '#166534' : style.textColor;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      skill,
      position.x + style.paddingX,
      position.y + tagHeight / 2
    );

    this.ctx.restore();
  }

  /**
   * 渲染分隔线
   */
  private renderDivider(command: DividerCommand): void {
    if (!this.ctx) return;

    const { rect, style, color, thickness } = command;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;

    if (style === 'dashed') {
      this.ctx.setLineDash([5, 5]);
    } else if (style === 'dotted') {
      this.ctx.setLineDash([2, 2]);
    } else if (style === 'double') {
      // 双线
      this.ctx.beginPath();
      this.ctx.moveTo(rect.x, rect.y);
      this.ctx.lineTo(rect.x + rect.width, rect.y);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(rect.x, rect.y + 3);
      this.ctx.lineTo(rect.x + rect.width, rect.y + 3);
      this.ctx.stroke();

      this.ctx.restore();
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(rect.x, rect.y);
    this.ctx.lineTo(rect.x + rect.width, rect.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * 渲染容器
   */
  private renderContainer(command: ContainerCommand): void {
    if (!this.ctx) return;

    const { rect, children, backgroundColor, clip, padding } = command;

    this.ctx.save();

    // 绘制背景
    if (backgroundColor) {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    // 裁剪
    if (clip) {
      this.ctx.beginPath();
      this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
      this.ctx.clip();
    }

    // 计算子元素的偏移
    const offsetX = rect.x + (padding?.left || 0);
    const offsetY = rect.y + (padding?.top || 0);

    // 渲染子元素（应用偏移）
    for (const child of children) {
      this.renderCommandWithOffset(child, offsetX, offsetY);
    }

    this.ctx.restore();
  }

  /**
   * 渲染带偏移的指令
   */
  private renderCommandWithOffset(command: DrawCommand, offsetX: number, offsetY: number): void {
    // 创建带偏移的指令副本
    const offsetCommand = this.applyOffset(command, offsetX, offsetY);
    this.renderCommand(offsetCommand);
  }

  /**
   * 应用偏移到指令
   */
  private applyOffset(command: DrawCommand, offsetX: number, offsetY: number): DrawCommand {
    switch (command.type) {
      case 'rect': {
        const cmd = command as RectCommand;
        return {
          ...cmd,
          rect: {
            x: cmd.rect.x + offsetX,
            y: cmd.rect.y + offsetY,
            width: cmd.rect.width,
            height: cmd.rect.height,
          },
        };
      }
      case 'text': {
        const cmd = command as TextCommand;
        return {
          ...cmd,
          position: {
            x: cmd.position.x + offsetX,
            y: cmd.position.y + offsetY,
          },
        };
      }
      case 'line': {
        const cmd = command as LineCommand;
        return {
          ...cmd,
          start: { x: cmd.start.x + offsetX, y: cmd.start.y + offsetY },
          end: { x: cmd.end.x + offsetX, y: cmd.end.y + offsetY },
        };
      }
      case 'skillTag': {
        const cmd = command as SkillTagCommand;
        return {
          ...cmd,
          position: {
            x: cmd.position.x + offsetX,
            y: cmd.position.y + offsetY,
          },
        };
      }
      case 'container': {
        const cmd = command as ContainerCommand;
        return {
          ...cmd,
          rect: {
            x: cmd.rect.x + offsetX,
            y: cmd.rect.y + offsetY,
            width: cmd.rect.width,
            height: cmd.rect.height,
          },
          children: cmd.children.map((child) =>
            this.applyOffset(child, 0, 0)
          ),
        };
      }
      default:
        return command;
    }
  }

  /**
   * 渲染背景
   */
  private renderBackground(
    background: string | { type: 'gradient'; colors: string[]; direction: string },
    rect: { x: number; y: number; width: number; height: number }
  ): void {
    if (!this.ctx) return;

    if (typeof background === 'string') {
      this.ctx.fillStyle = background;
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else if (background.type === 'gradient') {
      const grad = this.createGradientFromConfig(background, rect);
      if (grad) {
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
  }

  /**
   * 创建渐变
   */
  private createGradient(
    gradient: { type: 'linear' | 'radial'; start: { x: number; y: number }; end: { x: number; y: number }; stops: Array<{ offset: number; color: string }> },
    rect: { x: number; y: number; width: number; height: number }
  ): CanvasGradient | null {
    if (!this.ctx) return null;

    let grad: CanvasGradient;

    if (gradient.type === 'linear') {
      grad = this.ctx.createLinearGradient(
        rect.x + gradient.start.x,
        rect.y + gradient.start.y,
        rect.x + gradient.end.x,
        rect.y + gradient.end.y
      );
    } else {
      grad = this.ctx.createRadialGradient(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        0,
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        Math.max(rect.width, rect.height) / 2
      );
    }

    for (const stop of gradient.stops) {
      grad.addColorStop(stop.offset, stop.color);
    }

    return grad;
  }

  /**
   * 从配置创建渐变
   */
  private createGradientFromConfig(
    config: { type: 'gradient'; colors: string[]; direction: string },
    rect: { x: number; y: number; width: number; height: number }
  ): CanvasGradient | null {
    if (!this.ctx || config.colors.length < 2) return null;

    let grad: CanvasGradient;

    switch (config.direction) {
      case 'horizontal':
        grad = this.ctx.createLinearGradient(rect.x, 0, rect.x + rect.width, 0);
        break;
      case 'vertical':
        grad = this.ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.height);
        break;
      case 'diagonal':
      default:
        grad = this.ctx.createLinearGradient(
          rect.x,
          rect.y,
          rect.x + rect.width,
          rect.y + rect.height
        );
    }

    const step = 1 / (config.colors.length - 1);
    config.colors.forEach((color, index) => {
      grad.addColorStop(index * step, color);
    });

    return grad;
  }

  /**
   * 绘制圆角矩形路径
   */
  private drawRoundedRect(
    rect: { x: number; y: number; width: number; height: number },
    borderRadius?: number | BorderRadius
  ): void {
    if (!this.ctx) return;

    type NormalizedRadius = { tl: number; tr: number; br: number; bl: number };
    const normalizeRadius = (r: number | BorderRadius | undefined): NormalizedRadius => {
      if (typeof r === 'number') {
        return { tl: r, tr: r, br: r, bl: r };
      }
      if (r) {
        return {
          tl: r.topLeft,
          tr: r.topRight,
          br: r.bottomRight,
          bl: r.bottomLeft,
        };
      }
      return { tl: 0, tr: 0, br: 0, bl: 0 };
    };

    const r = normalizeRadius(borderRadius);

    const { x, y, width, height } = rect;

    this.ctx.moveTo(x + r.tl, y);
    this.ctx.lineTo(x + width - r.tr, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    this.ctx.lineTo(x + width, y + height - r.br);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    this.ctx.lineTo(x + r.bl, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    this.ctx.lineTo(x, y + r.tl);
    this.ctx.quadraticCurveTo(x, y, x + r.tl, y);
    this.ctx.closePath();
  }

  /**
   * 绘制圆角矩形（填充）
   */
  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * 文本换行
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    if (!this.ctx) return [text];

    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      const words = paragraph.split('');
      let currentLine = '';

      for (const char of words) {
        const testLine = currentLine + char;
        const metrics = this.ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }
}

/**
 * 创建绘制引擎
 */
export function createRenderEngine(preset: StylePreset): RenderEngine {
  return new RenderEngine(preset);
}
