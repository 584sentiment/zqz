/**
 * AI 悬浮工具栏
 * 显示 AI 处理状态和提供视觉反馈
 */

import React from 'react';
import { Loader2, Sparkles, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface AIFloatingToolbarProps {
  /** 是否正在处理 */
  isProcessing?: boolean;
  /** 当前操作描述 */
  currentAction?: string;
  /** 进度 (0-100) */
  progress?: number;
  /** 成功消息 */
  successMessage?: string;
  /** 错误消息 */
  errorMessage?: string;
  /** 信息消息 */
  infoMessage?: string;
  /** 关闭回调 */
  onClose?: () => void;
}

export function AIFloatingToolbar({
  isProcessing = false,
  currentAction,
  progress,
  successMessage,
  errorMessage,
  infoMessage,
}: AIFloatingToolbarProps) {
  if (!isProcessing && !currentAction && !errorMessage && !successMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-4 pointer-events-none">
      {/* 处理中状态 */}
      {isProcessing && currentAction && (
        <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg shadow-lg">
          <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
          <span className="text-sm text-purple-700">{currentAction}</span>
        </div>
      )}

      {/* 成功状态 */}
      {successMessage && (
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg shadow-lg">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {/* 进度条 */}
      {typeof progress !== 'undefined' && progress > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg shadow-lg">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-blue-600">{progress}%</span>
        </div>
      )}

      {/* 错误状态 */}
      {errorMessage && (
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      {/* 信息状态 */}
      {infoMessage && (
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg shadow-lg">
          <Info className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-700">{infoMessage}</span>
        </div>
      )}
    </div>
  );
}

export default AIFloatingToolbar;
