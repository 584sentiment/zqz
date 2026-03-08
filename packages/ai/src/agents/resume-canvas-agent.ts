/**
 * 简历画布 AI 代理
 * 负责理解画布内容并执行 AI 指令
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { getAIManager } from '../providers';
import { withTimeoutAndMetrics, AIServiceError, AIServiceErrorCode } from '../services';

/**
 * AI 代理感知数据
 */
export interface AgentPerception {
  /** 画布截图 (Base64) */
  screenshot?: string;
  /** 形状结构化数据 */
  shapes: any[];
  /** 视口信息 */
  viewport: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * AI 操作类型
 */
export type AgentActionType = 'create' | 'update' | 'delete' | 'move' | 'resize' | 'batch';

/**
 * AI 操作
 */
export interface AgentAction {
  type: AgentActionType;
  /** 目标形状 ID (update/delete/move/resize) */
  shapeId?: string;
  /** 形状数据 (create/update) */
  shape?: any;
  /** 批量操作 (batch) */
  actions?: AgentAction[];
  /** 位置 (move) */
  x?: number;
  y?: number;
  /** 尺寸 (resize) */
  width?: number;
  height?: number;
}

/**
 * AI 操作计划
 */
export interface AgentPlan {
  /** AI 对用户意图的理解 */
  understanding: string;
  /** 操作列表 */
  actions: AgentAction[];
  /** AI 回复 */
  response: string;
}

/**
 * 简历画布 AI 代理类
 *
 * 使用示例：
 * ```typescript
 * const agent = new ResumeCanvasAgent()
 * const response = await agent.chat('请把技能部分向上移动', {
 *   getShapes: () => editor.getCurrentPageShapes(),
 *   toImage: () => editor.toImage(...),
 *   executeActions: (actions) => { ... }
 * })
 * ```
 */
export class ResumeCanvasAgent {
  private llm: BaseChatModel;

  constructor() {
    this.llm = getAIManager().getProvider('deepseek');
  }

  /**
   * 1. 感知 - 获取画布当前状态
   */
  async perceive(context: {
    getShapes: () => any[];
    toImage?: () => Promise<Blob>;
    getViewport?: () => { x: number; y: number; z: number };
  }): Promise<AgentPerception> {
    // 获取形状数据
    const shapes = context.getShapes();

    // 获取截图（可选）
    let screenshot: string | undefined;
    if (context.toImage) {
      try {
        const blob = await context.toImage();
        screenshot = await this.blobToBase64(blob);
      } catch (error) {
        console.warn('[AI Agent] 截图失败:', error);
      }
    }

    // 获取视口信息
    const viewport = context.getViewport?.() || { x: 0, y: 0, z: 1 };

    return {
      screenshot,
      shapes: this.extractResumeData(shapes),
      viewport,
    };
  }

  /**
   * 2. 理解 - 分析用户指令并生成操作计划
   */
  async understand(userMessage: string, perception: AgentPerception): Promise<AgentPlan> {
    try {
      const response = await withTimeoutAndMetrics(
        'AI 简历代理理解',
        this.llm.invoke([
          new SystemMessage(this.buildSystemPrompt(perception)),
          new HumanMessage(userMessage),
        ]),
        30000, // 30 秒超时
        5000 // 5 秒首字节阈值
      );

      const text = response.result.content as string;

      // 提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError('AI 代理返回格式异常', AIServiceErrorCode.INVALID_RESPONSE, true);
      }

      const plan = JSON.parse(jsonMatch[0]) as AgentPlan;

      // 验证操作
      this.validateActions(plan.actions);

      return plan;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      console.error('[AI Agent] 理解失败:', error);
      throw new AIServiceError(
        'AI 代理理解失败，请稍后重试',
        AIServiceErrorCode.UNKNOWN,
        true,
        error
      );
    }
  }

  /**
   * 3. 执行 - 应用 AI 操作
   */
  async execute(
    actions: AgentAction[],
    executor: (action: AgentAction) => void | Promise<void>
  ): Promise<void> {
    for (const action of actions) {
      try {
        await executor(action);
      } catch (error) {
        console.error('[AI Agent] 执行操作失败:', action, error);
        // 继续执行其他操作
      }
    }
  }

  /**
   * 4. 完整对话循环
   */
  async chat(
    userMessage: string,
    context: {
      getShapes: () => any[];
      toImage?: () => Promise<Blob>;
      getViewport?: () => { x: number; y: number; z: number };
      executeActions: (action: AgentAction) => void | Promise<void>;
    }
  ): Promise<string> {
    // 1. 感知画布
    const perception = await this.perceive(context);

    // 2. 理解用户意图
    const plan = await this.understand(userMessage, perception);

    // 3. 执行操作
    await this.execute(plan.actions, context.executeActions);

    // 4. 返回 AI 回复
    return plan.response;
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(perception: AgentPerception): string {
    return `你是一个专业的简历编辑助手。用户会描述他们想要对简历进行的修改。

当前画布状态（JSON）：
${JSON.stringify(perception.shapes, null, 2)}

【你的任务】
1. 理解用户的修改需求
2. 分析当前简历结构
3. 生成具体的操作计划

【操作类型】
- create: 创建新形状
- update: 更新形状属性
- delete: 删除形状
- move: 移动形状位置
- resize: 调整形状尺寸
- batch: 批量执行多个操作

【重要规则】
1. 只修改必要的形状
2. 保持简历的整体布局和美观
3. 操作要精确，避免影响其他元素
4. 返回的 JSON 必须符合指定格式

请以严格的 JSON 格式返回操作计划：
{
  "understanding": "简要描述用户想要做什么",
  "actions": [
    {
      "type": "操作类型",
      "shapeId": "目标形状 ID（如果需要）",
      "shape": { /* 形状数据（create/update） */ },
      "x": 新的 x 坐标（move）,
      "y": 新的 y 坐标（move）,
      "width": 新宽度（resize）,
      "height": 新高度（resize）
    }
  ],
  "response": "给用户的友好回复"
}

示例：
用户："把工作经历向上移动一点"
回复：
{
  "understanding": "用户想要将工作经历区块向上移动",
  "actions": [
    {
      "type": "move",
      "shapeId": "shape:experience-section",
      "x": 50,
      "y": 250
    }
  ],
  "response": "好的，我已经将工作经历区块向上移动了"
}`;
  }

  /**
   * 提取简历数据（简化版）
   */
  private extractResumeData(shapes: any[]): any[] {
    return shapes.map((shape) => ({
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      // 只包含关键 props
      props: {
        text: shape.props?.text || shape.props?.richText,
        w: shape.props?.w,
        h: shape.props?.h,
        color: shape.props?.color,
      },
    }));
  }

  /**
   * 验证操作
   */
  private validateActions(actions: AgentAction[]): void {
    if (!Array.isArray(actions)) {
      throw new AIServiceError('操作列表必须是数组', AIServiceErrorCode.INVALID_RESPONSE, true);
    }

    for (const action of actions) {
      if (!action.type) {
        throw new AIServiceError(
          '操作必须包含 type 字段',
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }

      // 验证操作类型
      const validTypes: AgentActionType[] = [
        'create',
        'update',
        'delete',
        'move',
        'resize',
        'batch',
      ];
      if (!validTypes.includes(action.type)) {
        throw new AIServiceError(
          `无效的操作类型: ${action.type}`,
          AIServiceErrorCode.INVALID_RESPONSE,
          true
        );
      }
    }
  }

  /**
   * Blob 转 Base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    // 使用 Blob.arrayBuffer() 方法（Node.js 和浏览器都支持）
    const buffer = await blob.arrayBuffer();
    if (!buffer) {
      throw new Error('Failed to read blob data');
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const length = bytes.length; // 使用 length 而不是 byteLength
    for (let i = 0; i < length; i++) {
      binary += String.fromCharCode(bytes[i]!); // 非空断言
    }
    return `data:${blob.type};base64,${btoa(binary)}`;
  }
}

// 单例
let resumeCanvasAgent: ResumeCanvasAgent | null = null;

/**
 * 获取简历画布 AI 代理单例
 */
export function getResumeCanvasAgent(): ResumeCanvasAgent {
  if (!resumeCanvasAgent) {
    resumeCanvasAgent = new ResumeCanvasAgent();
  }
  return resumeCanvasAgent;
}
