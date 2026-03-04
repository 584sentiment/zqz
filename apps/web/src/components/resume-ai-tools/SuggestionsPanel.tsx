/**
 * 优化建议面板组件
 * 显示分类的建议列表，支持单条/批量应用
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ResumeSuggestion } from '@/lib/api/resumes';
import {
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface SuggestionsPanelProps {
  /** 建议列表 */
  suggestions: ResumeSuggestion[];
  /** 应用单条建议 */
  onApply: (suggestion: ResumeSuggestion) => void;
  /** 批量应用建议 */
  onApplyAll: () => void;
  /** 关闭面板 */
  onClose: () => void;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 正在应用的建议 ID */
  applyingId?: string | null;
}

const typeConfig = {
  grammar: {
    label: '语法问题',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertCircle,
  },
  content: {
    label: '内容优化',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Sparkles,
  },
  keyword: {
    label: '关键词建议',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: FileText,
  },
  format: {
    label: '格式问题',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: Info,
  },
};

const severityConfig = {
  high: { label: '严重', dot: 'bg-red-500' },
  medium: { label: '中等', dot: 'bg-amber-500' },
  low: { label: '轻微', dot: 'bg-green-500' },
};

export function SuggestionsPanel({
  suggestions,
  onApply,
  onApplyAll,
  onClose,
  isLoading = false,
  applyingId = null,
}: SuggestionsPanelProps) {
  // 按严重程度分组
  const groupedSuggestions = React.useMemo(() => {
    const groups: Record<string, ResumeSuggestion[]> = {
      high: [],
      medium: [],
      low: [],
    };
    suggestions.forEach((s) => {
      if (groups[s.severity]) {
        groups[s.severity].push(s);
      }
    });
    return groups;
  }, [suggestions]);

  const hasHighSeverity = groupedSuggestions.high.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="fixed right-4 top-20 w-96 max-h-[calc(100vh-120px)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">优化建议</h3>
          {hasSuggestions && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {suggestions.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-gray-500 text-sm">正在分析简历...</p>
          </div>
        ) : !hasSuggestions ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Check className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-gray-900 font-medium">简历内容很棒！</p>
            <p className="text-gray-500 text-sm mt-1">暂无需要改进的地方</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 严重程度说明 */}
            {hasHighSeverity && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>发现 {groupedSuggestions.high.length} 个严重问题需要关注</span>
              </div>
            )}

            {/* 按严重程度排序显示建议 */}
            {['high', 'medium', 'low'].map((severity) => {
              const items = groupedSuggestions[severity];
              if (items.length === 0) return null;

              return (
                <div key={severity} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${severityConfig[severity as keyof typeof severityConfig].dot}`}
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {severityConfig[severity as keyof typeof severityConfig].label}问题
                    </span>
                  </div>
                  {items.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={onApply}
                      isApplying={applyingId === suggestion.id}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {hasSuggestions && !isLoading && (
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={onApplyAll}
            className="w-full"
            disabled={!!applyingId}
          >
            {applyingId ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                应用中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                一键应用全部 ({suggestions.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * 单条建议卡片
 */
function SuggestionCard({
  suggestion,
  onApply,
  isApplying,
}: {
  suggestion: ResumeSuggestion;
  onApply: (suggestion: ResumeSuggestion) => void;
  isApplying: boolean;
}) {
  const config = typeConfig[suggestion.type];
  const Icon = config.icon;

  return (
    <div
      className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
    >
      {/* 类型标签 */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-500">{suggestion.section}</span>
      </div>

      {/* 原文 */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 mb-1">原文：</p>
        <p className="text-sm text-gray-700 line-through decoration-red-300">
          {suggestion.original}
        </p>
      </div>

      {/* 建议 */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 mb-1">建议修改为：</p>
        <p className="text-sm text-gray-900">{suggestion.suggestion}</p>
      </div>

      {/* 原因 */}
      <p className="text-xs text-gray-500 mb-3">{suggestion.reason}</p>

      {/* 操作按钮 */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onApply(suggestion)}
        disabled={isApplying}
        className="w-full"
      >
        {isApplying ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Check className="w-3 h-3 mr-1" />
        )}
        应用此建议
      </Button>
    </div>
  );
}

// 缺失的 Lightbulb 图标导入
import { Lightbulb } from 'lucide-react';

export default SuggestionsPanel;
