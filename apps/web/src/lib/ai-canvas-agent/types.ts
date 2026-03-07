/**
 * AI Canvas Agent 类型定义
 * 用于 AI 直接操作 tldraw 画布
 */

import type { TLShapeId } from 'tldraw';

/** AI Agent 操作类型 */
export type AIAgentActionType =
  | 'create_shape'
  | 'update_shape'
  | 'delete_shape'
  | 'move_shape'
  | 'select_shapes'
  | 'group_shapes'
  | 'ungroup_shapes'
  | 'reorder_shapes';

/** AI Agent 操作 */
export interface AIAgentAction {
  /** 操作类型 */
  type: AIAgentActionType;
  /** 操作数据 */
  payload: unknown;
  /** 操作描述（用于日志和反馈） */
  description?: string;
}

/** 创建形状操作数据 */
export interface CreateShapePayload {
  /** 形状类型 */
  shapeType: string;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 形状属性 */
  props?: Record<string, unknown>;
}

/** 更新形状操作数据 */
export interface UpdateShapePayload {
  /** 形状 ID */
  shapeId: TLShapeId;
  /** 要更新的属性 */
  props: Record<string, unknown>;
}

/** 移动形状操作数据 */
export interface MoveShapePayload {
  /** 形状 ID 列表 */
  shapeIds: TLShapeId[];
  /** X 偏移 */
  dx: number;
  /** Y 偏移 */
  dy: number;
}

/** 删除形状操作数据 */
export interface DeleteShapePayload {
  /** 形状 ID 列表 */
  shapeIds: TLShapeId[];
}

/** 选择形状操作数据 */
export interface SelectShapesPayload {
  /** 形状 ID 列表 */
  shapeIds: TLShapeId[];
}

/** 重排序形状操作数据 */
export interface ReorderShapesPayload {
  /** 形状 ID 列表 */
  shapeIds: TLShapeId[];
  /** 排序方式 */
  order: 'front' | 'back' | 'forward' | 'backward';
}

/** AI Agent 执行结果 */
export interface AIAgentResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 创建/更新的形状 ID */
  shapeIds?: TLShapeId[];
  /** 错误信息 */
  error?: string;
}

/** 画布内容快照 */
export interface CanvasSnapshot {
  /** 所有形状信息 */
  shapes: ShapeInfo[];
  /** SVG 字符串 */
  svgString: string | null;
  /** 图片 Blob */
  imageBlob: Blob | null;
  /** 导出时间 */
  timestamp: number;
}

/** 形状信息（用于画布快照） */
export interface ShapeInfo {
  /** 形状 ID */
  id: TLShapeId;
  /** 形状类型 */
  type: string;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 旋转角度 */
  rotation: number;
  /** 透明度 */
  opacity: number;
  /** 形状属性 */
  props: Record<string, unknown>;
  /** 边界 */
  bounds?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** 父元素 ID */
  parentId: string;
}

/** AI Agent 状态 */
export interface AIAgentState {
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 当前操作描述 */
  currentAction?: string;
  /** 进度（0-100） */
  progress?: number;
  /** 错误信息 */
  error?: string;
  /** 最近执行的操作 */
  recentActions: AIAgentAction[];
}

/** AI Agent 配置 */
export interface AIAgentConfig {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 操作超时时间（毫秒） */
  timeout?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/** AI Agent 回调 */
export interface AIAgentCallbacks {
  /** 状态变化回调 */
  onStateChange?: (state: AIAgentState) => void;
  /** 操作完成回调 */
  onActionComplete?: (action: AIAgentAction, result: AIAgentResult) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}
