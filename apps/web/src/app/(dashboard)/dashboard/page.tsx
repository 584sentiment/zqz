'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Link2,
  FileText,
  Brain,
  Video,
  Plus,
  ArrowRight,
  Star,
  Play,
} from 'lucide-react';

const quickActions: Array<{
  title: string;
  description: string;
  icon: typeof Link2;
  href: '/dashboard/jobs/import' | '/dashboard/resumes' | '/dashboard/interviews/prepare' | '/dashboard/interviews/mock';
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
    href: '/dashboard/interviews/prepare',
    color: 'bg-purple-500',
  },
  {
    title: '模拟面试',
    description: '视频仿真练习',
    icon: Video,
    href: '/dashboard/interviews/mock',
    color: 'bg-orange-500',
  },
];

const recentActivities = [
  { type: 'resume', title: '已生成简历：字节跳动', time: '今天, 上午 10:00' },
  { type: 'interview', title: '完成模拟面试 - 评分: 85/100', time: '昨天, 下午 4:00' },
  { type: 'job', title: '申请已发送至 腾讯', time: '9月14日, 下午 2:30' },
  { type: 'import', title: '已导入职位: 产品负责人', time: '9月13日, 上午 11:15' },
];

const recommendedJobs = [
  {
    title: '高级前端工程师',
    company: '字节跳动',
    location: '杭州',
    salary: '¥30k-50k',
    match: 92,
  },
  {
    title: '产品经理',
    company: '阿里巴巴',
    location: '杭州',
    salary: '¥35k-55k',
    match: 85,
  },
  {
    title: '全栈开发工程师',
    company: '蚂蚁集团',
    location: '上海',
    salary: '¥40k-60k',
    match: 88,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    router.push('/login');
    return null;
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
                  <span className="text-5xl font-bold tracking-tight">0</span>
                  <span className="ml-2 text-sm opacity-80">活跃申请</span>
                </div>

                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-xs font-medium opacity-80">待回复</span>
                    </div>
                    <span className="text-xl font-semibold">0</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-300" />
                      <span className="text-xs font-medium opacity-80">面试中</span>
                    </div>
                    <span className="text-xl font-semibold">0</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-300" />
                      <span className="text-xs font-medium opacity-80">已通过</span>
                    </div>
                    <span className="text-xl font-semibold">0</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-300" />
                      <span className="text-xs font-medium opacity-80">已拒绝</span>
                    </div>
                    <span className="text-xl font-semibold">0</span>
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
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recommendedJobs.map((job, index) => (
                <div
                  key={index}
                  className="min-w-[280px] w-[280px] bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-gray-400" />
                      </div>
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
                            strokeDashoffset={100 - job.match}
                            strokeLinecap="round"
                            strokeWidth="3"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-primary">{job.match}%</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900">{job.title}</h4>
                    <p className="text-sm text-gray-500">
                      {job.company} • {job.location}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      {job.salary}
                      <span className="text-xs text-gray-400 font-normal">/月</span>
                    </span>
                    <button className="text-xs font-medium text-white bg-primary hover:bg-teal-700 px-3 py-1.5 rounded transition">
                      申请
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">最近活动</h3>
            </div>
            <div className="relative pl-2">
              <div className="absolute left-2 top-2 bottom-4 w-0.5 bg-gray-100" />
              {recentActivities.map((activity, index) => (
                <div key={index} className="relative flex gap-4 mb-6 last:mb-0">
                  <div
                    className={`absolute left-[-4px] top-1.5 w-3 h-3 rounded-full border-2 border-white z-10 ${
                      index === 0 ? 'bg-primary' : index === 1 ? 'bg-primary/40' : 'bg-gray-300'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Card */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-3">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <h4 className="font-bold mb-1">升级专业版</h4>
              <p className="text-sm text-gray-300 mb-3">
                解锁无限 AI 简历修改和模拟面试次数。
              </p>
              <button className="w-full bg-white text-gray-900 text-sm font-medium py-2 rounded-lg hover:bg-gray-100 transition">
                查看方案
              </button>
            </div>
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-primary/20 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
