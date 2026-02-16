'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { jobsApi, Job } from '@/lib/api/jobs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Star,
  Check,
  Tag,
  Bookmark,
  FileText,
  Loader2,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface PageProps {
  params: { id: string };
}

export default function JobDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadJob = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await jobsApi.getById(id);
      setJob(data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '岗位不存在或已被删除',
        variant: 'destructive',
      });
      router.push('/dashboard/jobs');
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleDelete = async () => {
    if (!confirm('确定要删除这个岗位吗？')) return;

    try {
      await jobsApi.delete(id);
      toast({
        title: '删除成功',
        description: '岗位已删除',
      });
      router.push('/dashboard/jobs');
    } catch (error) {
      toast({
        title: '删除失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待处理' },
      applied: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已申请' },
      interview: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '面试中' },
      offer: { bg: 'bg-green-100', text: 'text-green-700', label: '已录用' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' },
    };
    return statusMap[status] || statusMap.pending;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">岗位不存在</p>
        </div>
      </DashboardLayout>
    );
  }

  const requirements = job.requirements as Record<string, unknown> | null;
  const mustHave = (requirements?.mustHave as string[]) || [];
  const niceToHave = (requirements?.niceToHave as string[]) || [];
  const skills = job.matchedSkills || [];
  const salary = requirements?.salary as string | undefined;
  const experience = requirements?.experience as string | undefined;
  const education = requirements?.education as string | undefined;
  const statusBadge = getStatusBadge(job.status);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 返回按钮和操作栏 */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/jobs"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回岗位列表
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </div>

        {/* 职位信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Briefcase className="w-32 h-32 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {job.title || '未命名职位'}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-medium">{job.company || '未知公司'}</span>
                </div>
              </div>
              {salary && (
                <div className="lg:text-right">
                  <span className="text-3xl font-bold text-primary">{salary}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              {job.location && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {job.location}
                </div>
              )}
              {experience && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  {experience}
                </div>
              )}
              {education && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  {education}
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                <Calendar className="w-4 h-4 text-gray-400" />
                {new Date(job.createdAt).toLocaleDateString('zh-CN')} 导入
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all group">
            <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">生成定制简历</h3>
              <p className="text-sm text-gray-500">针对此岗位优化</p>
            </div>
          </button>

          <button className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all group">
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">面试准备</h3>
              <p className="text-sm text-gray-500">AI 问答题库</p>
            </div>
          </button>

          <button className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">模拟面试</h3>
              <p className="text-sm text-gray-500">视频仿真练习</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 核心要求 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <Check className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-gray-900">核心要求</h2>
            </div>
            {mustHave.length > 0 ? (
              <ul className="space-y-3">
                {mustHave.map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">暂无核心要求信息</p>
            )}
          </div>

          {/* 加分项 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <Star className="w-5 h-5 text-orange-500" />
              <h2 className="font-semibold text-gray-900">加分项</h2>
            </div>
            {niceToHave.length > 0 ? (
              <ul className="space-y-3">
                {niceToHave.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Star className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">暂无加分项信息</p>
            )}
          </div>
        </div>

        {/* 技能关键词 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-gray-900">技能关键词</h2>
            {job.matchScore && (
              <span className="ml-auto text-sm text-gray-500">
                匹配度：<strong className="text-primary">{Math.round(job.matchScore * 100)}%</strong>
              </span>
            )}
          </div>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg border border-primary/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无技能信息</p>
          )}
        </div>

        {/* 原始描述 */}
        {job.description && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <FileText className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">原始职位描述</h2>
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>
          </div>
        )}

        {/* 备注 */}
        {job.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">备注</h3>
            <p className="text-sm text-yellow-700">{job.notes}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
