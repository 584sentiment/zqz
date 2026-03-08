/**
 * AI 编辑面板组件
 *
 * 功能：
 * - AI 优化选中内容
 * - AI 润色单个区块
 * - 快捷操作
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Wand2, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColorTheme } from '@ai-job-assistant/shared';
import type {
  ResumeShape,
  CanvasResume,
  TextShapeProps,
  SectionTitleShapeProps,
  TagShapeProps,
} from '../types/canvas-resume.types';
import { AIContentConverter } from '../services/ai-content-converter';

// ============== 类型定义 ==============

/** AI 编辑操作类型 */
export type AIEditAction =
  | 'optimize' // 优化选中内容
  | 'polish' // 润色
  | 'expand' // 扩展
  | 'summarize' // 总结
  | 'translate' // 翻译
  | 'custom'; // 自定义

/** AI 编辑请求 */
export interface AIEditRequest {
  action: AIEditAction;
  content: string;
  context?: {
    blockType?: string;
    jobDescription?: string;
    targetRole?: string;
  };
}

/** AI 编辑响应 */
export interface AIEditResponse {
  success: boolean;
  originalContent: string;
  optimizedContent: string;
  suggestions?: string[];
  error?: string;
}

/** 区块润色选项 */
export interface BlockPolishOption {
  id: string;
  type: string;
  title: string;
  description: string;
}

/** AI 编辑面板 Props */
export interface AIEditorPanelProps {
  /** 简历 ID */
  resumeId: string;
  /** 当前主题 */
  theme?: ColorTheme;
  /** 选中的形状 */
  selectedShapes: ResumeShape[];
  /** 获取选中内容的文本 */
  getSelectedText?: () => string;
  /** 应用 AI 修改 */
  onApplyEdit: (shapes: ResumeShape[]) => void;
  /** 更新单个区块 */
  onUpdateBlock?: (blockId: string, content: unknown) => void;
  /** 目标岗位描述（用于 AI 优化） */
  jobDescription?: string;
  /** 目标角色 */
  targetRole?: string;
  /** 自定义类名 */
  className?: string;
  /** 折叠状态 */
  collapsed?: boolean;
  /** 折叠状态变化回调 */
  onCollapsedChange?: (collapsed: boolean) => void;
}

// ============== 区块润色选项 ==============

const BLOCK_POLISH_OPTIONS: BlockPolishOption[] = [
  {
    id: 'summary',
    type: 'summary',
    title: '个人简介',
    description: '优化简介内容，突出核心竞争力',
  },
  {
    id: 'experience',
    type: 'experience',
    title: '工作经历',
    description: '优化成就描述，使用量化数据',
  },
  {
    id: 'skills',
    type: 'skills',
    title: '技能列表',
    description: '调整技能顺序，突出匹配技能',
  },
  {
    id: 'projects',
    type: 'projects',
    title: '项目经历',
    description: '优化项目描述，突出技术亮点',
  },
];

// ============== 快捷操作 ==============

const QUICK_ACTIONS = [
  {
    id: 'optimize',
    label: '优化选中',
    icon: Sparkles,
    prompt: '请优化选中的内容，使其更加专业和有说服力',
  },
  { id: 'polish', label: '润色文字', icon: Wand2, prompt: '请润色选中的文字，使其更加流畅和专业' },
  { id: 'expand', label: '扩展内容', icon: ChevronDown, prompt: '请扩展选中的内容，添加更多细节' },
  { id: 'summarize', label: '精简总结', icon: ChevronUp, prompt: '请精简选中的内容，保留核心信息' },
];

// ============== 组件 ==============

/**
 * AI 编辑面板
 */
export function AIEditorPanel({
  resumeId,
  theme = 'modern',
  selectedShapes,
  getSelectedText,
  onApplyEdit,
  onUpdateBlock,
  jobDescription,
  targetRole,
  className,
  collapsed = false,
  onCollapsedChange,
}: AIEditorPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState<AIEditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'selection' | 'block' | 'custom'>('selection');

  // 检查是否有选中内容
  const hasSelection = selectedShapes.length > 0;
  const selectedText = getSelectedText?.() || '';

  /**
   * 执行 AI 编辑
   */
  const executeAIEdit = useCallback(
    async (action: AIEditAction, prompt?: string) => {
      if (!selectedText && action !== 'custom') {
        setError('请先选中要编辑的内容');
        return;
      }

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        // 构建请求
        const request: AIEditRequest = {
          action,
          content: selectedText,
          context: {
            blockType: selectedShapes[0]?.type,
            jobDescription,
            targetRole,
          },
        };

        // 调用 AI 服务（这里需要实际实现）
        const response = await callAIService(request, prompt);

        if (response.success) {
          setResult(response);
        } else {
          setError(response.error || 'AI 处理失败');
        }
      } catch (err: any) {
        console.error('[AI Editor] 处理失败:', err);
        setError(err.message || '处理请求时出现错误');
      } finally {
        setIsLoading(false);
      }
    },
    [selectedText, selectedShapes, jobDescription, targetRole]
  );

  /**
   * 应用优化结果
   */
  const handleApply = useCallback(() => {
    if (!result) return;

    // 更新选中的形状
    const updatedShapes = selectedShapes.map((shape) => {
      if (shape.type === 'text' || shape.type === 'paragraph') {
        return {
          ...shape,
          text: result.optimizedContent,
        } as TextShapeProps;
      }
      return shape;
    });

    onApplyEdit(updatedShapes);
    setResult(null);
  }, [result, selectedShapes, onApplyEdit]);

  /**
   * 润色区块
   */
  const handlePolishBlock = useCallback(
    async (blockId: string) => {
      if (!onUpdateBlock) return;

      setIsLoading(true);
      setError(null);

      try {
        // 调用 AI 润色区块
        const optimizedContent = await polishBlock(blockId, jobDescription);

        if (optimizedContent) {
          onUpdateBlock(blockId, optimizedContent);
        }
      } catch (err: any) {
        console.error('[AI Editor] 区块润色失败:', err);
        setError(err.message || '润色区块失败');
      } finally {
        setIsLoading(false);
      }
    },
    [onUpdateBlock, jobDescription]
  );

  /**
   * 执行自定义提示
   */
  const handleCustomPrompt = useCallback(() => {
    if (!customPrompt.trim()) return;
    executeAIEdit('optimize', customPrompt);
  }, [customPrompt, executeAIEdit]);

  // 切换折叠状态
  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed);
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-sm',
        collapsed ? 'w-12' : 'w-80',
        'transition-all duration-200',
        className
      )}
    >
      {/* 标题栏 */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b',
          collapsed ? 'flex-col' : 'flex-row'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">AI 助手</h3>
          </div>
        )}
        <button onClick={toggleCollapsed} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 内容区 */}
      {!collapsed && (
        <div className="p-4">
          {/* 标签切换 */}
          <div className="flex gap-1 mb-4 border-b">
            <button
              onClick={() => setActiveTab('selection')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-t',
                activeTab === 'selection'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              选中优化
            </button>
            <button
              onClick={() => setActiveTab('block')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-t',
                activeTab === 'block'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              区块润色
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-t',
                activeTab === 'custom'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              自定义
            </button>
          </div>

          {/* 选中优化 */}
          {activeTab === 'selection' && (
            <div className="space-y-4">
              {/* 选中提示 */}
              {!hasSelection && (
                <div className="text-sm text-gray-500 bg-gray-50 rounded p-3">
                  <p>请在画布上选中要优化的内容</p>
                </div>
              )}

              {/* 快捷操作 */}
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={() => executeAIEdit(action.id as AIEditAction, action.prompt)}
                    disabled={!hasSelection || isLoading}
                    className="flex items-center gap-2"
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* 选中内容预览 */}
              {hasSelection && selectedText && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">选中内容:</p>
                  <p className="text-sm text-gray-700 line-clamp-3">{selectedText}</p>
                </div>
              )}
            </div>
          )}

          {/* 区块润色 */}
          {activeTab === 'block' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">选择要润色的区块</p>
              {BLOCK_POLISH_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handlePolishBlock(option.id)}
                  disabled={isLoading}
                  className={cn(
                    'w-full text-left p-3 rounded border',
                    'hover:bg-gray-50 hover:border-blue-300',
                    'transition-colors',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <p className="font-medium text-gray-900">{option.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* 自定义提示 */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <textarea
                value={customPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCustomPrompt(e.target.value)
                }
                placeholder="输入自定义指令，如：把这段内容改写成更加专业的表述..."
                rows={4}
                className="w-full p-2 border rounded resize-none text-sm"
              />
              <Button
                onClick={handleCustomPrompt}
                disabled={!customPrompt.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    执行
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500">AI 正在处理...</span>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2">
                <RefreshCw className="w-3 h-3 mr-1" />
                重试
              </Button>
            </div>
          )}

          {/* 结果展示 */}
          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-xs text-green-600 mb-1">优化结果:</p>
                <p className="text-sm text-gray-700">{result.optimizedContent}</p>
              </div>

              {/* 建议列表 */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-600 mb-2">优化建议:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1">
                  应用修改
                </Button>
                <Button variant="outline" onClick={() => setResult(null)}>
                  忽略
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== 辅助函数 ==============

/**
 * 调用 AI 服务
 * TODO: 实际实现需要连接后端 API
 */
async function callAIService(
  request: AIEditRequest,
  customPrompt?: string
): Promise<AIEditResponse> {
  // 模拟 API 调用
  // 实际实现应该调用后端的 AI 服务
  return new Promise((resolve) => {
    setTimeout(() => {
      // 模拟响应
      resolve({
        success: true,
        originalContent: request.content,
        optimizedContent: `[优化后] ${request.content}`,
        suggestions: ['建议使用更具体的量化数据', '可以添加时间节点以增强可信度'],
      });
    }, 1500);
  });
}

/**
 * 润色区块
 * TODO: 实际实现需要连接后端 API
 */
async function polishBlock(blockId: string, jobDescription?: string): Promise<unknown> {
  // 模拟 API 调用
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ optimized: true });
    }, 1500);
  });
}

// ============== 导出 ==============

export default AIEditorPanel;
