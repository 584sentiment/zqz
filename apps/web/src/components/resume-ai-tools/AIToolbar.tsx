/**
 * AI 工具栏组件
 * 包含：一键润色、优化建议、岗位关键词按钮
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Lightbulb,
  Key,
  Loader2,
} from 'lucide-react';

interface AIToolbarProps {
  /** 简历 ID */
  resumeId: string;
  /** 是否关联了岗位 */
  hasJob: boolean;
  /** 点击优化建议 */
  onShowSuggestions: () => void;
  /** 点击岗位关键词 */
  onShowKeywords: () => void;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
}

export function AIToolbar({
  hasJob,
  onShowSuggestions,
  onShowKeywords,
  isLoading = false,
  disabled = false,
}: AIToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* 优化建议按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={onShowSuggestions}
        disabled={disabled || isLoading}
        className="gap-1.5"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Lightbulb className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">优化建议</span>
      </Button>

      {/* 岗位关键词按钮 */}
      {hasJob && (
        <Button
          variant="outline"
          size="sm"
          onClick={onShowKeywords}
          disabled={disabled || isLoading}
          className="gap-1.5"
        >
          <Key className="w-4 h-4" />
          <span className="hidden sm:inline">岗位关键词</span>
        </Button>
      )}
    </div>
  );
}

export default AIToolbar;
