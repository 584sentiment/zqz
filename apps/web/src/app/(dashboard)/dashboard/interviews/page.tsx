'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { interviewsApi, Interview, InterviewStats } from '@/lib/api/interviews';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Mic,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Trash2,
  TrendingUp,
  Calendar,
  Target,
  Loader2,
  FileText,
  BarChart3,
  AlertTriangle,
  Crown,
} from 'lucide-react';

export default function InterviewsPage() {
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [quotaInfo, setQuotaInfo] = useState<{
    total: number;
    used: number;
    remaining: number;
    unlimited: boolean;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [interviewsData, statsData, subscriptionData] = await Promise.all([
        interviewsApi.getList(
          statusFilter === 'all' ? undefined : { status: statusFilter }
        ),
        interviewsApi.getStats(),
        subscriptionsApi.getMySubscription().catch(() => null),
      ]);
      setInterviews(interviewsData);
      setStats(statsData);
      if (subscriptionData?.quotas?.interview) {
        setQuotaInfo(subscriptionData.quotas.interview);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载面试列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这次面试记录吗？')) return;
    try {
      await interviewsApi.delete(id);
      toast({ title: '删除成功', description: '面试记录已删除' });
      loadData();
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; text: string; label: string; icon: React.ElementType }
    > = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: '待开始', icon: Clock },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-600', label: '进行中', icon: Play },
      completed: { bg: 'bg-green-100', text: 'text-green-600', label: '已完成', icon: CheckCircle },
      aborted: { bg: 'bg-red-100', text: 'text-red-600', label: '已中止', icon: XCircle },
    };
    return statusMap[status] || statusMap.pending;
  };

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待开始' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">模拟面试</h1>
            <p className="text-sm text-gray-500 mt-1">
              AI 模拟真实面试场景，帮你提升面试技巧
            </p>
          </div>
          <Link href="/dashboard/interviews/new">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              开始面试
            </Button>
          </Link>
        </div>

        {/* 配额信息栏 */}
        {quotaInfo && !quotaInfo.unlimited && (
          <div
            className={`p-4 rounded-lg flex items-center justify-between ${
              quotaInfo.remaining === 0
                ? 'bg-red-50 border border-red-200'
                : quotaInfo.remaining <= 1
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {quotaInfo.remaining === 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : quotaInfo.remaining <= 1 ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <Mic className="w-5 h-5 text-blue-500" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    quotaInfo.remaining === 0
                      ? 'text-red-700'
                      : quotaInfo.remaining <= 1
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                  }`}
                >
                  {quotaInfo.remaining === 0
                    ? '面试配额已用尽'
                    : `本月剩余 ${quotaInfo.remaining} 次模拟面试机会`}
                </p>
                <p
                  className={`text-sm ${
                    quotaInfo.remaining === 0
                      ? 'text-red-600'
                      : quotaInfo.remaining <= 1
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                  }`}
                >
                  已使用 {quotaInfo.used} / {quotaInfo.total} 次
                </p>
              </div>
            </div>
            {(quotaInfo.remaining <= 1 || quotaInfo.remaining === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = '/dashboard/subscription/upgrade')}
                className="flex items-center gap-1"
              >
                <Crown className="w-4 h-4" />
                升级套餐
              </Button>
            )}
          </div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">总面试数</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">已完成</p>
                  <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <Play className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">进行中</p>
                  <p className="text-xl font-bold text-gray-900">{stats.inProgress}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">平均分数</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.avgScore ? `${stats.avgScore}分` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 面试列表 */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Mic className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无面试记录</h3>
            <p className="text-gray-500 mb-6">开始你的第一次模拟面试吧</p>
            <Link href="/dashboard/interviews/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                开始面试
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => {
              const statusBadge = getStatusBadge(interview.status);
              const StatusIcon = statusBadge.icon;
              const jobContext = interview.jobContext as Record<string, unknown> | null;
              const report = interview.report as Record<string, unknown> | null;
              const questions = interview.questions as Record<string, unknown>[];

              return (
                <div
                  key={interview.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </span>
                        {report?.totalScore !== undefined && report?.totalScore !== null && (
                          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                            <BarChart3 className="w-4 h-4" />
                            {String(report.totalScore)}分
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-1">
                        {interview.type === 'mock' ? 'AI 模拟面试' : '面试准备'}
                        {jobContext?.title ? ` - ${String(jobContext.title)}` : ''}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {questions.length} 道题目
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(interview.createdAt).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {jobContext?.company !== undefined && jobContext?.company !== null && (
                        <p className="text-sm text-gray-500 mt-1">
                          关联岗位：{String(jobContext.company)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {interview.status === 'pending' && (
                        <Link href={`/dashboard/interviews/${interview.id}`}>
                          <Button size="sm">
                            <Play className="w-4 h-4 mr-1" />
                            开始
                          </Button>
                        </Link>
                      )}
                      {interview.status === 'in_progress' && (
                        <Link href={`/dashboard/interviews/${interview.id}`}>
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4 mr-1" />
                            继续
                          </Button>
                        </Link>
                      )}
                      {interview.status === 'completed' && (
                        <Link href={`/dashboard/interviews/${interview.id}`}>
                          <Button size="sm" variant="outline">
                            <BarChart3 className="w-4 h-4 mr-1" />
                            查看报告
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(interview.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 统计信息 */}
        {interviews.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            共 {interviews.length} 次面试记录
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
