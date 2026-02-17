'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { resumesApi, Resume, MatchAnalysis } from '@/lib/api/resumes';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAutoSave } from '@/hooks/use-auto-save';
import {
  ArrowLeft,
  Save,
  Download,
  Sparkles,
  Loader2,
  Edit2,
  FileText,
  Briefcase,
  Star,
  Copy,
  Trash2,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  FileDown,
  ChevronDown,
  Languages,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Cloud,
  CloudOff,
} from 'lucide-react';

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const resumeId = params.id as string;

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // 缩放级别 50% - 200%

  // 编辑状态
  const [editedContent, setEditedContent] = useState<Record<string, unknown>>({});

  // 自动保存
  const {
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    saveStatusText,
    save: autoSave,
  } = useAutoSave({
    data: editedContent,
    onSave: async (content) => {
      if (!resume) return;
      await resumesApi.update(resume.id, { content });
      setResume({ ...resume, content });
    },
    debounceMs: 2000,
    enabled: isEditing && resume?.status === 'completed',
  });

  const loadResume = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resumesApi.getById(resumeId);
      setResume(data);
      setEditedContent((data.content as Record<string, unknown>) || {});
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载简历详情',
        variant: 'destructive',
      });
      router.push('/dashboard/resumes');
    } finally {
      setIsLoading(false);
    }
  }, [resumeId, toast, router]);

  useEffect(() => {
    loadResume();
  }, [loadResume]);

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowExportMenu(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  const handleSave = async () => {
    if (!resume) return;
    setIsSaving(true);
    try {
      await resumesApi.update(resume.id, { content: editedContent });
      setResume({ ...resume, content: editedContent });
      setIsEditing(false);
      toast({ title: '保存成功', description: '简历已更新' });
    } catch (error) {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!resume) return;
    setIsGenerating(true);
    try {
      // 更新状态为生成中
      await resumesApi.update(resume.id, { status: 'generating' });
      setResume({ ...resume, status: 'generating' });

      // 模拟 AI 生成（实际应调用 AI 服务）
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 生成示例内容
      const generatedContent = {
        summary: '资深全栈开发工程师，5年以上 Web 开发经验。精通 React、Node.js、TypeScript 等技术栈，具备良好的系统架构能力和团队协作经验。',
        experience: [
          {
            company: '示例科技有限公司',
            position: '高级前端工程师',
            period: '2021.03 - 至今',
            highlights: [
              '负责公司核心产品的前端架构设计和开发',
              '带领团队完成多个大型项目的交付',
              '优化页面性能，加载速度提升 50%',
            ],
          },
        ],
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
        education: [
          {
            school: '示例大学',
            major: '计算机科学与技术',
            degree: '本科',
            period: '2014.09 - 2018.06',
          },
        ],
      };

      await resumesApi.update(resume.id, {
        content: generatedContent,
        status: 'completed',
        matchScore: 0.85,
      });

      setResume({
        ...resume,
        content: generatedContent,
        status: 'completed',
        matchScore: 0.85,
      });
      setEditedContent(generatedContent);

      toast({
        title: '生成完成',
        description: '简历已根据岗位信息生成',
      });
    } catch (error) {
      await resumesApi.update(resume.id, { status: 'failed' });
      setResume({ ...resume, status: 'failed' });
      toast({ title: '生成失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDuplicate = async () => {
    if (!resume) return;
    try {
      const newResume = await resumesApi.duplicate(resume.id);
      toast({ title: '复制成功', description: '已创建简历副本' });
      router.push(`/dashboard/resumes/${newResume.id}`);
    } catch (error) {
      toast({ title: '复制失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!resume) return;
    if (!confirm('确定要删除这份简历吗？')) return;
    try {
      await resumesApi.delete(resume.id);
      toast({ title: '删除成功', description: '简历已删除' });
      router.push('/dashboard/resumes');
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const handleExportPdf = async () => {
    if (!resume) return;
    setIsExporting(true);
    try {
      const result = await resumesApi.exportPdf(resume.id);

      // 创建 Blob 并下载
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename.replace('.pdf', '.html'); // 暂时保存为 HTML
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: '简历已导出为 HTML 文件，可使用浏览器打印功能转为 PDF',
      });
    } catch (error: unknown) {
      const errorResponse = error as { response?: { status?: number; data?: { data?: { upgradeRequired?: boolean } } } };
      if (errorResponse.response?.status === 403 && errorResponse.response?.data?.data?.upgradeRequired) {
        toast({
          title: '导出配额已用尽',
          description: '本月简历导出次数已用完，请升级套餐',
          variant: 'destructive',
        });
      } else {
        toast({ title: '导出失败', description: '请稍后重试', variant: 'destructive' });
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportWord = async () => {
    if (!resume) return;
    setIsExportingWord(true);
    try {
      const result = await resumesApi.exportWord(resume.id);

      // 创建 Blob 并下载
      const blob = new Blob([result.html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: '简历已导出为 Word 文件',
      });
    } catch (error: unknown) {
      const errorResponse = error as { response?: { status?: number; data?: { data?: { upgradeRequired?: boolean } } } };
      if (errorResponse.response?.status === 403 && errorResponse.response?.data?.data?.upgradeRequired) {
        toast({
          title: '导出配额已用尽',
          description: '本月简历导出次数已用完，请升级套餐',
          variant: 'destructive',
        });
      } else {
        toast({ title: '导出失败', description: '请稍后重试', variant: 'destructive' });
      }
    } finally {
      setIsExportingWord(false);
      setShowExportMenu(false);
    }
  };

  const handleAnalyzeMatch = async () => {
    if (!resume) return;
    setIsAnalyzing(true);
    try {
      const analysis = await resumesApi.analyzeMatch(resume.id);
      setMatchAnalysis(analysis);
      setShowMatchDetails(true);

      // 更新简历的匹配分数
      setResume({ ...resume, matchScore: analysis.score / 100 });
    } catch (error) {
      toast({ title: '分析失败', description: '请确保简历已关联岗位', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
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

  if (!resume) return null;

  const content = (resume.content as Record<string, unknown>) || {};

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/resumes">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回列表
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{resume.name}</h1>
              {resume.job && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <Briefcase className="w-4 h-4" />
                  {resume.job.title} - {resume.job.company}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              复制
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        {/* 操作区 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {resume.status === 'completed' && resume.matchScore && (
                <button
                  onClick={handleAnalyzeMatch}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg hover:bg-green-100 transition cursor-pointer"
                >
                  <Star className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">
                    {Math.round(resume.matchScore * 100)}% 岗位匹配
                  </span>
                </button>
              )}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  resume.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : resume.status === 'generating'
                    ? 'bg-blue-100 text-blue-700'
                    : resume.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {resume.status === 'completed'
                  ? '已完成'
                  : resume.status === 'generating'
                  ? '生成中'
                  : resume.status === 'failed'
                  ? '生成失败'
                  : '草稿'}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                <Languages className="w-3.5 h-3.5" />
                {resume.language === 'en' ? 'English' : '中文'}
              </span>
              {/* 自动保存状态 */}
              {isEditing && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    isAutoSaving
                      ? 'bg-blue-50 text-blue-700'
                      : hasUnsavedChanges
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {isAutoSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <CloudOff className="w-3.5 h-3.5" />
                      <span>未保存</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>{saveStatusText || '已保存'}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {resume.status !== 'completed' && (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="shadow-lg shadow-primary/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI 生成简历
                    </>
                  )}
                </Button>
              )}
              {resume.status === 'completed' && (
                <>
                  {resume.jobId && (
                    <Button
                      variant="outline"
                      onClick={handleAnalyzeMatch}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Target className="w-4 h-4 mr-2" />
                      )}
                      匹配分析
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {isEditing ? '取消编辑' : '编辑'}
                  </Button>
                  {isEditing && (
                    <Button
                      onClick={async () => {
                        await autoSave();
                        setIsEditing(false);
                        toast({ title: '保存成功', description: '简历已更新' });
                      }}
                      disabled={isAutoSaving || isSaving}
                    >
                      {(isAutoSaving || isSaving) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      完成编辑
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    重新生成
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={isExporting || isExportingWord}
                    >
                      {(isExporting || isExportingWord) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      导出
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                        <button
                          onClick={handleExportPdf}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={isExporting}
                        >
                          <FileText className="w-4 h-4" />
                          导出为 PDF
                        </button>
                        <button
                          onClick={handleExportWord}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={isExportingWord}
                        >
                          <FileDown className="w-4 h-4" />
                          导出为 Word
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 匹配度分析详情 */}
        {showMatchDetails && matchAnalysis && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                岗位匹配度分析
              </h2>
              <button
                onClick={() => setShowMatchDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* 总分 */}
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{matchAnalysis.score}</div>
                <div className="text-sm text-gray-500">总分</div>
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      matchAnalysis.score >= 80
                        ? 'bg-green-500'
                        : matchAnalysis.score >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${matchAnalysis.score}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {matchAnalysis.breakdown.overall.details}
                </p>
              </div>
            </div>

            {/* 维度分析 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">技能匹配</span>
                  <span className="font-semibold text-gray-900">{matchAnalysis.breakdown.skills.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${matchAnalysis.breakdown.skills.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{matchAnalysis.breakdown.skills.details}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">经历匹配</span>
                  <span className="font-semibold text-gray-900">{matchAnalysis.breakdown.experience.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${matchAnalysis.breakdown.experience.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{matchAnalysis.breakdown.experience.details}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">学历匹配</span>
                  <span className="font-semibold text-gray-900">{matchAnalysis.breakdown.education.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${matchAnalysis.breakdown.education.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{matchAnalysis.breakdown.education.details}</p>
              </div>
            </div>

            {/* 匹配的技能 */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                匹配的技能
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchAnalysis.matchedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-50 text-green-700 text-sm rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* 缺失的技能 */}
            {matchAnalysis.missingSkills.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  建议补充
                </h3>
                <div className="flex flex-wrap gap-2">
                  {matchAnalysis.missingSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-yellow-50 text-yellow-700 text-sm rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 改进建议 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                改进建议
              </h3>
              <ul className="space-y-1">
                {matchAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 简历内容 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 缩放控制栏 */}
          {resume.status === 'completed' && (
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">简历预览</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                  disabled={zoomLevel <= 50}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="缩小"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600" />
                </button>
                <div className="flex items-center gap-1 px-2">
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-gray-500 w-10 text-right">{zoomLevel}%</span>
                </div>
                <button
                  onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                  disabled={zoomLevel >= 200}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="放大"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-1.5 rounded hover:bg-gray-200"
                  title="重置缩放"
                >
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          <div
            className="p-8 transition-transform origin-top"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {resume.status === 'draft' ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">简历尚未生成</h3>
              <p className="text-gray-500 mb-6">点击"AI 生成简历"按钮，让 AI 根据岗位信息为您定制简历</p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI 生成简历
              </Button>
            </div>
          ) : resume.status === 'generating' ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">正在生成简历...</h3>
              <p className="text-gray-500">AI 正在分析岗位要求并为您定制简历内容</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 个人简介 */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  个人简介
                </h2>
                {isEditing ? (
                  <textarea
                    value={(editedContent.summary as string) || ''}
                    onChange={(e) =>
                      setEditedContent({ ...editedContent, summary: e.target.value })
                    }
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    {(content.summary as string) || '暂无个人简介'}
                  </p>
                )}
              </section>

              {/* 工作经历 */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  工作经历
                </h2>
                <div className="space-y-4">
                  {((content.experience as Array<Record<string, unknown>>) || []).map(
                    (exp, index) => (
                      <div key={index} className="border-l-2 border-primary/30 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {exp.position as string}
                            </h3>
                            <p className="text-sm text-gray-600">{exp.company as string}</p>
                          </div>
                          <span className="text-sm text-gray-500">{exp.period as string}</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {((exp.highlights as string[]) || []).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* 技能标签 */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  专业技能
                </h2>
                <div className="flex flex-wrap gap-2">
                  {((content.skills as string[]) || []).map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              {/* 教育经历 */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  教育经历
                </h2>
                <div className="space-y-3">
                  {((content.education as Array<Record<string, unknown>>) || []).map(
                    (edu, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{edu.school as string}</h3>
                          <p className="text-sm text-gray-600">
                            {edu.major as string} · {edu.degree as string}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">{edu.period as string}</span>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
