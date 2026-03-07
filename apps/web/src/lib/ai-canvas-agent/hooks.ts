/**
 * AI Canvas Agent React Hooks
 * 用于在 React 组件中访问和使用 AI Canvas Agent
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from 'tldraw';
import { AICanvasAgent } from './agent';
import type {
  CanvasSnapshot,
  AIAgentResult,
  AIAgentState,
  CreateShapePayload,
  UpdateShapePayload,
  MoveShapePayload,
  DeleteShapePayload,
  AIAgentAction,
  ShapeInfo,
} from './types';

/**
 * 使用 AI Canvas Agent 的 Hook
 */
export function useAICanvasAgent(editor: Editor | null) {
  const agentRef = useRef<AICanvasAgent | null>(null);
  const [state, setState] = useState<AIAgentState>({
    isProcessing: false,
    recentActions: [],
  });

  // 初始化 agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new AICanvasAgent(
        { enableLogging: true },
        {
          onStateChange: setState,
          onActionComplete: (action, result) => {
            console.log('[AI Canvas Agent] 操作完成:', action.type, result.success);
          },
          onError: (error) => {
            console.error('[AI Canvas Agent] 错误:', error);
          },
        }
      );
    }

    if (editor) {
      agentRef.current.setEditor(editor);
    }
  }, [editor]);

  /**
   * 创建形状
   */
  const createShape = useCallback(
    async (payload: CreateShapePayload): Promise<AIAgentResult> => {
      if (!agentRef.current) {
        return { success: false, message: 'Agent 未初始化' };
      }
      return agentRef.current.executeAction({
        type: 'create_shape',
        payload,
      });
    },
    []
  );

  /**
   * 更新形状
   */
  const updateShape = useCallback(
    async (payload: UpdateShapePayload): Promise<AIAgentResult> => {
      if (!agentRef.current) {
        return { success: false, message: 'Agent 未初始化' };
      }
      return agentRef.current.executeAction({
        type: 'update_shape',
        payload,
      });
    },
    []
  );

  /**
   * 移动形状
   */
  const moveShape = useCallback(
    async (payload: MoveShapePayload): Promise<AIAgentResult> => {
      if (!agentRef.current) {
        return { success: false, message: 'Agent 未初始化' };
      }
      return agentRef.current.executeAction({
        type: 'move_shape',
        payload,
      });
    },
    []
  );

  /**
   * 删除形状
   */
  const deleteShape = useCallback(
    async (payload: DeleteShapePayload): Promise<AIAgentResult> => {
      if (!agentRef.current) {
        return { success: false, message: 'Agent 未初始化' };
      }
      return agentRef.current.executeAction({
        type: 'delete_shape',
        payload,
      });
    },
    []
  );

  /**
   * 批量执行操作
   */
  const executeBatch = useCallback(
    async (actions: AIAgentAction[]): Promise<AIAgentResult[]> => {
      if (!agentRef.current) {
        return actions.map(() => ({ success: false, message: 'Agent 未初始化' }));
      }
      return agentRef.current.executeBatch(actions);
    },
    []
  );

  /**
   * 获取画布快照
   */
  const getCanvasSnapshot = useCallback(async (): Promise<CanvasSnapshot | null> => {
    if (!agentRef.current) {
      console.warn('[useAICanvasAgent] Agent not initialized');
      return null;
    }
    return agentRef.current.getCanvasSnapshot();
  }, []);

  /**
   * 获取选中的形状
   */
  const getSelectedShapes = useCallback((): ShapeInfo[] => {
    if (!agentRef.current) return [];
    return agentRef.current.getSelectedShapes();
  }, []);

  /**
   * 获取文本内容
   */
  const getTextContent = useCallback((): Array<{ id: string; text: string; type: string }> => {
    if (!agentRef.current) return [];
    return agentRef.current.getTextContent();
  }, []);

  /**
   * 清除选择
   */
  const clearSelection = useCallback(() => {
    if (agentRef.current) {
      agentRef.current.clearSelection();
    }
  }, []);

  return {
    // 状态
    ...state,
    // 形状操作
    createShape,
    updateShape,
    moveShape,
    deleteShape,
    executeBatch,
    // 画布内容读取
    getCanvasSnapshot,
    getSelectedShapes,
    getTextContent,
    // 工具方法
    clearSelection,
  };
}

/**
 * 使用画布快照的 Hook
 */
export function useCanvasSnapshot(editor: Editor | null) {
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const captureSnapshot = useCallback(async () => {
    if (!editor) return null;

    setIsLoading(true);
    try {
      const shapes = editor.getCurrentPageShapes();
      const svgResult = await editor.getSvgString(shapes);
      const { blob } = await editor.toImage(shapes, { format: 'png', background: false });

      const snapshot: CanvasSnapshot = {
        shapes: shapes.map((shape) => {
          const bounds = editor.getShapePageBounds(shape);
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
        }),
        svgString: svgResult ? svgResult.svg : null,
        imageBlob: blob,
        timestamp: Date.now(),
      };

      setSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      console.error('[useCanvasSnapshot] 捕获快照失败:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [editor]);

  return {
    snapshot,
    isLoading,
    captureSnapshot,
  };
}
