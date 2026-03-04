/**
 * LLM 绘制指令生成服务
 *
 * 通过后端 API 调用 AI 服务生成绘制指令
 */

import type { ResumeContent, StylePreset, RenderPlan, PageCommand, DrawCommand } from '../types';

/**
 * 渲染方案生成器
 * 通过后端 API 生成绘制指令
 */
export class RenderPlanGenerator {
  private apiUrl: string;

  constructor(config?: { apiUrl?: string }) {
    this.apiUrl = config?.apiUrl || '/api/ai/render-plan';
  }

  /**
   * 生成渲染方案
   */
  async generate(
    resumeContent: ResumeContent,
    stylePreset: StylePreset
  ): Promise<RenderPlan> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeContent,
          stylePreset,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API 请求失败: ${response.status}`);
      }

      const data = await response.json();

      // 验证并修正
      return this.validateAndFix(data, stylePreset);
    } catch (error) {
      console.error('生成渲染方案失败:', error);
      throw error;
    }
  }

  /**
   * 验证并修正渲染方案
   */
  private validateAndFix(plan: RenderPlan, preset: StylePreset): RenderPlan {
    // 确保 version 存在
    if (!plan.version) {
      plan.version = '1.0';
    }

    // 确保 presetId 正确
    plan.presetId = preset.id;

    // 确保页面存在
    if (!plan.pages || plan.pages.length === 0) {
      plan.pages = [{
        id: 'page-1',
        type: 'page',
        number: 1,
        size: preset.constraints.pageSize,
        children: [],
      }];
    }

    // 确保元数据存在
    if (!plan.meta) {
      plan.meta = {
        generatedAt: new Date().toISOString(),
        model: 'deepseek-chat',
      };
    }

    // 验证每个页面的指令
    plan.pages = plan.pages.map((page, index) => {
      // 确保页面属性完整
      const fixedPage: PageCommand = {
        id: page.id || `page-${index + 1}`,
        type: 'page',
        number: index + 1,
        size: page.size || preset.constraints.pageSize,
        children: this.validateCommands(page.children || []),
      };
      return fixedPage;
    });

    return plan;
  }

  /**
   * 验证绘制指令
   */
  private validateCommands(commands: unknown[]): DrawCommand[] {
    return commands.map((cmd, index) => {
      if (typeof cmd !== 'object' || cmd === null) {
        return { id: `cmd-${index + 1}`, type: 'text' } as DrawCommand;
      }
      const command = cmd as Record<string, unknown>;
      // 确保 id 存在
      if (!command.id) {
        command.id = `cmd-${index + 1}`;
      }
      return command as unknown as DrawCommand;
    });
  }
}

/**
 * 创建渲染方案生成器
 */
export function createRenderPlanGenerator(config?: {
  apiUrl?: string;
}): RenderPlanGenerator {
  return new RenderPlanGenerator(config);
}

/** 简历渲染指令生成的 Prompt 模板（用于后端） */
export const RESUME_RENDER_PROMPT = `你是一位专业的简历排版设计师。你的任务是根据简历内容和样式预设，生成精确的绘制指令。

## 输入信息

### 样式预设
\`\`\`json
{stylePreset}
\`\`\`

### 简历内容
\`\`\`json
{resumeContent}
\`\`\`

## 页面规格

- 页面尺寸：595 x 842 像素（A4）
- 安全区域：上45、右45、下45、左45 像素
- 可用内容区域：505 x 752 像素

## 绘制指令规范

你需要生成一个 JSON 格式的渲染方案，包含以下指令类型：

### 1. 矩形指令 (rect)
用于绘制背景色块、装饰条等。
\`\`\`json
{
  "id": "unique-id",
  "type": "rect",
  "rect": { "x": 0, "y": 0, "width": 595, "height": 120 },
  "fill": "#1e40af",
  "borderRadius": 0
}
\`\`\`

### 2. 文本指令 (text)
用于绘制单行文本。
\`\`\`json
{
  "id": "unique-id",
  "type": "text",
  "position": { "x": 45, "y": 50 },
  "content": "张三",
  "style": {
    "fontFamily": "sans-serif",
    "fontSize": 28,
    "fontWeight": "bold",
    "color": "#0f172a",
    "lineHeight": 1.2,
    "textAlign": "left"
  },
  "maxWidth": 400
}
\`\`\`

### 3. 文本块指令 (textBlock)
用于绘制多行文本区域（如工作描述）。
\`\`\`json
{
  "id": "unique-id",
  "type": "textBlock",
  "rect": { "x": 45, "y": 200, "width": 505, "height": 60 },
  "content": [
    { "text": "• 负责公司核心产品的前端开发" },
    { "text": "• 带领5人团队完成多个项目" }
  ],
  "defaultStyle": {
    "fontFamily": "sans-serif",
    "fontSize": 11,
    "fontWeight": "normal",
    "color": "#374151",
    "lineHeight": 1.6
  }
}
\`\`\`

### 4. 线条指令 (line)
用于绘制分隔线。
\`\`\`json
{
  "id": "unique-id",
  "type": "line",
  "start": { "x": 45, "y": 100 },
  "end": { "x": 550, "y": 100 },
  "stroke": "#e5e7eb",
  "strokeWidth": 1,
  "strokeStyle": "solid"
}
\`\`\`

### 5. 技能标签指令 (skillTag)
用于绘制技能标签。
\`\`\`json
{
  "id": "unique-id",
  "type": "skillTag",
  "position": { "x": 45, "y": 300 },
  "skill": "React",
  "matched": true,
  "style": {
    "backgroundColor": "#eff6ff",
    "textColor": "#2563eb",
    "borderRadius": 16,
    "paddingX": 12,
    "paddingY": 6,
    "fontSize": 10,
    "fontFamily": "sans-serif",
    "borderColor": "#22c55e"
  }
}
\`\`\`

### 6. 容器指令 (container)
用于分组多个元素。
\`\`\`json
{
  "id": "unique-id",
  "type": "container",
  "rect": { "x": 0, "y": 45, "width": 180, "height": 752 },
  "children": [...],
  "backgroundColor": "#1e40af",
  "padding": { "top": 20, "right": 15, "bottom": 20, "left": 15 }
}
\`\`\`

## 设计原则

1. **层级清晰**：姓名 > 区块标题 > 副标题 > 正文
2. **对齐一致**：同类元素保持对齐
3. **间距合理**：区块间留白充足，内容紧凑但不拥挤
4. **视觉引导**：通过颜色、大小引导视线
5. **内容优先**：确保关键信息突出

## 布局策略

根据样式预设的 designIntent 选择合适的布局：

1. **左侧边栏布局**：侧边栏约30%宽度，深色背景，放置联系方式、技能、教育
2. **顶部横幅布局**：顶部120px高度横幅，渐变背景，放置姓名和职位
3. **双栏布局**：左栏55%，放置工作经历和项目；右栏45%，放置技能和教育
4. **单栏布局**：传统自上而下排列

## 输出格式

返回完整的 JSON，格式如下：

\`\`\`json
{
  "version": "1.0",
  "presetId": "modern",
  "pages": [
    {
      "id": "page-1",
      "type": "page",
      "number": 1,
      "size": { "width": 595, "height": 842 },
      "children": []
    }
  ],
  "meta": {
    "generatedAt": "2024-01-01T00:00:00Z",
    "model": "deepseek-chat"
  }
}
\`\`\`

## 重要约束

1. **精确坐标**：所有坐标必须是具体数值，不要使用相对值
2. **内容完整**：确保所有简历内容都被渲染
3. **避免溢出**：内容不要超出页面边界
4. **分页处理**：如果内容超出一页，需要创建多页
5. **ID唯一**：每个指令的 id 必须唯一

请根据以上规范，生成简历的渲染方案：`;
