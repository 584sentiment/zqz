/**
 * AI Canvas Agent 服务
 * 提供 AI 直接操作 tldraw 画布的能力
 */

import type { Editor, TLShapeId } from 'tldraw';
import type {
  AIAgentAction,
  AIAgentResult,
  AIAgentState,
  AIAgentConfig,
  AIAgentCallbacks,
  CreateShapePayload,
  UpdateShapePayload,
  MoveShapePayload,
  DeleteShapePayload,
  SelectShapesPayload,
  ReorderShapesPayload,
  CanvasSnapshot,
  ShapeInfo,
} from './types';

/** 默认配置 */
const DEFAULT_CONFIG: Required<AIAgentConfig> = {
  maxRetries: 3,
  timeout: 30000,
  enableLogging: true,
};

/**
 * AI Canvas Agent 类
 */
export class AICanvasAgent {
  private editor: Editor | null = null;
  private config: Required<AIAgentConfig>;
  private callbacks: AIAgentCallbacks;
  private state: AIAgentState = {
    isProcessing: false,
    recentActions: [],
  };

  constructor(config?: AIAgentConfig, callbacks?: AIAgentCallbacks) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks || {};
  }

  /**
   * 设置编辑器实例
   */
  setEditor(editor: Editor): void {
    this.editor = editor;
  }

  /**
   * 获取当前状态
   */
  getState(): AIAgentState {
    return { ...this.state };
  }

  /**
   * 更新状态
   */
  private updateState(updates: Partial<AIAgentState>): void {
    this.state = { ...this.state, ...updates };
    this.callbacks.onStateChange?.(this.state);
  }

  /**
   * 记录日志
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.log(`[AI Canvas Agent] ${message}`, ...args);
    }
  }

  /**
   * 执行操作
   */
  async executeAction(action: AIAgentAction): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化', error: 'Editor not set' };
    }

    this.updateState({
      isProcessing: true,
      currentAction: this.getActionDescription(action),
    });

    try {
      let result: AIAgentResult;

      switch (action.type) {
        case 'create_shape':
          result = await this.createShape(action.payload as CreateShapePayload);
          break;
        case 'update_shape':
          result = await this.updateShape(action.payload as UpdateShapePayload);
          break;
        case 'move_shape':
          result = await this.moveShape(action.payload as MoveShapePayload);
          break;
        case 'delete_shape':
          result = await this.deleteShape(action.payload as DeleteShapePayload);
          break;
        case 'select_shapes':
          result = await this.selectShapes(action.payload as SelectShapesPayload);
          break;
        case 'reorder_shapes':
          result = await this.reorderShapes(action.payload as ReorderShapesPayload);
          break;
        default:
          result = { success: false, message: '未知操作类型', error: `Unknown action type: ${(action as { type: string }).type}` };
      }

      // 记录操作历史
      this.updateState({
        isProcessing: false,
        currentAction: undefined,
        recentActions: [...this.state.recentActions.slice(-99), action],
      });

      this.callbacks.onActionComplete?.(action, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.updateState({
        isProcessing: false,
        currentAction: undefined,
        error: errorMessage,
      });
      this.callbacks.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return { success: false, message: '操作执行失败', error: errorMessage };
    }
  }

  /**
   * 获取操作描述
   */
  private getActionDescription(action: AIAgentAction): string {
    switch (action.type) {
      case 'create_shape':
        return '创建形状';
      case 'update_shape':
        return '更新形状';
      case 'move_shape':
        return '移动形状';
      case 'delete_shape':
        return '删除形状';
      case 'select_shapes':
        return '选择形状';
      case 'reorder_shapes':
        return '重排序形状';
      default:
        return '未知操作';
    }
  }

  // ============== 形状操作方法 ==============

  /**
   * 创建形状
   */
  private async createShape(payload: CreateShapePayload): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化' };
    }

    try {
      // 使用 any 类型来绕过 tldraw 严格的类型检查
      // tldraw 的 shapeType 必须是其预定义的类型之一，但 AI 可能生成任意字符串
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shape = this.editor.createShape({
        type: payload.shapeType as any,
        x: payload.x,
        y: payload.y,
        props: payload.props,
      });
      this.log('创建形状成功', shape.id);
      return {
        success: true,
        message: '形状创建成功',
        shapeIds: [shape.id] as TLShapeId[],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建失败';
      this.log('创建形状失败', errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    }
  }

  /**
   * 更新形状
   */
  private async updateShape(payload: UpdateShapePayload): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化' };
    }

    try {
      this.editor.updateShape({
        id: payload.shapeId,
        type: this.editor.getShape(payload.shapeId)?.type ?? 'text',
        props: payload.props,
      });
      this.log('更新形状成功', payload.shapeId);
      return {
        success: true,
        message: '形状更新成功',
        shapeIds: [payload.shapeId],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      this.log('更新形状失败', errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    }
  }

  /**
   * 移动形状
   */
  private async moveShape(payload: MoveShapePayload): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化' };
    }

    try {
      this.editor.nudgeShapes(payload.shapeIds, { x: payload.dx, y: payload.dy });
      this.log('移动形状成功', payload.shapeIds);
      return {
        success: true,
        message: '形状移动成功',
        shapeIds: payload.shapeIds,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '移动失败';
      this.log('移动形状失败', errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    }
  }

  /**
   * 删除形状
   */
  private async deleteShape(payload: DeleteShapePayload): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化' };
    }

    try {
      this.editor.deleteShapes(payload.shapeIds);
      this.log('删除形状成功', payload.shapeIds);
      return {
        success: true,
        message: '形状删除成功',
        shapeIds: payload.shapeIds,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      this.log('删除形状失败', errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    }
  }

  /**
   * 选择形状
   */
  private async selectShapes(payload: SelectShapesPayload): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化' };
    }

    try {
      this.editor.setSelectedShapes(payload.shapeIds);
      this.log('选择形状成功', payload.shapeIds);
      return {
        success: true,
        message: '形状选择成功',
        shapeIds: payload.shapeIds,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '选择失败';
      this.log('选择形状失败', errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    }
  }

  /**
   * 重排序形状
   */
  private async reorderShapes(payload: ReorderShapesPayload): Promise<AIAgentResult> {
    if (!this.editor) {
      return { success: false, message: '编辑器未初始化' };
    }

    try {
      switch (payload.order) {
        case 'front':
          this.editor.bringToFront(payload.shapeIds);
          break;
        case 'back':
          this.editor.sendToBack(payload.shapeIds);
          break;
        case 'forward':
          this.editor.bringForward(payload.shapeIds);
          break;
        case 'backward':
          this.editor.sendBackward(payload.shapeIds);
          break;
      }
      this.log('重排序形状成功', payload.shapeIds, payload.order);
      return {
        success: true,
        message: '形状重排序成功',
        shapeIds: payload.shapeIds,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重排序失败';
      this.log('重排序形状失败', errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    }
  }

  // ============== 画布内容读取方法 ==============

  /**
   * 获取画布快照（截图 + 结构化数据）
   */
  async getCanvasSnapshot(): Promise<CanvasSnapshot | null> {
    if (!this.editor) {
      this.log('编辑器未初始化，无法获取快照');
      return null;
    }

    try {
      // 获取所有形状
      const shapes = this.editor.getCurrentPageShapes();

      // 获取结构化数据
      const shapeInfos: ShapeInfo[] = shapes.map((shape) => {
        const bounds = this.editor!.getShapePageBounds(shape);
        return {
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          rotation: shape.rotation,
          opacity: shape.opacity,
          props: shape.props as Record<string, unknown>,
          bounds: bounds
            ? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
            : undefined,
          parentId: String(shape.parentId),
        };
      });

      // 获取 SVG 字符串
      const svgResult = await this.editor.getSvgString(shapes);
      const svgString = svgResult ? svgResult.svg : null;

      // 获取图片 Blob
      const { blob } = await this.editor.toImage(shapes, { format: 'png', background: false });

      this.log('获取画布快照成功，形状数量:', shapes.length);

      return {
        shapes: shapeInfos,
        svgString,
        imageBlob: blob,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取快照失败';
      this.log('获取画布快照失败', errorMessage);
      return null;
    }
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): ShapeInfo[] {
    if (!this.editor) {
      return [];
    }

    const selectedShapes = this.editor.getSelectedShapes();
    return selectedShapes.map((shape) => {
      const bounds = this.editor!.getShapePageBounds(shape);
      return {
        id: shape.id,
        type: shape.type,
        x: shape.x,
        y: shape.y,
        rotation: shape.rotation,
        opacity: shape.opacity,
        props: shape.props as Record<string, unknown>,
        bounds: bounds
          ? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
          : undefined,
        parentId: String(shape.parentId),
      };
    });
  }

  /**
   * 获取文本内容
   */
  getTextContent(): Array<{ id: string; text: string; type: string }> {
    if (!this.editor) {
      return [];
    }

    const shapes = this.editor.getCurrentPageShapes();
    const textShapes = shapes.filter(
      (s) =>
        s.type === 'text' ||
        s.type === 'note' ||
        s.type === 'geo' ||
        'text' in s.props ||
        'richText' in s.props
    );

    return textShapes.map((shape) => ({
      id: String(shape.id),
      type: shape.type,
      text:
        (shape.props as { text?: string; richText?: string }).text ||
        (shape.props as { text?: string; richText?: string }).richText ||
        '',
    }));
  }

  /**
   * 批量执行操作
   */
  async executeBatch(actions: AIAgentAction[]): Promise<AIAgentResult[]> {
    const results: AIAgentResult[] = [];

    for (const action of actions) {
      const result = await this.executeAction(action);
      results.push(result);

      // 如果某个操作失败，可以选择中断
      if (!result.success) {
        this.log('批量操作中断，失败操作:', action.type);
        break;
      }
    }

    return results;
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    if (this.editor) {
      this.editor.selectNone();
    }
  }

  /**
   * 聚焦到指定形状
   */
  zoomToShapes(shapeIds: TLShapeId[]): void {
    if (!this.editor || shapeIds.length === 0) return;

    // 先选中指定的形状
    this.editor.setSelectedShapes(shapeIds);

    // 然后使用 zoomToSelection 来缩放到选中内容
    this.editor.zoomToSelection();
  }
}

// 导出单例实例
export const aiCanvasAgent = new AICanvasAgent();
