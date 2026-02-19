'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  interviewsApi,
  PreparationPlan,
  PreparationPlanListItem,
  DailyPlan,
} from '@/lib/api/interviews';
import { jobsApi, Job } from '@/lib/api/jobs';
import { notificationsApi } from '@/lib/api/notifications';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Target,
  Clock,
  Briefcase,
  X,
  Sparkles,
  Bell,
  BellOff,
} from 'lucide-react';

export default function InterviewPreparationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PreparationPlanListItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PreparationPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // 创建表单状态
  const [selectedJobId, setSelectedJobId] = useState('');
  const [preparationDays, setPreparationDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);

  // 提醒设置状态
  const [dailyReminder, setDailyReminder] = useState(false);
  const [isLoadingReminder, setIsLoadingReminder] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansData, jobsResponse, reminderSettings] = await Promise.all([
        interviewsApi.getPreparationPlans(),
        jobsApi.getList({ status: 'active' }),
        notificationsApi.getReminderSettings().catch(() => ({ dailyReminder: false })),
      ]);
      setPlans(plansData);
      setJobs(jobsResponse.data);
      setDailyReminder(reminderSettings.dailyReminder);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载准备计划',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理 URL 参数中的 jobId
  useEffect(() => {
    const jobIdFromUrl = searchParams.get('jobId');
    if (jobIdFromUrl) {
      setSelectedJobId(jobIdFromUrl);
      setShowCreateModal(true);
      // 清除 URL 参数
      router.replace('/dashboard/interviews/preparation');
    }
  }, [searchParams, router]);

  const handleCreatePlan = async () => {
    setIsCreating(true);
    try {
      const plan = await interviewsApi.createPreparationPlan({
        jobId: selectedJobId || undefined,
        days: preparationDays,
      });
      toast({
        title: '创建成功',
        description: '面试准备计划已生成',
      });
      setShowCreateModal(false);
      setSelectedJobId('');
      setPreparationDays(7);
      loadData();
      // 直接打开新创建的计划
      handleViewPlan(plan.id);
    } catch (error) {
      toast({
        title: '创建失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewPlan = async (planId: string) => {
    setIsLoadingPlan(true);
    try {
      const plan = await interviewsApi.getPreparationPlan(planId);
      setSelectedPlan(plan);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载计划详情',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleToggleTask = async (dayIndex: number, taskId: string) => {
    if (!selectedPlan) return;

    try {
      const updatedPlan = await interviewsApi.completePreparationTask(selectedPlan.id, {
        dayIndex,
        taskId,
      });
      setSelectedPlan(updatedPlan);

      // 更新列表中的进度
      setPlans((prev) =>
        prev.map((p) => (p.id === updatedPlan.id ? { ...p, progress: updatedPlan.progress } : p))
      );
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('确定要删除这个准备计划吗？')) return;

    try {
      await interviewsApi.deletePreparationPlan(planId);
      toast({ title: '删除成功', description: '准备计划已删除' });
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const handleToggleReminder = async () => {
    setIsLoadingReminder(true);
    try {
      const newValue = !dailyReminder;
      await notificationsApi.updateReminderSettings({ dailyReminder: newValue });
      setDailyReminder(newValue);
      toast({
        title: newValue ? '已开启每日提醒' : '已关闭每日提醒',
        description: newValue
          ? '每天早上 9 点会收到邮件提醒'
          : '将不再收到每日任务提醒',
      });
    } catch (error) {
      toast({
        title: '设置失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReminder(false);
    }
  };

  const getFocusAreaLabel = (area: string): string => {
    const labels: Record<string, string> = {
      technical: '技术能力',
      behavioral: '行为面试',
      company: '公司研究',
      self_intro: '自我介绍',
    };
    return labels[area] || area;
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'study':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'practice':
        return <Target className="w-4 h-4 text-green-500" />;
      case 'review':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      case 'research':
        return <Briefcase className="w-4 h-4 text-orange-500" />;
      case 'prepare':
        return <Calendar className="w-4 h-4 text-cyan-500" />;
      case 'mock':
        return <Target className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">面试准备计划</h1>
            <p className="text-sm text-gray-500 mt-1">
              制定系统化的面试准备计划，每天完成指定任务
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 每日提醒开关 */}
            <button
              onClick={handleToggleReminder}
              disabled={isLoadingReminder}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                dailyReminder
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
              title={dailyReminder ? '点击关闭每日提醒' : '点击开启每日提醒'}
            >
              {isLoadingReminder ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : dailyReminder ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              {dailyReminder ? '每日提醒已开启' : '开启每日提醒'}
            </button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建计划
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：计划列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">我的计划</h2>
              {plans.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无准备计划</p>
                  <p className="text-xs mt-1">点击右上角按钮创建</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-3 rounded-lg cursor-pointer transition group ${
                        selectedPlan?.id === plan.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleViewPlan(plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {(plan.jobContext?.title as string) || '通用面试准备'}
                          </p>
                          {plan.jobContext?.company !== undefined && plan.jobContext?.company !== null && (
                            <p className="text-xs text-gray-400 truncate">
                              {String(plan.jobContext.company)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${plan.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{plan.progress}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlan(plan.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
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
          </div>

          {/* 右侧：计划详情 */}
          <div className="lg:col-span-2">
            {isLoadingPlan ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            ) : selectedPlan ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* 计划头部 */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {(selectedPlan.jobContext?.title as string) || '通用面试准备'}
                      </h2>
                      {selectedPlan.jobContext?.company !== undefined && selectedPlan.jobContext?.company !== null && (
                        <p className="text-sm text-gray-500">
                          {String(selectedPlan.jobContext.company)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{selectedPlan.progress}%</p>
                      <p className="text-xs text-gray-500">完成进度</p>
                    </div>
                  </div>
                </div>

                {/* 每日计划 */}
                <div className="p-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  <div className="space-y-4">
                    {selectedPlan.questions.map((day, dayIndex) => (
                      <div key={day.day} className="border border-gray-100 rounded-lg overflow-hidden">
                        {/* 日期标题 */}
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-gray-900">
                              第 {day.day} 天
                            </span>
                            <span className="text-xs text-gray-400">({day.date})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {getFocusAreaLabel(day.focusArea)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {day.totalDuration} 分钟
                            </span>
                            <span>
                              {day.completedCount}/{day.totalTasks} 完成
                            </span>
                          </div>
                        </div>

                        {/* 任务列表 */}
                        <div className="p-3 space-y-2">
                          {day.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 p-2 rounded-lg transition cursor-pointer ${
                                task.completed ? 'bg-green-50' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleToggleTask(dayIndex, task.id)}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                              )}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {getTaskTypeIcon(task.type)}
                                <span
                                  className={`text-sm ${
                                    task.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {task.duration} 分钟
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">选择一个准备计划</h3>
                <p className="text-gray-500 text-sm mb-4">
                  从左侧列表选择计划查看详情，或创建新的准备计划
                </p>
                <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建计划
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建计划弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">创建准备计划</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 选择岗位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关联岗位（可选）
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">不关联岗位</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.company}
                    </option>
                  ))}
                </select>
              </div>

              {/* 准备天数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">准备天数</label>
                <div className="flex gap-2">
                  {[3, 5, 7, 14, 21].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPreparationDays(days)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        preparationDays === days
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {days} 天
                    </button>
                  ))}
                </div>
              </div>

              {/* 计划预览 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">计划将包含：</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 技术能力复习任务</li>
                  <li>• 行为面试准备</li>
                  <li>• 公司研究任务</li>
                  <li>• 自我介绍优化</li>
                  <li>• 模拟面试练习</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button onClick={handleCreatePlan} disabled={isCreating} className="flex-1">
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                生成计划
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
