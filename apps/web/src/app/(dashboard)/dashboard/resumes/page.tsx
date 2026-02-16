'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { resumesApi, Resume, ResumeTemplate } from '@/lib/api/resumes';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Copy,
  Eye,
  Download,
  Loader2,
  Star,
  Briefcase,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function ResumesPage() {
  const { toast } = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resumesData, templatesData] = await Promise.all([
        resumesApi.getList(statusFilter === 'all' ? undefined : { status: statusFilter }),
        resumesApi.getTemplates(),
      ]);
      setResumes(resumesData);
      setTemplates(templatesData);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载简历列表',
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
    try {
      await resumesApi.delete(id);
      toast({ title: '删除成功', description: '简历已删除' });
      loadData();
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await resumesApi.duplicate(id);
      toast({ title: '复制成功', description: '简历已复制' });
      loadData();
    } catch (error) {
      toast({ title: '复制失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const filteredResumes = resumes.filter((resume) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      resume.name.toLowerCase().includes(query) ||
      resume.job?.title?.toLowerCase().includes(query) ||
      resume.job?.company?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: '草稿', icon: FileText },
      generating: { bg: 'bg-blue-100', text: 'text-blue-600', label: '生成中', icon: Loader2 },
      completed: { bg: 'bg-green-100', text: 'text-green-600', label: '已完成', icon: CheckCircle },
      failed: { bg: 'bg-red-100', text: 'text-red-600', label: '生成失败', icon: FileText },
    };
    return statusMap[status] || statusMap.draft;
  };

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'draft', label: '草稿' },
    { value: 'completed', label: '已完成' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">简历管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理您的所有简历，针对不同岗位定制优化</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            创建简历
          </Button>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索简历名称、岗位..."
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

        {/* 简历列表 */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无简历</h3>
            <p className="text-gray-500 mb-6">开始创建您的第一份简历吧</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建简历
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResumes.map((resume) => {
              const statusBadge = getStatusBadge(resume.status);
              const StatusIcon = statusBadge.icon;

              return (
                <div
                  key={resume.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* 简历预览区 */}
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
                    <FileText className="w-12 h-12 text-gray-300" />
                    <span
                      className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}
                    >
                      <StatusIcon className={`w-3 h-3 ${resume.status === 'generating' ? 'animate-spin' : ''}`} />
                      {statusBadge.label}
                    </span>
                    {resume.matchScore && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                        <Star className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          {Math.round(resume.matchScore * 100)}% 匹配
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 简历信息 */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{resume.name}</h3>
                    {resume.job && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                        <Briefcase className="w-3 h-3" />
                        <span className="truncate">{resume.job.title} - {resume.job.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(resume.createdAt).toLocaleDateString('zh-CN')}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Link href={`/dashboard/resumes/${resume.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-3 h-3 mr-1" />
                          查看
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(resume.id)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(resume.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 统计信息 */}
        {filteredResumes.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            共 {filteredResumes.length} 份简历
          </div>
        )}
      </div>

      {/* 创建简历模态框（简化版） */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建新简历</h2>
            <p className="text-gray-500 mb-6">选择一个模板开始创建您的简历</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {templates.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  onClick={async () => {
                    try {
                      const resume = await resumesApi.create({
                        name: '未命名简历',
                        templateId: template.id,
                      });
                      setShowCreateModal(false);
                      window.location.href = `/dashboard/resumes/${resume.id}`;
                    } catch (error) {
                      toast({
                        title: '创建失败',
                        description: '请稍后重试',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition text-left"
                >
                  <div className="h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                  {template.isPremium && (
                    <span className="text-xs text-yellow-600">高级模板</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
