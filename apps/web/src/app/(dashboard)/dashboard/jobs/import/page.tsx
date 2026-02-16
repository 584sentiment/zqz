'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { jobsApi, ParsedJobResult } from '@/lib/api/jobs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Link2,
  ImageIcon,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  Check,
  Star,
  Tag,
  Bookmark,
  FilePlus,
  Loader2,
  FileSearch,
  Brain,
  Target,
  Upload,
  X,
} from 'lucide-react';

type ImportTab = 'text' | 'link' | 'image';

interface ParsingProgress {
  stage: string;
  progress: number;
  message: string;
}

const PARSING_STAGES: ParsingProgress[] = [
  { stage: 'analyzing', progress: 0, message: '正在分析文本...' },
  { stage: 'extracting', progress: 25, message: '提取职位基本信息...' },
  { stage: 'requirements', progress: 50, message: '识别岗位要求...' },
  { stage: 'skills', progress: 75, message: '分析技能关键词...' },
  { stage: 'finalizing', progress: 90, message: '生成分析报告...' },
];

const IMAGE_STAGES: ParsingProgress[] = [
  { stage: 'uploading', progress: 0, message: '正在上传图片...' },
  { stage: 'recognizing', progress: 30, message: 'OCR 识别中...' },
  { stage: 'extracting', progress: 60, message: '提取职位信息...' },
  { stage: 'finalizing', progress: 90, message: '生成结果...' },
];

export default function JobImportPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ImportTab>('text');
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedJobResult | null>(null);
  const [clearFormat, setClearFormat] = useState(true);
  const [parsingProgress, setParsingProgress] = useState<ParsingProgress | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleParse = async () => {
    if (!jobText.trim()) {
      toast({
        title: '请输入职位描述',
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);
    setParsedResult(null);
    setParsingProgress(PARSING_STAGES[0]);

    // 模拟进度更新
    let stageIndex = 0;
    progressIntervalRef.current = setInterval(() => {
      stageIndex++;
      if (stageIndex < PARSING_STAGES.length) {
        setParsingProgress(PARSING_STAGES[stageIndex]);
      }
    }, 800); // 每 800ms 更新一次进度

    try {
      const result = await jobsApi.parseText(jobText);

      // 清除进度定时器并设置为完成
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setParsingProgress({ stage: 'complete', progress: 100, message: '解析完成!' });

      // 短暂延迟后显示结果
      setTimeout(() => {
        setParsedResult(result);
        setParsingProgress(null);
        toast({
          title: '解析成功',
          description: `置信度: ${Math.round(result.confidence * 100)}%`,
        });
      }, 500);
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setParsingProgress(null);
      toast({
        title: '解析失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!parsedResult) return;

    setIsSaving(true);
    try {
      const sourceText = activeTab === 'link' ? `来源: ${jobUrl}\n\n${jobText}` : jobText;
      await jobsApi.importJob(sourceText, parsedResult as unknown as Record<string, unknown>);
      toast({
        title: '保存成功',
        description: '岗位已添加到您的列表',
      });
      router.push('/dashboard/jobs');
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

  const handleParseUrl = async () => {
    if (!jobUrl.trim()) {
      toast({
        title: '请输入链接',
        variant: 'destructive',
      });
      return;
    }

    // 验证 URL 格式
    try {
      new URL(jobUrl);
    } catch {
      toast({
        title: '请输入有效的链接',
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);
    setParsedResult(null);
    setJobText('');
    setParsingProgress({ stage: 'fetching', progress: 0, message: '正在获取页面内容...' });

    const stages = [
      { stage: 'fetching', progress: 20, message: '正在获取页面内容...' },
      { stage: 'extracting', progress: 40, message: '提取职位信息...' },
      { stage: 'analyzing', progress: 60, message: '智能分析中...' },
      { stage: 'finalizing', progress: 80, message: '生成结果...' },
    ];

    let stageIndex = 0;
    progressIntervalRef.current = setInterval(() => {
      stageIndex++;
      if (stageIndex < stages.length) {
        setParsingProgress(stages[stageIndex]);
      }
    }, 1000);

    try {
      const result = await jobsApi.parseUrl(jobUrl);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setParsingProgress({ stage: 'complete', progress: 100, message: '解析完成!' });

      setTimeout(() => {
        setParsedResult(result);
        setJobText(`来源: ${jobUrl}`);
        setParsingProgress(null);
        toast({
          title: '解析成功',
          description: `置信度: ${Math.round(result.confidence * 100)}%`,
        });
      }, 500);
    } catch (error: unknown) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setParsingProgress(null);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '解析失败，请检查链接是否正确';
      toast({
        title: '解析失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const tabs: { id: ImportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'text', label: '文本导入', icon: <FileText className="w-4 h-4" /> },
    { id: 'link', label: '链接导入', icon: <Link2 className="w-4 h-4" /> },
    { id: 'image', label: '图片导入', icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左侧：输入区域 */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">导入职位</h2>
              <p className="text-sm text-gray-500">选择您想要添加职位详情的方式。</p>
            </div>

            {/* 标签页 */}
            <div className="flex border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'text' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      职位描述
                    </label>
                    <div className="relative">
                      <textarea
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        className="block w-full h-64 p-3 border border-gray-200 rounded-lg leading-relaxed bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none"
                        placeholder="请在此粘贴职位描述文本..."
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                        {jobText.length}/5000
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-white shadow-sm border border-gray-200 text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900">清除格式</span>
                        <span className="block text-xs text-gray-500">移除多余空格和样式</span>
                      </div>
                    </div>
                    <div
                      className={`relative inline-flex items-center cursor-pointer w-9 h-5 rounded-full transition-colors ${
                        clearFormat ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      onClick={() => setClearFormat(!clearFormat)}
                    >
                      <div
                        className={`absolute w-4 h-4 bg-white rounded-full transition-transform ${
                          clearFormat ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </label>

                  <Button
                    onClick={handleParse}
                    disabled={isParsing || !jobText.trim()}
                    className="w-full py-3 shadow-lg shadow-primary/20"
                  >
                    {isParsing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    开始智能分析
                  </Button>
                </div>
              )}

              {activeTab === 'link' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      职位链接
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        placeholder="https://jobs.example.com/position/12345"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      支持各大招聘网站的职位详情页面链接
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">支持的网站</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Boss直聘', '拉勾网', '猎聘', '智联招聘', '前程无忧', 'LinkedIn'].map(
                        (site) => (
                          <span
                            key={site}
                            className="px-2 py-1 bg-white text-blue-700 text-xs rounded border border-blue-200"
                          >
                            {site}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleParseUrl}
                    disabled={isParsing || !jobUrl.trim()}
                    className="w-full py-3 shadow-lg shadow-primary/20"
                  >
                    {isParsing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    抓取并解析
                  </Button>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      上传截图
                    </label>

                    {/* 图片预览 */}
                    {selectedImagePreview ? (
                      <div className="relative mb-4">
                        <img
                          src={selectedImagePreview}
                          alt="预览"
                          className="w-full h-48 object-contain rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setSelectedImagePreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-1">点击上传或拖拽图片到此处</p>
                        <p className="text-xs text-gray-400">支持 JPG、PNG 格式，最大 10MB</p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // 检查文件大小
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: '文件过大',
                            description: '图片大小不能超过 10MB',
                            variant: 'destructive',
                          });
                          return;
                        }

                        // 读取文件
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          setSelectedImagePreview(dataUrl);
                          // 提取 base64 部分
                          const base64 = dataUrl.split(',')[1];
                          setSelectedImage(base64);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">使用提示</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• 确保截图清晰，文字可辨认</li>
                      <li>• 尽量截取完整的职位信息</li>
                      <li>• 手机截图请确保方向正确</li>
                    </ul>
                  </div>

                  <Button
                    onClick={async () => {
                      if (!selectedImage) {
                        toast({
                          title: '请先上传图片',
                          variant: 'destructive',
                        });
                        return;
                      }

                      setIsParsing(true);
                      setParsedResult(null);
                      setJobText('');
                      setParsingProgress(IMAGE_STAGES[0]);

                      let stageIndex = 0;
                      progressIntervalRef.current = setInterval(() => {
                        stageIndex++;
                        if (stageIndex < IMAGE_STAGES.length) {
                          setParsingProgress(IMAGE_STAGES[stageIndex]);
                        }
                      }, 1500);

                      try {
                        const result = await jobsApi.parseImage(selectedImage);

                        if (progressIntervalRef.current) {
                          clearInterval(progressIntervalRef.current);
                        }
                        setParsingProgress({ stage: 'complete', progress: 100, message: '解析完成!' });

                        setTimeout(() => {
                          setParsedResult(result);
                          setJobText('来源: 图片上传');
                          setParsingProgress(null);
                          toast({
                            title: '解析成功',
                            description: `置信度: ${Math.round(result.confidence * 100)}%`,
                          });
                        }, 500);
                      } catch (error: unknown) {
                        if (progressIntervalRef.current) {
                          clearInterval(progressIntervalRef.current);
                        }
                        setParsingProgress(null);
                        const errorMessage =
                          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          '图片解析失败，请确保图片清晰';
                        toast({
                          title: '解析失败',
                          description: errorMessage,
                          variant: 'destructive',
                        });
                      } finally {
                        setIsParsing(false);
                      }
                    }}
                    disabled={isParsing || !selectedImage}
                    className="w-full py-3 shadow-lg shadow-primary/20"
                  >
                    {isParsing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    解析图片
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 提示卡片 */}
          <div className="mt-6 bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3 items-start">
            <div className="text-primary mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-primary mb-1">专业建议</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                粘贴完整的职位描述可获得最佳效果。无需担心页眉或页脚，我们的 AI
                会自动过滤无关信息。
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：解析结果 */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              解析结果
              {parsedResult && (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                  实时
                </span>
              )}
            </h2>
          </div>

          {parsedResult ? (
            <>
              {/* 职位信息卡片 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Briefcase className="w-24 h-24 text-primary" />
                </div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {parsedResult.title || '未识别职位名称'}
                      </h1>
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Briefcase className="w-4 h-4" />
                        {parsedResult.company || '未识别公司'}
                      </div>
                    </div>
                    {parsedResult.salary && (
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-2xl font-bold text-primary">{parsedResult.salary}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    {parsedResult.location && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded text-sm text-gray-600 border border-gray-100">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {parsedResult.location}
                      </div>
                    )}
                    {parsedResult.experience && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded text-sm text-gray-600 border border-gray-100">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        {parsedResult.experience}
                      </div>
                    )}
                    {parsedResult.education && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded text-sm text-gray-600 border border-gray-100">
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                        {parsedResult.education}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 核心要求 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                    <Check className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-gray-900">核心要求</h3>
                  </div>
                  <ul className="space-y-3">
                    {parsedResult.requirements.length > 0 ? (
                      parsedResult.requirements.slice(0, 5).map((req, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-gray-700">{req}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-400">暂未识别到具体要求</li>
                    )}
                  </ul>
                </div>

                {/* 加分项和技能 */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <Star className="w-5 h-5 text-orange-500" />
                      <h3 className="font-semibold text-gray-900">加分项</h3>
                    </div>
                    <ul className="space-y-3">
                      {parsedResult.niceToHave.length > 0 ? (
                        parsedResult.niceToHave.slice(0, 3).map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Star className="w-4 h-4 text-orange-400 mt-0.5" />
                            <span className="text-sm text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400">暂未识别</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4 pb-1">
                      <Tag className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-gray-900">技能关键词</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.skills.length > 0 ? (
                        parsedResult.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">暂未识别技能</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-gray-500">
                      分析置信度得分：
                      <strong className="text-gray-900">
                        {Math.round(parsedResult.confidence * 100)}%
                      </strong>
                    </span>
                  </div>
                  <div className="flex w-full md:w-auto gap-3">
                    <Button
                      variant="outline"
                      onClick={handleParse}
                      className="flex-1 md:flex-none"
                    >
                      重新解析
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 md:flex-none"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Bookmark className="w-4 h-4 mr-2" />
                      )}
                      保存岗位
                    </Button>
                    <Button className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                      <FilePlus className="w-4 h-4 mr-2" />
                      生成简历
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : parsingProgress ? (
            /* 解析进度显示 */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="max-w-md mx-auto">
                {/* 进度动画 */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="8"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${parsingProgress.progress * 3.52} 352`}
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      {parsingProgress.progress}%
                    </span>
                  </div>
                </div>

                {/* 当前阶段 */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
                    {parsingProgress.stage === 'analyzing' && <FileSearch className="w-4 h-4 text-primary" />}
                    {parsingProgress.stage === 'extracting' && <Briefcase className="w-4 h-4 text-primary" />}
                    {parsingProgress.stage === 'requirements' && <Target className="w-4 h-4 text-primary" />}
                    {parsingProgress.stage === 'skills' && <Brain className="w-4 h-4 text-primary" />}
                    {parsingProgress.stage === 'finalizing' && <Sparkles className="w-4 h-4 text-primary" />}
                    {parsingProgress.stage === 'complete' && <Check className="w-4 h-4 text-green-500" />}
                    <span className="text-sm font-medium text-primary">
                      {parsingProgress.message}
                    </span>
                  </div>
                </div>

                {/* 进度步骤 */}
                <div className="space-y-3">
                  {PARSING_STAGES.map((stage, index) => {
                    const isActive = parsingProgress.stage === stage.stage;
                    const isCompleted = PARSING_STAGES.findIndex(s => s.stage === parsingProgress.stage) > index;
                    const isPending = PARSING_STAGES.findIndex(s => s.stage === parsingProgress.stage) < index;

                    return (
                      <div
                        key={stage.stage}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive ? 'bg-primary/5 border border-primary/20' : ''
                        } ${isCompleted ? 'opacity-60' : ''} ${isPending ? 'opacity-40' : ''}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? 'bg-green-100 text-green-600'
                              : isActive
                              ? 'bg-primary/20 text-primary animate-pulse'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3 h-3" />
                          ) : isActive ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isActive ? 'text-primary font-medium' : 'text-gray-500'
                          }`}
                        >
                          {stage.message}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Sparkles className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">等待解析</h3>
              <p className="text-gray-500">粘贴职位描述并点击"开始智能分析"</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
