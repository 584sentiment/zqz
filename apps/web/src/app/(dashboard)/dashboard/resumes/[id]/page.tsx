'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { resumesApi, Resume, MatchAnalysis, ResumeVersion, ResumeSuggestion, JobKeywordExtraction, SkillMatchResult } from '@/lib/api/resumes';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useResumeHistory } from '@/hooks/use-resume-history';
import { AIErrorState } from '@/components/ai-error-state';
import { AIToolbar, SuggestionsPanel, JobKeywordsPanel, SectionPolishDialog } from '@/components/resume-ai-tools';
import type { ResumeContent } from '@/components/resume-canvas';
import type { ColorTheme } from '@ai-job-assistant/shared';

// 动态导入 tldraw 编辑器，禁用 SSR
const TldrawResumeEditor = dynamic(
  () => import('@/components/resume-canvas').then((mod) => mod.TldrawResumeEditor),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100"><div className="text-gray-500">加载编辑器...</div></div> }
);

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
  Cloud,
  CloudOff,
  History,
  RotateCcw,
  RefreshCw,
  Key,
  Lightbulb,
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
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // AI 错误状态
  const [aiError, setAiError] = useState<string | null>(null);

  // 版本历史
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // 编辑状态
  const [editedContent, setEditedContent] = useState<Record<string, unknown>>({});

  // 撤销/重做功能
  const {
    value: historyContent,
    setValue: setHistoryContent,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  } = useResumeHistory<Record<string, unknown>>({
    initialValue: {},
    onChange: (value) => {
      setEditedContent(value);
    },
  });

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, undo, redo]);

  // 样式预设（默认使用高管双栏布局）
  const [selectedPresetId, setSelectedPresetId] = useState(resume?.templateId || 'executive');

  // AI 工具状态
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);

  const [showKeywords, setShowKeywords] = useState(false);

  // 画布编辑器对话框
  const [jobKeywords, setJobKeywords] = useState<JobKeywordExtraction | null>(null);
  const [skillMatch, setSkillMatch] = useState<SkillMatchResult | null>(null);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);

  const [polishDialog, setPolishDialog] = useState<{
    isOpen: boolean;
    sectionType: string;
    content: string;
  } | null>(null);

  // 将 API 返回的内容转换为 ResumeContent 格式
  // 编辑模式下使用 editedContent，预览模式下使用 resume.content
  const resumeContent = useMemo((): ResumeContent | null => {
    // 编辑模式下优先使用 editedContent（实时更新）
    const sourceContent = isEditing && Object.keys(editedContent).length > 0
      ? editedContent
      : resume?.content as Record<string, unknown> | undefined;

    if (!sourceContent) return null;
    const content = sourceContent;

    // 处理 summary - 可能是对象或字符串
    let summaryText: string | undefined;
    if (typeof content.summary === 'string') {
      summaryText = content.summary;
    } else if (content.summary && typeof content.summary === 'object') {
      summaryText = (content.summary as Record<string, unknown>).text as string | undefined;
    }

    // 处理 skills - 可能是对象 { list: [...], _source, _basedOn } 或数组
    let skillsList: string[] = [];
    if (Array.isArray(content.skills)) {
      skillsList = content.skills as string[];
    } else if (content.skills && typeof content.skills === 'object') {
      const skillsObj = content.skills as Record<string, unknown>;
      skillsList = (skillsObj.list as string[]) || [];
    }

    // 处理 experience - 可能是对象 { list: [...], _source, _basedOn } 或数组
    let experienceList: ResumeContent['experience'] = [];
    if (Array.isArray(content.experience)) {
      experienceList = content.experience as ResumeContent['experience'];
    } else if (content.experience && typeof content.experience === 'object') {
      const expObj = content.experience as Record<string, unknown>;
      experienceList = (expObj.list as ResumeContent['experience']) || [];
    }

    // 处理 projects - 可能是对象 { list: [...], _source, _basedOn } 或数组
    let projectsList: ResumeContent['projects'] = undefined;
    if (Array.isArray(content.projects)) {
      projectsList = content.projects as ResumeContent['projects'];
    } else if (content.projects && typeof content.projects === 'object') {
      const projObj = content.projects as Record<string, unknown>;
      if (Array.isArray(projObj.list)) {
        projectsList = projObj.list as ResumeContent['projects'];
      }
    }

    // 处理 education - 可能是对象 { list: [...], _source, _basedOn } 或数组
    let educationList: ResumeContent['education'] = [];
    if (Array.isArray(content.education)) {
      educationList = content.education as ResumeContent['education'];
    } else if (content.education && typeof content.education === 'object') {
      const eduObj = content.education as Record<string, unknown>;
      educationList = (eduObj.list as ResumeContent['education']) || [];
    }

    return {
      name: (content.name as string) || resume?.name || '未命名',
      title: content.title as string | undefined,
      contact: content.contact as ResumeContent['contact'],
      summary: summaryText,
      experience: experienceList,
      skills: skillsList,
      matchedSkills: content.matchedSkills as string[] | undefined,
      projects: projectsList,
      education: educationList,
      _meta: content._meta as ResumeContent['_meta'],
    };
  }, [resume, isEditing, editedContent]);

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

  // 处理画布编辑器变化
  const handleCanvasEditorChange = useCallback((snapshot: unknown) => {
    // 可以在这里实现将 tldraw 快照转换回简历内容
    console.log('Canvas editor changed:', snapshot);
  }, []);

  const loadResume = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resumesApi.getById(resumeId);
      setResume(data);
      const content = (data.content as Record<string, unknown>) || {};
      setEditedContent(content);
      // 同步样式预设 ID
      if (data.templateId) {
        setSelectedPresetId(data.templateId);
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

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu')) {
        setShowExportMenu(false);
        setShowAiMenu(false);
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  // 处理画布内容变化（支持撤销/重做）
  const handleCanvasContentChange = useCallback((newContent: ResumeContent) => {
    setHistoryContent(newContent as unknown as Record<string, unknown>);
  }, [setHistoryContent]);

  // 进入编辑模式
  const handleEnterEditMode = useCallback(() => {
    if (!resume?.content) return;
    const content = (resume.content as Record<string, unknown>) || {};
    setEditedContent(content);
    clearHistory();
    setIsEditing(true);
  }, [resume, clearHistory]);

  // 退出编辑模式
  const handleExitEditMode = useCallback(() => {
    setIsEditing(false);
    // 重置编辑内容
    if (resume?.content) {
      setEditedContent((resume.content as Record<string, unknown>) || {});
      clearHistory();
    }
  }, [resume, clearHistory]);

  const handleGenerate = async () => {
    if (!resume) return;
    setIsGenerating(true);
    setAiError(null); // 清除之前的错误

    try {
      // 更新状态为生成中
      await resumesApi.update(resume.id, { status: 'generating' });
      setResume({ ...resume, status: 'generating' });

      // 调用 AI 生成服务
      const result = await resumesApi.generate(resume.id);

      if (!result.success) {
        throw new Error(result.error || '简历生成失败');
      }

      // 更新简历内容
      const updatedResume = await resumesApi.getById(resume.id);
      const newContent = (updatedResume.content as Record<string, unknown>) || {};
      setResume(updatedResume);
      setEditedContent(newContent);

      // 显示匹配分析结果（如果有）
      if (result.matchAnalysis) {
        toast({
          title: '生成完成',
          description: `简历已生成，与岗位匹配度 ${result.matchAnalysis.score}%`,
        });
      } else {
        toast({
          title: '生成完成',
          description: '简历已根据岗位信息生成',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '简历生成失败，请稍后重试';
      setAiError(errorMessage);
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
    if (!resume || !resumeContent) return;
    setIsExporting(true);
    try {
      // 调用后端 API 导出 PDF
      await resumesApi.exportPdf(resume.id);

      toast({
        title: '导出成功',
        description: '简历已导出为 PDF 文件',
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
        const err = error as Error;
        toast({ title: '导出失败', description: err.message || '请稀后重试', variant: 'destructive' });
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

  const handleLoadVersionHistory = async () => {
    if (!resume) return;
    setIsLoadingVersions(true);
    try {
      const versionHistory = await resumesApi.getVersionHistory(resume.id);
      setVersions(versionHistory);
      setShowVersionHistory(true);
    } catch (error) {
      toast({ title: '加载失败', description: '无法加载版本历史', variant: 'destructive' });
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!resume) return;
    if (!confirm('确定要恢复到此版本吗？当前内容将被保存为新版本。')) return;

    setIsRestoringVersion(true);
    try {
      const updatedResume = await resumesApi.restoreVersion(resume.id, versionId);
      const newContent = (updatedResume.content as Record<string, unknown>) || {};
      setResume(updatedResume);
      setEditedContent(newContent);
      setShowVersionHistory(false);
      toast({ title: '恢复成功', description: '已恢复到历史版本' });
      // 重新加载版本历史
      handleLoadVersionHistory();
    } catch (error) {
      toast({ title: '恢复失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsRestoringVersion(false);
    }
  };

  // AI 工具处理函数
  const handleGetSuggestions = async () => {
    if (!resume) return;
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const result = await resumesApi.getSuggestions(resume.id);
      setSuggestions(result.suggestions);
    } catch (error) {
      toast({ title: '获取建议失败', description: '请稍后重试', variant: 'destructive' });
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleApplySuggestion = async (suggestion: ResumeSuggestion) => {
    if (!resume) return;
    setApplyingSuggestionId(suggestion.id);
    try {
      // 根据建议路径更新内容
      const newContent = JSON.parse(JSON.stringify(editedContent)) as Record<string, unknown>;
      const pathParts = suggestion.sectionPath.split('.');

      let current: unknown = newContent;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (current === null || current === undefined) break;

        if (Array.isArray(current)) {
          const index = parseInt(part);
          if (!isNaN(index) && index >= 0 && index < current.length) {
            current = current[index];
          }
        } else if (typeof current === 'object') {
          current = (current as Record<string, unknown>)[part];
        }
      }

      const lastPart = pathParts[pathParts.length - 1];
      if (current !== null && current !== undefined) {
        if (Array.isArray(current)) {
          const index = parseInt(lastPart);
          if (!isNaN(index)) {
            current[index] = suggestion.suggestion;
          }
        } else if (typeof current === 'object') {
          (current as Record<string, unknown>)[lastPart] = suggestion.suggestion;
        }
      }

      setEditedContent(newContent);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      toast({ title: '已应用建议', description: '简历内容已更新' });
    } catch (error) {
      toast({ title: '应用失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setApplyingSuggestionId(null);
    }
  };

  const handleApplyAllSuggestions = async () => {
    for (const suggestion of suggestions) {
      await handleApplySuggestion(suggestion);
    }
  };

  const handleGetJobKeywords = async () => {
    if (!resume) return;
    setIsLoadingKeywords(true);
    setShowKeywords(true);
    try {
      const result = await resumesApi.getJobKeywords(resume.id);
      setJobKeywords(result.keywords);
      setSkillMatch(result.skillMatch);
    } catch (error) {
      toast({ title: '获取关键词失败', description: '请确保简历已关联岗位', variant: 'destructive' });
      setShowKeywords(false);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  const handleAddSkill = (skill: string) => {
    const newContent = JSON.parse(JSON.stringify(editedContent)) as Record<string, unknown>;
    let skillsList: string[] = [];

    if (Array.isArray(newContent.skills)) {
      skillsList = newContent.skills as string[];
    } else if (newContent.skills && typeof newContent.skills === 'object') {
      const skillsObj = newContent.skills as Record<string, unknown>;
      skillsList = (skillsObj.list as string[]) || [];
    }

    if (!skillsList.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      skillsList.push(skill);

      if (Array.isArray(newContent.skills)) {
        newContent.skills = skillsList;
      } else if (newContent.skills && typeof newContent.skills === 'object') {
        (newContent.skills as Record<string, unknown>).list = skillsList;
      }

      setEditedContent(newContent);
      toast({ title: '已添加技能', description: skill });
    }
  };

  const handlePolishSection = (sectionType: string, content: string) => {
    setPolishDialog({
      isOpen: true,
      sectionType,
      content,
    });
  };

  const handleApplyPolish = (optimized: string) => {
    if (!polishDialog) return;

    const newContent = JSON.parse(JSON.stringify(editedContent)) as Record<string, unknown>;
    const pathParts = polishDialog.sectionType.split('.');

    // 简单路径处理
    if (pathParts.length === 1) {
      const field = pathParts[0];
      if (field === 'summary') {
        if (typeof newContent.summary === 'string') {
          newContent.summary = optimized;
        } else if (newContent.summary && typeof newContent.summary === 'object') {
          (newContent.summary as Record<string, unknown>).text = optimized;
        }
      }
    }

    setEditedContent(newContent);
    toast({ title: '已应用优化', description: '简历内容已更新' });
  };

  // 获取简历技能列表
  const resumeSkills = useMemo(() => {
    const skillsData = editedContent?.skills;
    if (Array.isArray(skillsData)) {
      return skillsData as string[];
    } else if (skillsData && typeof skillsData === 'object') {
      return (skillsData as Record<string, unknown>).list as string[] || [];
    }
    return [];
  }, [editedContent]);

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
      <div className="flex flex-col h-full">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-4">
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
        </div>

        {/* 操作区 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* 左侧：状态信息 */}
            <div className="flex items-center gap-3">
              {resume.status === 'completed' && resume.matchScore && (
                <button
                  onClick={handleAnalyzeMatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition cursor-pointer"
                >
                  <Star className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700 text-sm">
                    {Math.round(resume.matchScore * 100)}% 匹配
                  </span>
                </button>
              )}
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
              {/* 自动保存状态 */}
              {isEditing && (
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
              )}
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 草稿/生成中/失败状态 */}
              {resume.status !== 'completed' && (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  size="sm"
                >
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

              {/* 完成状态 */}
              {resume.status === 'completed' && (
                <>
                  {/* 主操作：编辑/完成 */}
                  <Button
                    variant={isEditing ? 'default' : 'outline'}
                    size="sm"
                    onClick={isEditing ? handleExitEditMode : handleEnterEditMode}
                  >
                    {isEditing ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        完成编辑
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4 mr-1.5" />
                        编辑
                      </>
                    )}
                  </Button>

                  {/* 导出按钮 */}
                  <div className="relative dropdown-menu">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowExportMenu(!showExportMenu);
                        setShowAiMenu(false);
                        setShowMoreMenu(false);
                      }}
                      disabled={isExporting || isExportingWord}
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
                          disabled={isExporting}
                        >
                          <FileText className="w-4 h-4" />
                          导出 PDF
                        </button>
                        <button
                          onClick={() => {
                            handleExportWord();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={isExportingWord}
                        >
                          <FileDown className="w-4 h-4" />
                          导出 Word
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI 功能下拉 */}
                  <div className="relative dropdown-menu">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAiMenu(!showAiMenu);
                        setShowExportMenu(false);
                        setShowMoreMenu(false);
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      AI 工具
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    {showAiMenu && (
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                        <button
                          onClick={() => {
                            handleGetSuggestions();
                            setShowAiMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={isLoadingSuggestions}
                        >
                          <Lightbulb className="w-4 h-4" />
                          优化建议
                        </button>
                        {resume.jobId && (
                          <button
                            onClick={() => {
                              handleGetJobKeywords();
                              setShowAiMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            disabled={isLoadingKeywords}
                          >
                            <Key className="w-4 h-4" />
                            岗位关键词
                          </button>
                        )}
                        {resume.jobId && (
                          <button
                            onClick={() => {
                              handleAnalyzeMatch();
                              setShowAiMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            disabled={isAnalyzing}
                          >
                            <Target className="w-4 h-4" />
                            匹配分析
                          </button>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => {
                            handleGenerate();
                            setShowAiMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={isGenerating}
                        >
                          <RefreshCw className="w-4 h-4" />
                          重新生成
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 更多操作下拉 */}
                  <div className="relative dropdown-menu">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(!showMoreMenu);
                        setShowExportMenu(false);
                        setShowAiMenu(false);
                      }}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                        <button
                          onClick={() => {
                            handleLoadVersionHistory();
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={isLoadingVersions}
                        >
                          <History className="w-4 h-4" />
                          版本历史
                        </button>
                        <button
                          onClick={() => {
                            handleDuplicate();
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          复制简历
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除简历
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

        {/* 主内容区域 - 左右分屏 */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* 左侧：样式预设选择器 + AI 润色 */}
          {resume.status === 'completed' && (
            <div className="w-64 flex-shrink-0 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-6">
              {/* 样式预设 */}
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  样式预设
                </h2>
                <div className="space-y-2">
                  {[
                    { id: 'modern', name: '现代蓝色', desc: '左侧边栏布局' },
                    { id: 'classic', name: '经典黑白', desc: '左侧边栏布局' },
                    { id: 'creative', name: '创意紫色', desc: '顶部横幅布局' },
                    { id: 'minimal', name: '极简纯净', desc: '单栏无装饰' },
                    { id: 'executive', name: '高管专业', desc: '双栏布局' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={async () => {
                        setSelectedPresetId(preset.id);
                        if (resume) {
                          try {
                            await resumesApi.update(resume.id, { templateId: preset.id });
                            setResume({ ...resume, templateId: preset.id });
                          } catch {
                            toast({ title: '保存失败', variant: 'destructive' });
                          }
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedPresetId === preset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{preset.name}</div>
                      <p className="text-xs text-gray-500">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI 润色区块 */}
              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI 润色
                </h2>
                <p className="text-xs text-gray-500 mb-3">选择要优化的区块，AI 将帮您润色内容</p>
                <div className="space-y-2">
                  {/* 个人简介润色 */}
                  {(() => {
                    const summaryContent = (() => {
                      const summary = editedContent?.summary;
                      if (typeof summary === 'string') return summary;
                      if (summary && typeof summary === 'object') {
                        return (summary as Record<string, unknown>)?.text as string || '';
                      }
                      return '';
                    })();
                    return summaryContent ? (
                      <button
                        onClick={() => handlePolishSection('summary', summaryContent)}
                        className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition text-sm"
                      >
                        <span className="text-gray-700">个人简介</span>
                      </button>
                    ) : null;
                  })()}

                  {/* 工作经历润色 */}
                  {(() => {
                    const expList = (() => {
                      const exp = editedContent?.experience;
                      if (Array.isArray(exp)) return exp;
                      if (exp && typeof exp === 'object') {
                        return (exp as Record<string, unknown>)?.list as Array<Record<string, unknown>> || [];
                      }
                      return [];
                    })();
                    return expList.map((exp, index) => {
                      const highlights = (exp.highlights as string[]) || [];
                      const content = `${exp.company || ''} - ${exp.position || ''}\n${highlights.join('\n')}`;
                      return (
                        <button
                          key={index}
                          onClick={() => handlePolishSection(`experience.${index}`, content)}
                          className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition text-sm"
                        >
                          <span className="text-gray-700">{exp.position || `工作经历 ${index + 1}`}</span>
                          <span className="text-xs text-gray-400 ml-1">({exp.company})</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* 右侧：简历编辑/预览 */}
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
            ) : resume.status === 'failed' ? (
              <div className="p-8">
                <AIErrorState
                  error={aiError || '简历生成失败，请稀后重试'}
                  onRetry={handleGenerate}
                  isRetrying={isGenerating}
                />
              </div>
            ) : resume.status === 'generating' ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">正在生成简历...</h3>
                <p className="text-gray-500">AI 正在分析岗位要求并为您定制简历内容</p>
              </div>
            ) : resumeContent ? (
              /* Tldraw 画布：无限画布，自带缩放和编辑功能 */
              <div className="h-full">
                <TldrawResumeEditor
                  resumeContent={resumeContent}
                  theme={(selectedPresetId as ColorTheme) || 'modern'}
                  readOnly={!isEditing}
                  showMarginGuides={isEditing}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                暂无简历内容
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 版本历史弹窗 */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                版本历史
              </h2>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {versions.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无版本历史</p>
                <p className="text-sm text-gray-400 mt-1">编辑并保存简历后会自动创建版本</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          版本 {version.version}
                          {version.changeNote && (
                            <span className="text-sm text-gray-500 ml-2">
                              · {version.changeNote}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(version.createdAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(version.id)}
                        disabled={isRestoringVersion}
                      >
                        {isRestoringVersion ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3 mr-1" />
                        )}
                        恢复
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI 优化建议面板 */}
      {showSuggestions && (
        <SuggestionsPanel
          suggestions={suggestions}
          onApply={handleApplySuggestion}
          onApplyAll={handleApplyAllSuggestions}
          onClose={() => setShowSuggestions(false)}
          isLoading={isLoadingSuggestions}
          applyingId={applyingSuggestionId}
        />
      )}

      {/* 岗位关键词面板 */}
      {showKeywords && (
        <JobKeywordsPanel
          keywords={jobKeywords}
          skillMatch={skillMatch}
          resumeSkills={resumeSkills}
          onClose={() => setShowKeywords(false)}
          isLoading={isLoadingKeywords}
          onAddSkill={handleAddSkill}
        />
      )}

      {/* 区块润色对话框 */}
      {polishDialog && (
        <SectionPolishDialog
          isOpen={polishDialog.isOpen}
          onClose={() => setPolishDialog(null)}
          sectionType={polishDialog.sectionType}
          originalContent={polishDialog.content}
          onApply={handleApplyPolish}
          resumeId={resume.id}
        />
      )}
    </DashboardLayout>
  );
}
