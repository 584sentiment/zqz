import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center">
          {/* 404 动画 */}
          <div className="mb-8">
            <div className="relative inline-block">
              <span className="text-[120px] font-bold text-gray-200 select-none">4</span>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Search className="w-16 h-16 text-primary animate-pulse" />
              </div>
              <span className="text-[120px] font-bold text-gray-200 select-none">4</span>
            </div>
          </div>

          {/* 文案 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            页面未找到
          </h1>
          <p className="text-gray-500 mb-6">
            抱歉，您访问的页面不存在或已被移除
          </p>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard">
              <Button className="w-full sm:w-auto shadow-lg shadow-primary/20">
                <Home className="w-4 h-4 mr-2" />
                返回工作台
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上页
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
