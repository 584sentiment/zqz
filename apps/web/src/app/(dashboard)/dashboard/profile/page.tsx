'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  X,
  Save,
  Loader2,
  Award,
} from 'lucide-react';

interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

const emptyForm = {
  school: '',
  degree: '',
  major: '',
  startDate: '',
  endDate: '',
  description: '',
};

export default function ProfilePage() {
  const { toast } = useToast();
  const [educations, setEducations] = useState<Education[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadEducations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/users/me/educations');
      setEducations(data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载教育经历',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEducations();
  }, [loadEducations]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (edu: Education) => {
    setForm({
      school: edu.school,
      degree: edu.degree,
      major: edu.major,
      startDate: edu.startDate.split('T')[0],
      endDate: edu.endDate ? edu.endDate.split('T')[0] : '',
      description: edu.description || '',
    });
    setEditingId(edu.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条教育经历吗？')) return;

    try {
      await apiClient.delete(`/users/me/educations/${id}`);
      toast({
        title: '删除成功',
        description: '教育经历已删除',
      });
      loadEducations();
    } catch (error) {
      toast({
        title: '删除失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...form,
        endDate: form.endDate || null,
      };

      if (editingId) {
        await apiClient.patch(`/users/me/educations/${editingId}`, payload);
        toast({
          title: '更新成功',
          description: '教育经历已更新',
        });
      } else {
        await apiClient.post('/users/me/educations', payload);
        toast({
          title: '添加成功',
          description: '教育经历已添加',
        });
      }

      resetForm();
      loadEducations();
    } catch (error) {
      toast({
        title: '保存失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const degreeOptions = ['高中', '大专', '本科', '硕士', '博士'];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">个人档案</h1>
            <p className="text-sm text-gray-500 mt-1">管理您的教育背景、工作经历等</p>
          </div>
        </div>

        {/* 教育经历卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              教育经历
            </h2>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            )}
          </div>

          {/* 添加/编辑表单 */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学校 *</label>
                  <input
                    type="text"
                    required
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例如：北京大学"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学历 *</label>
                  <select
                    required
                    value={form.degree}
                    onChange={(e) => setForm({ ...form, degree: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">请选择</option>
                    {degreeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">专业 *</label>
                  <input
                    type="text"
                    required
                    value={form.major}
                    onChange={(e) => setForm({ ...form, major: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例如：计算机科学与技术"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="主修课程、荣誉奖项等（可选）"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  保存
                </Button>
              </div>
            </form>
          )}

          {/* 教育经历列表 */}
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : educations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无教育经历</p>
              <p className="text-sm">点击上方"添加"按钮添加您的教育背景</p>
            </div>
          ) : (
            <div className="space-y-4">
              {educations.map((edu) => (
                <div
                  key={edu.id}
                  className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{edu.school}</h3>
                      <p className="text-sm text-gray-600">
                        {edu.degree} · {edu.major}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(edu.startDate).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'short',
                        })}
                        {' - '}
                        {edu.endDate
                          ? new Date(edu.endDate).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'short',
                            })
                          : '至今'}
                      </p>
                      {edu.description && (
                        <p className="text-sm text-gray-500 mt-2">{edu.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(edu)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(edu.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 工作经历卡片（占位） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-60">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-gray-400" />
            工作经历
          </h2>
          <p className="text-gray-400 text-sm">功能开发中...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
