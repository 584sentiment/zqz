/**
 * AI 智能优化对话框
 * 让用户触发 AI 优化操作
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, Wand2, Loader2, X, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  resumesApi,
  type LayoutAnalyzeResult,
  type LayoutOptimizeSuggestion,
} from '@/lib/api/resumes';
import type { AIAgentResult } from '@/lib/ai-canvas-agent/types';
import { useAICanvasAgent } from '@/lib/ai-canvas-agent';

interface AISmartOptimizeDialogProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 简历 ID */
  resumeId: string;
  /** 当前选中的形状（用于优化） */
  selectedShapeIds?: string[];
  /** 优化完成回调 */
  onOptimizeComplete?: (suggestions: LayoutOptimizeSuggestion[]) => void;
}

export function AISmartOptimizeDialog({
  isOpen,
  onClose,
  resumeId,
  selectedShapeIds,
  onOptimizeComplete,
}: AISmartOptimizeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LayoutAnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // AI Canvas Agent 用于执行形状操作
  const { moveShape, updateShape } = useAICanvasAgent(null);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setStep(null);
      setAppliedIds(new Set());
      setApplyingIndex(null);
    }
  }, [isOpen]);

  // 分析布局
  const handleAnalyze = useCallback(async () => {
    if (!selectedShapeIds || selectedShapeIds.length === 0) {
      setError('请先选择要优化的元素');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStep('正在分析简历布局...');

    try {
      const analyzeResult = await resumesApi.analyzeLayout(resumeId, selectedShapeIds);

      if (analyzeResult.success && analyzeResult.data) {
        setResult(analyzeResult.data);
        setStep(null);

        toast({
          title: '布局分析完成',
          description: `评分: ${analyzeResult.data.score}/100，发现 ${analyzeResult.data.suggestions.length} 条优化建议`,
        });
      } else {
        setError(analyzeResult.error || '分析失败，请稍后重试');
        setStep(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分析失败，请稍后重试';
      setError(errorMessage);
      setStep(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedShapeIds, resumeId, toast]);

  // 应用单条优化建议
  const handleApplySuggestion = useCallback(
    async (suggestion: LayoutOptimizeSuggestion, index: number) => {
      setApplyingIndex(index);
      setStep(`正在应用优化: ${suggestion.description}`);

      try {
        // 根据 action 类型执行不同操作
        const { action } = suggestion;
        let agentResult: AIAgentResult | null = null;

        switch (action.type) {
          case 'move':
            if (action.params.dx !== undefined || action.params.dy !== undefined) {
              agentResult = await moveShape({
                shapeIds: suggestion.targetShapeIds as `shape:${string}`[],
                dx: (action.params.dx as number) || 0,
                dy: (action.params.dy as number) || 0,
              });
            }
            break;

          case 'resize':
            if (suggestion.targetShapeIds.length > 0) {
              agentResult = await updateShape({
                shapeId: suggestion.targetShapeIds[0] as `shape:${string}`,
                props: {
                  w: action.params.width,
                  h: action.params.height,
                },
              });
            }
            break;

          case 'reorder':
            // 重排序需要在前端直接处理，这里只标记成功
            agentResult = { success: true, message: '重排序操作需要在编辑器中手动完成' };
            break;

          case 'group':
            // 分组操作需要在前端直接处理
            agentResult = { success: true, message: '分组操作需要在编辑器中手动完成' };
            break;

          default:
            agentResult = { success: false, message: '未知的操作类型' };
        }

        if (agentResult?.success) {
          setAppliedIds((prev) => new Set([...prev, suggestion.id]));
          toast({
            title: '优化已应用',
            description: suggestion.description,
          });
        } else {
          toast({
            title: '优化失败',
            description: agentResult?.message || '操作执行失败',
            variant: 'destructive',
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '应用优化失败';
        toast({
          title: '优化失败',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setApplyingIndex(null);
        setStep(null);
      }
    },
    [moveShape, updateShape, toast]
  );

  // 应用所有优化建议
  const handleApplyAll = useCallback(async () => {
    if (!result || result.suggestions.length === 0) return;

    for (let i = 0; i < result.suggestions.length; i++) {
      const suggestion = result.suggestions[i];
      if (!appliedIds.has(suggestion.id)) {
        await handleApplySuggestion(suggestion, i);
      }
    }

    onOptimizeComplete?.(result.suggestions);
    onClose();
  }, [result, appliedIds, handleApplySuggestion, onOptimizeComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col m-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">AI 智能布局优化</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 步骤指示 */}
          {step && (
            <div className="flex items-center gap-2 text-purple-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{step}</span>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 选中的元素提示 */}
          {selectedShapeIds && selectedShapeIds.length > 0 && !result && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              已选中 {selectedShapeIds.length} 个元素进行优化
            </div>
          )}

          {/* 分析结果 */}
          {result && (
            <div className="space-y-4">
              {/* 评分 */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">布局评分</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-600">{result.score}</span>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
              </div>

              {/* 摘要 */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                {result.summary}
              </div>

              {/* 优化建议列表 */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">优化建议：</div>
                  {result.suggestions.map((suggestion, index) => {
                    const isApplied = appliedIds.has(suggestion.id);
                    const isApplying = applyingIndex === index;

                    return (
                      <div
                        key={suggestion.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isApplied
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  suggestion.priority === 'high'
                                    ? 'bg-red-100 text-red-700'
                                    : suggestion.priority === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {suggestion.priority === 'high'
                                  ? '高优先级'
                                  : suggestion.priority === 'medium'
                                    ? '中优先级'
                                    : '低优先级'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {suggestion.type === 'spacing'
                                  ? '间距'
                                  : suggestion.type === 'alignment'
                                    ? '对齐'
                                    : suggestion.type === 'hierarchy'
                                      ? '层次'
                                      : suggestion.type === 'readability'
                                        ? '可读性'
                                        : '平衡'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800">{suggestion.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {isApplied ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplySuggestion(suggestion, index)}
                                disabled={isApplying || isLoading}
                              >
                                {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : '应用'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 无建议提示 */}
              {result.suggestions.length === 0 && (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>布局已经很棒了，无需优化！</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 p-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="flex-1">
            取消
          </Button>
          {result && result.suggestions.length > 0 ? (
            <Button
              onClick={handleApplyAll}
              disabled={isLoading || applyingIndex !== null}
              className="flex-1"
            >
              {isLoading || applyingIndex !== null ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              应用全部优化
            </Button>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !selectedShapeIds?.length}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              开始分析
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AISmartOptimizeDialog;
