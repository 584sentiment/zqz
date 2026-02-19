'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { interviewsApi, QuestionCategory, InProgressInterview } from '@/lib/api/interviews';
import { jobsApi, Job } from '@/lib/api/jobs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mic,
  FileText,
  Target,
  Briefcase,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';

export default function NewInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [inProgressInterview, setInProgressInterview] = useState<InProgressInterview | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // 表单状态
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'text' | 'voice'>('text');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // 处理 URL 参数中的 jobId
  useEffect(() => {
    const jobIdFromUrl = searchParams.get('jobId');
    if (jobIdFromUrl) {
      setSelectedJob(jobIdFromUrl);
      // 清除 URL 参数
      router.replace('/dashboard/interviews/new');
    }
  }, [searchParams, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsResponse, categoriesData, inProgressData] = await Promise.all([
          jobsApi.getList({ status: 'active' }),
          interviewsApi.getCategories(),
          interviewsApi.getInProgress().catch(() => null),
        ]);
        setJobs(jobsResponse.data.slice(0, 10));
        setCategories(categoriesData);
        if (inProgressData) {
          setInProgressInterview(inProgressData);
          setShowResumePrompt(true);
        }
      } catch (error) {
        console.error('加载数据失败', error);
      }
    };
    loadData();
  }, []);

  const handleStartInterview = async () => {
    setIsLoading(true);
    try {
      const interview = await interviewsApi.create({
        type: 'mock',
        jobId: selectedJob || undefined,
        mode: selectedMode,
        difficulty: selectedDifficulty,
      });

      toast({ title: '创建成功', description: '面试已准备就绪' });

      // 自动开始面试
      await interviewsApi.start(interview.id);

      router.push(`/dashboard/interviews/${interview.id}`);
    } catch (error) {
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeInterview = () => {
    if (inProgressInterview) {
      router.push(`/dashboard/interviews/${inProgressInterview.id}`);
    }
  };

  const handleStartNewAnyway = () => {
    setShowResumePrompt(false);
  };

  const difficultyOptions = [
    {
      value: 'easy',
      label: '简单',
      description: '3 道基础问题，适合初次练习',
      icon: '🌱',
    },
    {
      value: 'medium',
      label: '中等',
      description: '5 道综合问题，标准难度',
      icon: '💪',
    },
    {
      value: 'hard',
      label: '困难',
      description: '6 道深入问题，挑战自我',
      icon: '🔥',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* 恢复面试提示 */}
        {showResumePrompt && inProgressInterview && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800">你有一场面试正在进行中</h3>
                <p className="text-amber-700 text-sm mt-1">
                  已完成 {inProgressInterview.progress.answered} / {inProgressInterview.progress.total} 题
                  ({inProgressInterview.progress.percentage}%)
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    onClick={handleResumeInterview}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    恢复面试
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartNewAnyway}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    开始新面试
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 返回按钮 */}
        <Link
          href="/dashboard/interviews"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回面试列表
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold">开始 AI 模拟面试</h1>
            </div>
            <p className="text-white/80 text-sm">
              选择面试参数，AI 将根据你的选择生成定制化面试问题
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* 步骤指示器 */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      s <= step
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-12 h-0.5 ${
                        s < step ? 'bg-primary' : 'bg-gray-100'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* 步骤 1: 选择岗位 */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Briefcase className="w-5 h-5 text-primary" />
                  选择目标岗位
                </div>
                <p className="text-sm text-gray-500">
                  选择一个岗位可以让 AI 生成更针对性的问题（可选）
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => setSelectedJob('')}
                    className={`w-full p-3 rounded-lg border text-left transition ${
                      selectedJob === ''
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">通用面试</div>
                    <div className="text-sm text-gray-500">
                      不关联特定岗位，使用通用面试问题
                    </div>
                  </button>

                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job.id)}
                      className={`w-full p-3 rounded-lg border text-left transition ${
                        selectedJob === job.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-500">
                        {job.company} {job.location && `· ${job.location}`}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setStep(2)}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* 步骤 2: 选择难度 */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Target className="w-5 h-5 text-primary" />
                  选择难度级别
                </div>
                <p className="text-sm text-gray-500">
                  不同难度对应不同数量和深度的问题
                </p>

                <div className="space-y-2">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDifficulty(option.value as 'easy' | 'medium' | 'hard')}
                      className={`w-full p-4 rounded-lg border text-left transition ${
                        selectedDifficulty === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    上一步
                  </Button>
                  <Button onClick={() => setStep(3)}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* 步骤 3: 选择模式并开始 */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FileText className="w-5 h-5 text-primary" />
                  选择面试模式
                </div>
                <p className="text-sm text-gray-500">
                  选择文字或语音模式进行面试
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedMode('text')}
                    className={`p-4 rounded-lg border text-center transition ${
                      selectedMode === 'text'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText
                      className={`w-8 h-8 mx-auto mb-2 ${
                        selectedMode === 'text' ? 'text-primary' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-medium text-gray-900">文字面试</div>
                    <div className="text-sm text-gray-500 mt-1">
                      通过打字回答问题
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedMode('voice')}
                    className={`p-4 rounded-lg border text-center transition ${
                      selectedMode === 'voice'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mic
                      className={`w-8 h-8 mx-auto mb-2 ${
                        selectedMode === 'voice' ? 'text-primary' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-medium text-gray-900">语音面试</div>
                    <div className="text-sm text-gray-500 mt-1">
                      通过语音回答问题
                    </div>
                  </button>
                </div>

                {/* 确认信息 */}
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-gray-900 mb-3">面试配置确认</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">目标岗位</span>
                      <span className="text-gray-900">
                        {selectedJob
                          ? jobs.find((j) => j.id === selectedJob)?.title || '通用面试'
                          : '通用面试'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">难度级别</span>
                      <span className="text-gray-900">
                        {difficultyOptions.find((d) => d.value === selectedDifficulty)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">面试模式</span>
                      <span className="text-gray-900">
                        {selectedMode === 'text' ? '文字面试' : '语音面试'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    上一步
                  </Button>
                  <Button onClick={handleStartInterview} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始面试
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
