'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { jobsApi, Job, JobStatusStats } from '@/lib/api/jobs';
import {
  Link2,
  FileText,
  Brain,
  Video,
  Plus,
  Star,
  Loader2,
  Briefcase,
  MapPin,
  FileEdit,
  Eye,
} from 'lucide-react';

const quickActions: Array<{
  title: string;
  description: string;
  icon: typeof Link2;
  href: '/dashboard/jobs/import' | '/dashboard/resumes' | '/dashboard/interviews/preparation' | '/dashboard/interviews/new';
  color: string;
}> = [
  {
    title: '导入职位',
    description: '粘贴链接或文本进行分析',
    icon: Link2,
    href: '/dashboard/jobs/import',
    color: 'bg-blue-500',
  },
  {
    title: '定制简历',
    description: '针对职位优化内容',
    icon: FileText,
    href: '/dashboard/resumes',
    color: 'bg-green-500',
  },
  {
    title: '面试准备',
    description: '获取 AI 问答题库',
    icon: Brain,
    href: '/dashboard/interviews/preparation',
    color: 'bg-purple-500',
  },
  {
    title: '模拟面试',
    description: '视频仿真练习',
    icon: Video,
    href: '/dashboard/interviews/new',
    color: 'bg-orange-500',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [statusStats, setStatusStats] = useState<JobStatusStats[]>([]);

  // 获取仪表板数据
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobsResponse, statsData] = await Promise.all([
        jobsApi.getList({ take: 10 }),
        jobsApi.getStatusStats().catch(() => []),
      ]);

      // 按匹配度排序，取前 5 个
      const sortedJobs = jobsResponse.data
        .filter((job) => job.status !== 'archived')
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 5);

      setRecommendedJobs(sortedJobs);
      setStatusStats(statsData);
    } catch (error) {
      console.error('加载仪表板数据失败', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 获取状态统计数字
  const getStatCount = (status: string): number => {
    const stat = statusStats.find((s) => s.status === status);
    return stat?.count || 0;
  };

  // 计算活跃申请数
  const activeCount = statusStats
    .filter((s) => ['applied', 'interview', 'pending'].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  // 未登录时显示加载状态
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Stats Card */}
          <div className="bg-gradient-to-r from-primary to-teal-600 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute left-1/2 -bottom-10 w-32 h-32 bg-teal-400/20 rounded-full blur-xl" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-medium opacity-90">当前申请</h2>
                  <p className="text-xs opacity-70 mt-1">欢迎回来，{user?.name || '用户'}</p>
                </div>
                <Link
                  href="/dashboard/jobs"
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition backdrop-blur-sm"
                >
                  查看全部
                </Link>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold tracking-tight">{activeCount}</span>
                  <span className="ml-2 text-sm opacity-80">活跃申请</span>
                </div>

                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-xs font-medium opacity-80">待处理</span>
                    </div>
                    <span className="text-xl font-semibold">{getStatCount('pending')}</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-300" />
                      <span className="text-xs font-medium opacity-80">面试中</span>
                    </div>
                    <span className="text-xl font-semibold">{getStatCount('interview')}</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-300" />
                      <span className="text-xs font-medium opacity-80">已通过</span>
                    </div>
                    <span className="text-xl font-semibold">{getStatCount('offer')}</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-300" />
                      <span className="text-xs font-medium opacity-80">已拒绝</span>
                    </div>
                    <span className="text-xl font-semibold">{getStatCount('rejected')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="group bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                  >
                    <div
                      className={`w-10 h-10 ${action.color}/10 rounded-lg flex items-center justify-center mb-3 group-hover:${action.color} transition-colors`}
                    >
                      <Icon className={`w-5 h-5 text-${action.color.replace('bg-', '')}`} />
                    </div>
                    <h4 className="font-semibold text-gray-900">{action.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recommended Jobs */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">为你推荐</h3>
              <Link href="/dashboard/jobs" className="text-sm text-primary hover:underline font-medium">
                查看全部
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-1">暂无推荐岗位</h4>
                <p className="text-sm text-gray-500 mb-4">导入岗位后，系统将根据匹配度为你推荐</p>
                <Link
                  href="/dashboard/jobs/import"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  导入岗位
                </Link>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {recommendedJobs.map((job) => {
                  const matchScore = job.matchScore ? Math.round(job.matchScore * 100) : 0;
                  const requirements = job.requirements as Record<string, unknown> | null;
                  const salary = requirements?.salary as string | undefined;

                  return (
                    <div
                      key={job.id}
                      className="min-w-[280px] w-[280px] bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          {matchScore > 0 && (
                            <div className="relative w-10 h-10 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle
                                  className="text-gray-200"
                                  cx="20"
                                  cy="20"
                                  fill="transparent"
                                  r="16"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                />
                                <circle
                                  className="text-primary"
                                  cx="20"
                                  cy="20"
                                  fill="transparent"
                                  r="16"
                                  stroke="currentColor"
                                  strokeDasharray="100"
                                  strokeDashoffset={100 - matchScore}
                                  strokeLinecap="round"
                                  strokeWidth="3"
                                />
                              </svg>
                              <span className="absolute text-[10px] font-bold text-primary">{matchScore}%</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{job.title || '未命名职位'}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {job.company || '未知公司'}
                          {job.location && ` • ${job.location}`}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="font-semibold text-gray-900">
                          {salary || '面议'}
                          {salary && <span className="text-xs text-gray-400 font-normal">/月</span>}
                        </span>
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/jobs/${job.id}`}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded transition"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/dashboard/resumes?jobId=${job.id}`}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded transition"
                            title="生成简历"
                          >
                            <FileEdit className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Tips */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用技巧</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">导入岗位</p>
                  <p className="text-xs text-gray-500">粘贴招聘链接或文本，AI 自动解析岗位要求</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">完善档案</p>
                  <p className="text-xs text-gray-500">填写工作经历和技能，提高简历匹配度</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">AI 技能发掘</p>
                  <p className="text-xs text-gray-500">通过对话挖掘你的隐藏技能和亮点</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Card */}
          <Link
            href="/dashboard/subscription/upgrade"
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden block hover:from-gray-700 hover:to-gray-800 transition"
          >
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-3">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <h4 className="font-bold mb-1">升级专业版</h4>
              <p className="text-sm text-gray-300 mb-3">
                解锁无限 AI 简历修改和模拟面试次数。
              </p>
              <span className="inline-block w-full bg-white text-gray-900 text-sm font-medium py-2 rounded-lg text-center hover:bg-gray-100 transition">
                查看方案
              </span>
            </div>
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-primary/20 rounded-full blur-xl" />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
