'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { interviewsApi, Interview, AnswerFeedback } from '@/lib/api/interviews';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mic,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  ChevronRight,
  Star,
  TrendingUp,
  AlertCircle,
  FileText,
  Target,
} from 'lucide-react';

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 面试状态
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // 完成状态
  const [isCompleted, setIsCompleted] = useState(false);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadInterview = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await interviewsApi.getById(interviewId);
      setInterview(data);

      // 计算当前问题索引
      const transcript = data.transcript as Record<string, unknown> | null;
      const answers = (transcript?.answers as Record<string, unknown>[]) || [];
      setCurrentQuestionIndex(answers.length);

      if (data.status === 'completed') {
        setIsCompleted(true);
        setReport(data.report as Record<string, unknown>);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载面试详情',
        variant: 'destructive',
      });
      router.push('/dashboard/interviews');
    } finally {
      setIsLoading(false);
    }
  }, [interviewId, toast, router]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  useEffect(() => {
    if (textareaRef.current && !showFeedback && !isCompleted) {
      textareaRef.current.focus();
    }
  }, [showFeedback, isCompleted, currentQuestionIndex]);

  useEffect(() => {
    if (!showFeedback && !isCompleted) {
      setStartTime(Date.now());
    }
  }, [showFeedback, isCompleted, currentQuestionIndex]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !interview) return;

    setIsSubmitting(true);
    try {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const result = await interviewsApi.submitAnswer(interview.id, {
        questionIndex: currentQuestionIndex,
        answer: answer.trim(),
        duration,
      });

      setFeedback(result.feedback);
      setShowFeedback(true);

      if (result.isCompleted) {
        setIsCompleted(true);
        // 重新获取报告
        const reportData = await interviewsApi.getReport(interview.id);
        setReport(reportData);
      }
    } catch (error) {
      toast({ title: '提交失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setAnswer('');
    setFeedback(null);
    setShowFeedback(false);
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const handleAbortInterview = async () => {
    if (!confirm('确定要结束面试吗？将生成部分报告。')) return;
    try {
      await interviewsApi.abort(interviewId);
      toast({ title: '面试已结束', description: '已生成部分报告' });
      loadInterview();
    } catch (error) {
      toast({ title: '操作失败', description: '请稍后重试', variant: 'destructive' });
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

  if (!interview) return null;

  const questions = interview.questions as Record<string, unknown>[];
  const jobContext = interview.jobContext as Record<string, unknown> | null;

  // 完成报告视图
  if (isCompleted && report) {
    const totalScore = report.totalScore as number;
    const dimensions = report.dimensions as Record<string, Record<string, unknown>>;
    const recommendations = report.recommendations as string[];
    const timeStats = report.timeStats as {
      totalTime: number;
      averageTime: number;
      questionTimes: { questionIndex: number; duration: number }[];
    } | undefined;
    const answersSummary = report.answersSummary as { questionIndex: number; score: number; duration?: number }[] | undefined;

    // 格式化时间
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
    };

    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dashboard/interviews"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回面试列表
          </Link>

          {/* 报告头部 */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-8 text-white mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">面试报告</h1>
            </div>
            <p className="text-white/80 mb-6">
              {jobContext?.title
                ? `${jobContext.title as string} - AI 模拟面试`
                : 'AI 模拟面试'}
            </p>

            {/* 总分和时间统计 */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold mb-1">{totalScore}</div>
                <div className="text-white/80 text-sm">总分</div>
              </div>
              <div className="flex-1">
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${totalScore}%` }}
                  />
                </div>
                <p className="text-white/80 text-sm mt-2">
                  {report.summary as string}
                </p>
              </div>
              {timeStats && (
                <div className="text-center border-l border-white/20 pl-6">
                  <div className="flex items-center gap-1 text-white/80 text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    总耗时
                  </div>
                  <div className="text-2xl font-bold">{formatTime(timeStats.totalTime)}</div>
                  <div className="text-white/60 text-xs mt-1">
                    平均每题 {formatTime(timeStats.averageTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 时间统计详情 */}
          {timeStats && answersSummary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                答题时间统计
              </h2>
              <div className="space-y-3">
                {answersSummary.map((answer, index) => {
                  const question = questions[answer.questionIndex];
                  const duration = answer.duration || timeStats.questionTimes[index]?.duration || 0;
                  const maxDuration = Math.max(...(timeStats.questionTimes?.map(t => t.duration) || [1]));
                  const percentage = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-16 text-sm text-gray-500">
                        第 {index + 1} 题
                      </div>
                      <div className="flex-1">
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all ${
                              duration < 60
                                ? 'bg-green-400'
                                : duration < 120
                                ? 'bg-blue-400'
                                : 'bg-orange-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-gray-700">
                            {(question?.question as string)?.slice(0, 30)}...
                          </span>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className={`text-sm font-medium ${
                          duration < 60
                            ? 'text-green-600'
                            : duration < 120
                            ? 'text-blue-600'
                            : 'text-orange-600'
                        }`}>
                          {formatTime(duration)}
                        </span>
                      </div>
                      <div className="w-12 text-right">
                        <span className={`text-sm font-bold ${
                          (answer.score || 0) >= 80
                            ? 'text-green-600'
                            : (answer.score || 0) >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {answer.score}分
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                    &lt;1分钟
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                    1-2分钟
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                    &gt;2分钟
                  </span>
                </div>
                <div className="text-gray-500">
                  总耗时: <span className="font-semibold text-gray-900">{formatTime(timeStats.totalTime)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 维度评分 */}
          {dimensions && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">能力维度分析</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(dimensions).map(([key, value]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {value.label as string}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {value.score as number}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${value.score as number}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {value.feedback as string}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 改进建议 */}
          {recommendations && recommendations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">改进建议</h2>
              <ul className="space-y-3">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard/interviews/new">
              <Button>
                <Mic className="w-4 h-4 mr-2" />
                再次面试
              </Button>
            </Link>
            <Link href="/dashboard/interviews">
              <Button variant="outline">返回列表</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 面试进行中视图
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + (showFeedback ? 1 : 0)) / questions.length) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard/interviews"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            退出面试
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {currentQuestionIndex + 1} / {questions.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleAbortInterview}
            >
              <XCircle className="w-4 h-4 mr-1" />
              结束面试
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 问题区域 */}
          {!showFeedback ? (
            <>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                    {currentQuestion?.category as string}
                  </span>
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded">
                    {currentQuestion?.type === 'technical' ? '技术题' : currentQuestion?.type === 'behavioral' ? '行为题' : 'HR 题'}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                  {currentQuestion?.question as string}
                </h2>

                {/* 评分要点提示 */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">回答要点：</p>
                  <div className="flex flex-wrap gap-2">
                    {(currentQuestion?.keypoints as string[])?.map((point, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white text-gray-600 text-sm rounded border border-gray-200"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 回答区域 */}
              <div className="p-6">
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="在此输入你的回答..."
                  className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  disabled={isSubmitting}
                />

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>建议回答时间：2-3 分钟</span>
                  </div>
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        提交回答
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* 反馈区域 */
            <div className="p-6">
              <div className="text-center mb-6">
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                    (feedback?.score || 0) >= 80
                      ? 'bg-green-100'
                      : (feedback?.score || 0) >= 60
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                  }`}
                >
                  <span
                    className={`text-3xl font-bold ${
                      (feedback?.score || 0) >= 80
                        ? 'text-green-600'
                        : (feedback?.score || 0) >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {feedback?.score}
                  </span>
                </div>
                <p className="mt-2 text-gray-500">本题得分</p>
              </div>

              {/* 反馈详情 */}
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    回答亮点
                  </h4>
                  <ul className="space-y-1">
                    {feedback?.strengths?.map((s, i) => (
                      <li key={i} className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    改进建议
                  </h4>
                  <ul className="space-y-1">
                    {feedback?.improvements?.map((s, i) => (
                      <li key={i} className="text-sm text-yellow-700 flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">详细反馈</h4>
                  <p className="text-sm text-blue-700">{feedback?.suggestions}</p>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <Button onClick={handleNextQuestion} size="lg">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      下一题
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      查看报告
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
