'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { jobsApi, Job } from '@/lib/api/jobs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Briefcase,
  Calendar,
  MoreHorizontal,
  Trash2,
  Eye,
  FileText,
  Clock,
} from 'lucide-react';

export default function JobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await jobsApi.getList({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setJobs(response.data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载岗位列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDelete = async (jobId: string) => {
    try {
      await jobsApi.delete(jobId);
      toast({
        title: '删除成功',
        description: '岗位已删除',
      });
      loadJobs();
    } catch (error) {
      toast({
        title: '删除失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.company?.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query)
    );
  });

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'applied', label: '已申请' },
    { value: 'interview', label: '面试中' },
    { value: 'offer', label: '已录用' },
    { value: 'rejected', label: '已拒绝' },
  ];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">岗位管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理您导入的所有岗位信息</p>
          </div>
          <Link href="/dashboard/jobs/import">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              导入新岗位
            </Button>
          </Link>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索职位、公司..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
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
        </div>

        {/* 岗位列表 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无岗位</h3>
            <p className="text-gray-500 mb-6">开始导入您的第一个岗位吧</p>
            <Link href="/dashboard/jobs/import">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                导入岗位
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => {
              const statusBadge = getStatusBadge(job.status);
              const requirements = job.requirements as Record<string, unknown> | null;
              const skills = (requirements?.skills as string[]) || [];
              const salary = (requirements?.salary as string) || job.matchScore ? `${Math.round((job.matchScore || 0) * 100)}% 匹配` : null;

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {job.title || '未命名职位'}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {job.company && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {job.company}
                              </span>
                            )}
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(job.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        {salary && (
                          <div className="text-right">
                            <span className="text-lg font-bold text-primary">{salary}</span>
                          </div>
                        )}
                      </div>

                      {/* 技能标签 */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {skills.slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {skills.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                              +{skills.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(job.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        {filteredJobs.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            共 {filteredJobs.length} 个岗位
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
