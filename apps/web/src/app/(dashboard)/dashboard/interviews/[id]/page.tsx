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
  Download,
  Share2,
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

  // 语音识别状态
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  // 检查语音识别支持
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // 更新回答文本
        if (finalTranscript) {
          setAnswer((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicPermission('denied');
          toast({
            title: '麦克风权限被拒绝',
            description: '请在浏览器设置中允许使用麦克风',
            variant: 'destructive',
          });
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  // 请求麦克风权限
  const requestMicPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 获取成功，立即释放流（我们只需要权限）
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission('granted');
      return true;
    } catch (error) {
      console.error('麦克风权限请求失败:', error);
      setMicPermission('denied');
      toast({
        title: '麦克风权限被拒绝',
        description: '请在浏览器地址栏左侧点击图标，允许使用麦克风',
        variant: 'destructive',
      });
      return false;
    }
  };

  // 开始录音（会自动请求权限）
  const startRecording = async () => {
    if (!recognitionRef.current) return;

    // 如果权限未授予，先请求权限
    if (micPermission !== 'granted') {
      const granted = await requestMicPermission();
      if (!granted) return;
    }

    setAnswer(''); // 清空之前的内容
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('启动语音识别失败:', error);
    }
  };

  const toggleRecording = async () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      await startRecording();
    }
  };

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

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  // 导出报告
  const handleExportReport = () => {
    if (!report || !interview) return;

    const totalScore = report.totalScore as number;
    const dimensions = report.dimensions as Record<string, Record<string, unknown>>;
    const recommendations = report.recommendations as string[];
    const timeStats = report.timeStats as {
      totalTime: number;
      averageTime: number;
    } | undefined;
    const jobContext = interview.jobContext as Record<string, unknown> | null;

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>面试报告 - ${jobContext?.title || 'AI 模拟面试'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.8; margin-bottom: 24px; }
    .score-section { display: flex; align-items: center; gap: 32px; }
    .total-score { text-align: center; }
    .total-score .score { font-size: 56px; font-weight: bold; }
    .total-score .label { font-size: 14px; opacity: 0.8; }
    .progress-bar { flex: 1; }
    .progress-bar .bar { height: 16px; background: rgba(255,255,255,0.2); border-radius: 8px; overflow: hidden; }
    .progress-bar .bar-inner { height: 100%; background: white; border-radius: 8px; }
    .progress-bar .summary { font-size: 14px; margin-top: 8px; opacity: 0.8; }
    .time-stats { border-left: 1px solid rgba(255,255,255,0.2); padding-left: 24px; text-align: center; }
    .time-stats .time { font-size: 24px; font-weight: bold; }
    .time-stats .label { font-size: 12px; opacity: 0.6; }
    .section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #111; }
    .dimension-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .dimension-card { background: #f9fafb; padding: 16px; border-radius: 8px; }
    .dimension-card .header { display: flex; justify-content: space-between; margin-bottom: 8px; background: none; padding: 0; color: inherit; }
    .dimension-card .title { font-weight: 500; }
    .dimension-card .score { font-weight: bold; color: #2563eb; }
    .dimension-card .bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .dimension-card .bar-inner { height: 100%; background: #2563eb; }
    .dimension-card .feedback { font-size: 14px; color: #6b7280; margin-top: 8px; }
    .recommendations li { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .recommendations .icon { color: #2563eb; flex-shrink: 0; }
    .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>面试报告</h1>
      <p class="subtitle">${jobContext?.title || 'AI 模拟面试'}</p>
      <div class="score-section">
        <div class="total-score">
          <div class="score">${totalScore}</div>
          <div class="label">总分</div>
        </div>
        <div class="progress-bar">
          <div class="bar"><div class="bar-inner" style="width: ${totalScore}%"></div></div>
          <p class="summary">${report.summary || ''}</p>
        </div>
        ${timeStats ? `
        <div class="time-stats">
          <div class="time">${formatTime(timeStats.totalTime)}</div>
          <div class="label">总耗时</div>
          <div class="label" style="margin-top: 4px">平均 ${formatTime(timeStats.averageTime)}/题</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${dimensions ? `
    <div class="section">
      <h2>能力维度分析</h2>
      <div class="dimension-grid">
        ${Object.entries(dimensions).map(([key, value]) => `
        <div class="dimension-card">
          <div class="header">
            <span class="title">${value.label}</span>
            <span class="score">${value.score}</span>
          </div>
          <div class="bar"><div class="bar-inner" style="width: ${value.score}%"></div></div>
          <p class="feedback">${value.feedback}</p>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${recommendations?.length ? `
    <div class="section">
      <h2>改进建议</h2>
      <ul class="recommendations" style="list-style: none;">
        ${recommendations.map(rec => `
        <li>
          <span class="icon">↑</span>
          <span>${rec}</span>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="footer">
      <p>由 AI 求职辅助平台生成 · ${new Date().toLocaleDateString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>
    `;

    // 创建下载
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `面试报告_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: '导出成功', description: '报告已下载' });
  };

  // 复制分享链接
  const handleShareReport = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: '链接已复制', description: '可以分享给他人查看' });
    } catch {
      toast({ title: '复制失败', description: '请手动复制链接', variant: 'destructive' });
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
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </Button>
            <Button variant="outline" onClick={handleShareReport}>
              <Share2 className="w-4 h-4 mr-2" />
              分享链接
            </Button>
            <Link href="/dashboard/interviews">
              <Button variant="ghost">返回列表</Button>
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
                {/* 语音输入按钮 */}
                {speechSupported && (
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant={isRecording ? 'destructive' : 'outline'}
                      onClick={toggleRecording}
                      disabled={isSubmitting}
                      className={isRecording ? 'animate-pulse' : ''}
                    >
                      <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                      {isRecording ? '停止录音' : micPermission === 'denied' ? '重新授权麦克风' : '语音输入'}
                    </Button>
                    {/* 权限状态提示 */}
                    {micPermission === 'denied' && !isRecording && (
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        点击按钮重新请求麦克风权限
                      </span>
                    )}
                    {micPermission === 'granted' && !isRecording && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        麦克风已就绪
                      </span>
                    )}
                    {isRecording && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-600">正在录音...</span>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={isRecording ? "正在识别语音，请说话..." : "在此输入你的回答，或点击上方按钮使用语音输入..."}
                  className={`w-full h-48 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none ${
                    isRecording ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
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
