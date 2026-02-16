'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 可以将错误日志发送到错误追踪服务
    console.error('页面错误:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* 错误图标 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        {/* 文案 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          出错了
        </h1>
        <p className="text-gray-500 mb-8 text-lg">
          抱歉，页面加载时遇到了问题。请稍后重试。
        </p>

        {/* 错误详情（开发模式） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="w-full sm:w-auto shadow-lg shadow-primary/20"
            onClick={() => reset()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>

        {/* 提示 */}
        <p className="text-sm text-gray-400 mt-8">
          如果问题持续存在，请联系我们的客服团队
        </p>
      </div>
    </div>
  );
}
