'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { jobsApi, Job, JobsListResponse } from '@/lib/api/jobs';
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
  Archive,
  ArchiveRestore,
  Loader2,
  ChevronDown,
  Star,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function JobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [pagination, setPagination] = useState<{ total: number; hasMore: boolean }>({ total: 0, hasMore: false });
  const [currentPage, setCurrentPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadJobs = useCallback(async (page: number = 0, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response: JobsListResponse = await jobsApi.getList({
        status: statusFilter === 'all' ? undefined : statusFilter,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        favorites: showFavoritesOnly || undefined,
      });

      if (append) {
        setJobs((prev) => [...prev, ...response.data]);
      } else {
        setJobs(response.data);
      }
      setPagination(response.pagination);
      setCurrentPage(page);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载岗位列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [statusFilter, showFavoritesOnly, toast]);

  // 初始加载
  useEffect(() => {
    loadJobs(0, false);
  }, [statusFilter, showFavoritesOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // 搜索时重置分页
  useEffect(() => {
    setCurrentPage(0);
    setJobs([]);
    loadJobs(0, false);
  }, [statusFilter, showFavoritesOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    if (!isLoadingMore && pagination.hasMore) {
      loadJobs(currentPage + 1, true);
    }
  };

  // 无限滚动
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !isLoadingMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pagination.hasMore, isLoadingMore, isLoading, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleArchive = async (jobId: string) => {
    try {
      await jobsApi.updateStatus(jobId, 'archived');
      toast({
        title: '归档成功',
        description: '岗位已归档',
      });
      loadJobs();
    } catch (error) {
      toast({
        title: '归档失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (jobId: string) => {
    try {
      await jobsApi.updateStatus(jobId, 'active');
      toast({
        title: '恢复成功',
        description: '岗位已恢复到活跃列表',
      });
      loadJobs();
    } catch (error) {
      toast({
        title: '恢复失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      await jobsApi.updateStatus(jobId, newStatus);
      // 更新本地状态
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );
      toast({
        title: '状态更新成功',
        description: `岗位状态已更新为: ${statusOptions.find(s => s.value === newStatus)?.label || newStatus}`,
      });
    } catch (error) {
      toast({
        title: '状态更新失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFavorite = async (jobId: string, currentStatus: boolean) => {
    try {
      await jobsApi.toggleFavorite(jobId, !currentStatus);
      // 更新本地状态
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, isFavorite: !currentStatus } : job
        )
      );
      toast({
        title: currentStatus ? '已取消收藏' : '已收藏',
        description: currentStatus ? '岗位已从收藏夹移除' : '岗位已添加到收藏夹',
      });
    } catch (error) {
      toast({
        title: '操作失败',
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
    { value: 'active', label: '活跃' },
    { value: 'pending', label: '待处理' },
    { value: 'applied', label: '已申请' },
    { value: 'interview', label: '面试中' },
    { value: 'offer', label: '已录用' },
    { value: 'rejected', label: '已拒绝' },
    { value: 'archived', label: '已归档' },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: '活跃' },
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待处理' },
      applied: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已申请' },
      interview: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '面试中' },
      offer: { bg: 'bg-green-100', text: 'text-green-700', label: '已录用' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: '已归档' },
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
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-1"
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              收藏
            </Button>
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
          <>
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
                              <select
                                value={job.status}
                                onChange={(e) => handleUpdateStatus(job.id, e.target.value)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusBadge.bg} ${statusBadge.text}`}
                              >
                                {statusOptions.filter(opt => opt.value !== 'all').map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(job.id, job.isFavorite)}
                          className={job.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}
                        >
                          <Star className={`w-4 h-4 ${job.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Button>
                        </Link>
                        {job.status === 'archived' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(job.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <ArchiveRestore className="w-4 h-4 mr-1" />
                            恢复
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleArchive(job.id)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
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

            {/* 加载更多指示器 */}
            <div ref={loadMoreRef} className="py-6 text-center">
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : pagination.hasMore ? (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  加载更多
                </Button>
              ) : null}
            </div>
          </>
        )}

        {/* 统计信息 */}
        {filteredJobs.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            已加载 {filteredJobs.length} / {pagination.total} 个岗位
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
