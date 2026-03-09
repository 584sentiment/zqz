'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { resumesApi, Resume, MatchAnalysis } from '@/lib/api/resumes';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAutoSave } from '@/hooks/use-auto-save';
import type {
  ResumeContent,
  ResumeShape,
} from '@/components/resume-canvas';
import { AIEditorPanel } from '@/components/resume-canvas';
import { convertLegacyContentToCanvas } from '@/components/resume-canvas';
import type { ColorTheme } from '@ai-job-assistant/shared';

// 动态导入 tldraw 编辑器，禁用 SSR
const TldrawResumeEditor = dynamic(
  () => import('@/components/resume-canvas').then((mod) => mod.TldrawResumeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">加载编辑器...</div>
      </div>
    ),
  }
);

import {
  ArrowLeft,
  Save,
  Download,
  Sparkles,
  Loader2,
  FileText,
  Briefcase,
  Star,
  Copy,
  Trash2,
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileDown,
  ChevronDown,
  Cloud,
  CloudOff,
  History,
  RefreshCw,
  BarChart3,
  Palette,
  Wand2,
  Settings,
  PanelRight,
} from 'lucide-react';

// 样式预设配置
const STYLE_PRESETS = [
  { id: 'modern', name: '现代蓝色', color: '#1e40af' },
  { id: 'classic', name: '经典黑白', color: '#1f2937' },
  { id: 'creative', name: '创意紫色', color: '#7c3aed' },
  { id: 'minimal', name: '极简纯净', color: '#18181b' },
  { id: 'executive', name: '高管专业', color: '#0f766e' },
] as const;

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const resumeId = params.id as string;

  // 状态
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 编辑器相关
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>('modern');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'style' | 'ai' | 'settings'>('style');

  // 选中的形状（用于 AI 编辑面板）
  const [selectedShapes, setSelectedShapes] = useState<ResumeShape[]>([]);

  // 编辑器快照（用于保存）
  const [editorSnapshot, setEditorSnapshot] = useState<string | null>(null);

  // 将 API 返回的内容转换为 ResumeContent 格式
  const resumeContent = useMemo((): ResumeContent | null => {
    if (!resume?.content) return null;
    const content = resume.content as Record<string, unknown>;

    // 处理 summary
    let summaryText: string | undefined;
    if (typeof content.summary === 'string') {
      summaryText = content.summary;
    } else if (content.summary && typeof content.summary === 'object') {
      summaryText = (content.summary as Record<string, unknown>).text as string | undefined;
    }

    // 处理 skills
    let skillsList: string[] = [];
    if (Array.isArray(content.skills)) {
      skillsList = content.skills as string[];
    } else if (content.skills && typeof content.skills === 'object') {
      const skillsObj = content.skills as Record<string, unknown>;
      skillsList = (skillsObj.list as string[]) || [];
    }

    // 处理 experience
    let experienceList: ResumeContent['experience'] = [];
    if (Array.isArray(content.experience)) {
      experienceList = content.experience as ResumeContent['experience'];
    } else if (content.experience && typeof content.experience === 'object') {
      const expObj = content.experience as Record<string, unknown>;
      experienceList = (expObj.list as ResumeContent['experience']) || [];
    }

    // 处理 projects
    let projectsList: ResumeContent['projects'] = undefined;
    if (Array.isArray(content.projects)) {
      projectsList = content.projects as ResumeContent['projects'];
    } else if (content.projects && typeof content.projects === 'object') {
      const projObj = content.projects as Record<string, unknown>;
      if (Array.isArray(projObj.list)) {
        projectsList = projObj.list as ResumeContent['projects'];
      }
    }

    // 处理 education
    let educationList: ResumeContent['education'] = [];
    if (Array.isArray(content.education)) {
      educationList = content.education as ResumeContent['education'];
    } else if (content.education && typeof content.education === 'object') {
      const eduObj = content.education as Record<string, unknown>;
      educationList = (eduObj.list as ResumeContent['education']) || [];
    }

    return {
      name: (content.name as string) || resume.name || '未命名',
      title: content.title as string | undefined,
      contact: content.contact as ResumeContent['contact'],
      summary: summaryText,
      experience: experienceList,
      skills: skillsList,
      matchedSkills: content.matchedSkills as string[] | undefined,
      projects: projectsList,
      education: educationList,
      // 保留 canvas 快照，      _canvasSnapshot: content._canvasSnapshot as string | undefined,
    };
  }, [resume]);

  // 判断简历是否有内容
  const hasContent = useMemo(() => {
    if (!resume?.content) return false;
    const content = resume.content as Record<string, unknown>;
    // 检查是否有实质性内容
    return !!(
      content.name ||
      content.summary ||
      (content.skills && (Array.isArray(content.skills) ? content.skills.length > 0 : (content.skills as { list?: unknown[] })?.list?.length)) ||
      (content.experience && (Array.isArray(content.experience) ? content.experience.length > 0 : (content.experience as { list?: unknown[] })?.list?.length)) ||
      (content.education && (Array.isArray(content.education) ? content.education.length > 0 : (content.education as { list?: unknown[] })?.list?.length)) ||
      (content.projects && (Array.isArray(content.projects) ? content.projects.length > 0 : (content.projects as { list?: unknown[] })?.list?.length))
    );
  }, [resume?.content]);

  // 自动保存（有内容时启用）
  const {
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    save: autoSave,
  } = useAutoSave({
    data: resumeContent,
    onSave: async (content) => {
      if (!resume) return;
      await resumesApi.update(resume.id, { content: resume.content });
    },
    debounceMs: 3000,
    enabled: hasContent,
  });

  // 加载简历
  const loadResume = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resumesApi.getById(resumeId);
      setResume(data);
      if (data.templateId) {
        setSelectedTheme(data.templateId as ColorTheme);
      }
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

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu')) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 生成简历
  const handleGenerate = async () => {
    if (!resume) return;
    setIsGenerating(true);
    try {
      await resumesApi.update(resume.id, { status: 'generating' });
      setResume({ ...resume, status: 'generating' });

      const result = await resumesApi.generate(resume.id);

      if (!result.success) {
        throw new Error(result.error || '简历生成失败');
      }

      const updatedResume = await resumesApi.getById(resume.id);
      setResume(updatedResume);

      toast({
        title: '生成完成',
        description: result.matchAnalysis
          ? `简历已生成，与岗位匹配度 ${result.matchAnalysis.score}%`
          : '简历已根据岗位信息生成',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '简历生成失败';
      await resumesApi.update(resume.id, { status: 'failed' });
      setResume({ ...resume, status: 'failed' });
      toast({
        title: '生成失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出 PDF
  const handleExportPdf = async () => {
    if (!resume) return;
    setIsExporting(true);
    try {
      await resumesApi.exportPdf(resume.id);
      toast({ title: '导出成功', description: '简历已导出为 PDF 文件' });
    } catch (error: unknown) {
      const errorResponse = error as {
        response?: { status?: number; data?: { data?: { upgradeRequired?: boolean } } };
      };
      if (
        errorResponse.response?.status === 403 &&
        errorResponse.response?.data?.data?.upgradeRequired
      ) {
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

  // 分析匹配度
  const handleAnalyzeMatch = async () => {
    if (!resume) return;
    setIsAnalyzing(true);
    try {
      const analysis = await resumesApi.analyzeMatch(resume.id);
      setMatchAnalysis(analysis);
      setShowMatchDetails(true);
      setResume({ ...resume, matchScore: analysis.score / 100 });
    } catch (error) {
      toast({ title: '分析失败', description: '请确保简历已关联岗位', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 复制简历
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

  // 删除简历
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

  // 切换主题
  const handleThemeChange = async (theme: ColorTheme) => {
    setSelectedTheme(theme);
    if (resume) {
      try {
        await resumesApi.update(resume.id, { templateId: theme });
        setResume({ ...resume, templateId: theme });
      } catch {
        toast({ title: '保存失败', variant: 'destructive' });
      }
    }
  };

  // 手动保存简历内容
  const handleManualSave = async () => {
    if (!resume) return;

    setIsSaving(true);
    try {
      // 如果有编辑器快照，将快照保存到 content 中
      const contentToUpdate = editorSnapshot
        ? { ...resume.content, _canvasSnapshot: editorSnapshot }
        : resume.content;

      await resumesApi.update(resume.id, { content: contentToUpdate });
      setResume({ ...resume, content: contentToUpdate });
      toast({ title: '保存成功', description: '简历内容已保存' });
    } catch (error) {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // 获取选中内容的文本
  const getSelectedText = useCallback(() => {
    // 从选中的形状中提取文本
    const textShapes = selectedShapes.filter(
      (s) => s.type === 'text' || s.type === 'paragraph' || s.type === 'heading'
    );
    return textShapes.map((s) => (s as any).text || '').join('\n');
  }, [selectedShapes]);

  // 应用 AI 编辑
  const handleApplyAIEdit = useCallback(
    (shapes: ResumeShape[]) => {
      // 这里需要实现将 AI 优化后的形状应用到编辑器
      console.log('Applying AI edit:', shapes);
      toast({ title: '已应用 AI 修改', description: '简历内容已更新' });
    },
    [toast]
  );

  // 处理编辑器快照变化
  const handleEditorChange = useCallback((snapshot: string) => {
    setEditorSnapshot(snapshot);
  }, []);

  // 加载中状态
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

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/resumes">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{resume.name}</h1>
              {resume.job && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Briefcase className="w-3.5 h-3.5" />
                  {resume.job.title} - {resume.job.company}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 状态标签 */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
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

            {/* 保存按钮(有内容时显示) */}
            {hasContent && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={isSaving || isAutoSaving}
                >
                  {isSaving || isAutoSaving ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  {isSaving ? '保存中...' : '保存'}
                </Button>

                {/* 保存状态指示 */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isAutoSaving
                      ? 'bg-blue-50 text-blue-700'
                      : hasUnsavedChanges
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-green-50 text-green-700'
                  }`}
                >
                  {isAutoSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : hasUnsavedChanges ? (
                    <CloudOff className="w-3 h-3" />
                  ) : (
                    <Cloud className="w-3 h-3" />
                  )}
                  <span>{isAutoSaving ? '保存中' : hasUnsavedChanges ? '未保存' : '已保存'}</span>
                </div>
              </>
            )}

            {/* 无内容时显示 AI 生成按钮 */}
            {!hasContent && resume.status !== 'generating' && (
              <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    AI 生成简历
                  </>
                )}
              </Button>
            )}

            {/* 有内容时显示操作按钮 */}
            {hasContent && (
              <>
                {/* 匹配度 */}
                {resume.matchScore && (
                  <button
                    onClick={handleAnalyzeMatch}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition cursor-pointer text-sm"
                  >
                    <Star className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">
                      {Math.round(resume.matchScore * 100)}% 匹配
                    </span>
                  </button>
                )}

                {/* 导出按钮 */}
                <div className="relative dropdown-menu">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportMenu(!showExportMenu);
                    }}
                    disabled={isExporting}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    导出
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                      <button
                        onClick={() => {
                          handleExportPdf();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        导出 PDF
                      </button>
                    </div>
                  )}
                </div>

                {/* AI 工具 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSidebar(true);
                    setSidebarTab('ai');
                  }}
                >
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  AI 助手
                </Button>

                {/* 侧边栏切换 */}
                <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
                  <PanelRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 画布编辑器 */}
          <div className="flex-1 relative">
            <TldrawResumeEditor
              resumeContent={resumeContent}
              theme={selectedTheme}
              onChange={handleEditorChange}
              readOnly={!hasContent}
              showMarginGuides={false}
            />
          </div>

          {/* 右侧边栏（有内容时显示） */}
          {hasContent && showSidebar && (
            <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
              {/* 标签切换 */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setSidebarTab('style')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'style'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  样式
                </button>
                <button
                  onClick={() => setSidebarTab('ai')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'ai'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  AI
                </button>
                <button
                  onClick={() => setSidebarTab('settings')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'settings'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  更多
                </button>
              </div>

              {/* 标签内容 */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* 样式标签 */}
                {sidebarTab === 'style' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">颜色主题</h3>
                      <div className="space-y-2">
                        {STYLE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleThemeChange(preset.id as ColorTheme)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition ${
                              selectedTheme === preset.id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: preset.color }}
                              />
                              <span className="font-medium text-gray-900 text-sm">
                                {preset.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI 标签 */}
                {sidebarTab === 'ai' && (
                  <AIEditorPanel
                    resumeId={resume.id}
                    theme={selectedTheme}
                    selectedShapes={selectedShapes}
                    getSelectedText={getSelectedText}
                    onApplyEdit={handleApplyAIEdit}
                    jobDescription={undefined}
                    targetRole={resume.job?.title ?? undefined}
                    collapsed={false}
                    onCollapsedChange={() => {}}
                    className="border-none shadow-none"
                  />
                )}

                {/* 设置标签 */}
                {sidebarTab === 'settings' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">操作</h3>
                      <div className="space-y-2">
                        <button
                          onClick={handleDuplicate}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition text-sm flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                          <span>复制简历</span>
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full text-left p-3 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition text-sm flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>删除简历</span>
                        </button>
                      </div>
                    </div>

                    {resume.jobId && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">岗位分析</h3>
                        <button
                          onClick={handleAnalyzeMatch}
                          disabled={isAnalyzing}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition text-sm flex items-center gap-2"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Target className="w-4 h-4 text-gray-500" />
                          )}
                          <span>匹配度分析</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 匹配度分析详情弹窗 */}
        {showMatchDetails && matchAnalysis && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
                    <span className="font-semibold text-gray-900">
                      {matchAnalysis.breakdown.skills.score}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${matchAnalysis.breakdown.skills.score}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">经历匹配</span>
                    <span className="font-semibold text-gray-900">
                      {matchAnalysis.breakdown.experience.score}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${matchAnalysis.breakdown.experience.score}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">学历匹配</span>
                    <span className="font-semibold text-gray-900">
                      {matchAnalysis.breakdown.education.score}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${matchAnalysis.breakdown.education.score}%` }}
                    />
                  </div>
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
                <h3 className="text-sm font-medium text-gray-700 mb-2">改进建议</h3>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
