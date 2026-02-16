'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 动画 */}
        <div className="mb-8">
          <div className="relative inline-block">
            <span className="text-[150px] font-bold text-gray-200 select-none">4</span>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Search className="w-20 h-20 text-primary animate-pulse" />
            </div>
            <span className="text-[150px] font-bold text-gray-200 select-none">4</span>
          </div>
        </div>

        {/* 文案 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          页面未找到
        </h1>
        <p className="text-gray-500 mb-8 text-lg">
          抱歉，您访问的页面不存在或已被移除
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回上页
          </Button>
        </div>

        {/* 提示 */}
        <p className="text-sm text-gray-400 mt-8">
          如果您认为这是一个错误，请联系我们的客服团队
        </p>
      </div>
    </div>
  );
}
