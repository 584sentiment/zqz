'use client';

import { RefreshCw, AlertTriangle, Wifi, Clock, ServerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AIErrorStateProps {
  error: string | Error;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * AI 服务错误类型
 */
type AIErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

interface ParsedError {
  message: string;
  code: AIErrorCode;
  retryable: boolean;
}

/**
 * 解析错误信息
 */
function parseError(error: string | Error): ParsedError {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // 根据错误消息判断错误类型
  if (errorMessage.includes('请求过于频繁') || errorMessage.includes('rate limit')) {
    return {
      message: 'AI 服务请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
    };
  }

  if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
    return {
      message: 'AI 服务响应超时，请检查网络连接后重试',
      code: 'TIMEOUT',
      retryable: true,
    };
  }

  if (errorMessage.includes('网络') || errorMessage.includes('连接失败')) {
    return {
      message: '网络连接失败，请检查网络设置',
      code: 'NETWORK_ERROR',
      retryable: true,
    };
  }

  if (errorMessage.includes('不可用') || errorMessage.includes('unavailable')) {
    return {
      message: 'AI 服务暂时不可用，请稍后再试',
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
    };
  }

  if (errorMessage.includes('未正确配置')) {
    return {
      message: 'AI 服务配置错误，请联系管理员',
      code: 'PROVIDER_NOT_CONFIGURED',
      retryable: false,
    };
  }

  // 默认错误
  return {
    message: errorMessage || '操作失败，请稍后重试',
    code: 'UNKNOWN',
    retryable: true,
  };
}

/**
 * 获取错误图标
 */
function getErrorIcon(code: AIErrorCode) {
  switch (code) {
    case 'RATE_LIMIT_EXCEEDED':
      return Clock;
    case 'TIMEOUT':
      return Clock;
    case 'NETWORK_ERROR':
      return Wifi;
    case 'SERVICE_UNAVAILABLE':
      return ServerOff;
    default:
      return AlertTriangle;
  }
}

/**
 * AI 服务错误状态组件
 * 用于显示 AI 服务调用失败时的友好错误提示和重试选项
 */
export function AIErrorState({
  error,
  onRetry,
  isRetrying = false,
  className = '',
}: AIErrorStateProps) {
  const parsedError = parseError(error);
  const Icon = getErrorIcon(parsedError.code);

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        服务暂时不可用
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {parsedError.message}
      </p>

      {parsedError.retryable && onRetry && (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? '重试中...' : '重新尝试'}
        </Button>
      )}

      {!parsedError.retryable && (
        <p className="text-xs text-gray-500 dark:text-gray-500">
          如问题持续，请联系客服获取帮助
        </p>
      )}
    </div>
  );
}

/**
 * 紧凑型错误提示（用于对话界面等）
 */
export function AIErrorCompact({
  error,
  onRetry,
  isRetrying = false,
}: Omit<AIErrorStateProps, 'className'>) {
  const parsedError = parseError(error);

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
          {parsedError.message}
        </p>
      </div>
      {parsedError.retryable && onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          disabled={isRetrying}
          className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}
