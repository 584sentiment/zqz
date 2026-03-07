/**
 * AI 驱动的简历编辑页面
 * 集成 tldraw 画布编辑器和 AI 对话面板
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AIChatPanel } from '@/components/resume-canvas/ai-chat/AIChatPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { resumesApi, Resume } from '@/lib/api/resumes';
import { ResumeCanvasAgent, AgentAction } from '@ai-job-assistant/ai';
import type { TldrawResumeEditorRef } from '@/components/resume-canvas';
import {
  ArrowLeft,
  Download,
  Save,
  Wand2,
  Sparkles,
  Loader2,
  Settings,
  Undo,
  Redo,
} from 'lucide-react';

// 动态导入 tldraw 编辑器
const TldrawResumeEditor = dynamic(
  () => import('@/components/resume-canvas').then((mod) => mod.TldrawResumeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <div className="text-gray-500">加载编辑器...</div>
        </div>
      </div>
    ),
  }
);

export default function AIResumeEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const resumeId = params.id as string;

  // 状态
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resumeContent, setResumeContent] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 编辑器引用
  const editorRef = useRef<TldrawResumeEditorRef>(null);

  // 加载简历数据
  useEffect(() => {
    loadResume();
  }, [resumeId]);

  const loadResume = async () => {
    try {
      setIsLoading(true);
      const data = await resumesApi.getById(resumeId);
      setResume(data);
      setResumeContent(data.content);
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error.message || '无法加载简历数据',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // AI 生成简历
  const handleGenerate = async () => {
    if (!resume?.jobId) {
      toast({
        title: '无法生成',
        description: '请先关联目标岗位',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/resume/${resumeId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: resume.jobId,
          template: resume.template || 'modern',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResumeContent(data.data);
        setHasUnsavedChanges(true);
        toast({
          title: '生成成功',
          description: 'AI 已生成新的简历内容',
        });
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error: any) {
      toast({
        title: '生成失败',
        description: error.message || 'AI 生成简历时出错',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存简历
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await resumesApi.update(resumeId, {
        content: resumeContent,
      });
      setHasUnsavedChanges(false);
      toast({
        title: '保存成功',
        description: '简历已保存',
      });
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.message || '保存简历时出错',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 导出 PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const blob = await editorRef.current?.exportToPDF();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resume?.title || 'resume'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: '导出成功',
          description: '简历已导出为 PDF',
        });
      }
    } catch (error: any) {
      toast({
        title: '导出失败',
        description: error.message || '导出 PDF 时出错',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 获取画布形状
  const getShapes = useCallback(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return [];
    return editor.getCurrentPageShapes();
  }, []);

  // 获取画布截图
  const toImage = useCallback(async () => {
    const editor = editorRef.current?.getEditor();
    if (!editor) throw new Error('编辑器未就绪');

    const { blob } = await editor.toImage(editor.getCurrentPageShapes(), {
      format: 'png',
    });
    return blob;
  }, []);

  // 获取视口信息
  const getViewport = useCallback(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return { x: 0, y: 0, z: 1 };

    const camera = editor.getCamera();
    return {
      x: camera.x,
      y: camera.y,
      z: camera.z,
    };
  }, []);

  // 执行 AI 操作
  const executeActions = useCallback(async (actions: AgentAction[]) => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    editor.batch(() => {
      for (const action of actions) {
        try {
          switch (action.type) {
            case 'create':
              if (action.shape) {
                editor.createShapes([action.shape]);
              }
              break;

            case 'update':
              if (action.shapeId && action.shape) {
                editor.updateShape({
                  id: action.shapeId,
                  ...action.shape,
                });
              }
              break;

            case 'delete':
              if (action.shapeId) {
                editor.deleteShape(action.shapeId);
              }
              break;

            case 'move':
              if (action.shapeId && action.x !== undefined && action.y !== undefined) {
                const shape = editor.getShape(action.shapeId);
                if (shape) {
                  editor.updateShape({
                    id: action.shapeId,
                    x: action.x,
                    y: action.y,
                  });
                }
              }
              break;

            case 'resize':
              if (action.shapeId && action.width !== undefined && action.height !== undefined) {
                const shape = editor.getShape(action.shapeId);
                if (shape) {
                  editor.updateShape({
                    id: action.shapeId,
                    props: {
                      ...shape.props,
                      w: action.width,
                      h: action.height,
                    },
                  });
                }
              }
              break;

            case 'batch':
              if (action.actions) {
                // 递归执行批量操作
                executeActions(action.actions);
              }
              break;
          }
        } catch (error) {
          console.error('[AI Edit] 执行操作失败:', action, error);
        }
      }
    });

    setHasUnsavedChanges(true);
  }, []);

  // 内容变化回调
  const handleContentChange = useCallback((snapshot: string) => {
    setHasUnsavedChanges(true);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <div className="text-gray-500">加载中...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col">
        {/* 顶部工具栏 */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/resumes/${resumeId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{resume?.title || 'AI 编辑器'}</h1>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  未保存
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  AI 生成
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  导出 PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 画布编辑器 */}
          <div className="flex-1">
            <TldrawResumeEditor
              ref={editorRef}
              resumeContent={resumeContent}
              onChange={handleContentChange}
              theme="modern"
              showMarginGuides={false}
            />
          </div>

          {/* AI 对话面板 */}
          <div className="w-96">
            <AIChatPanel
              resumeId={resumeId}
              getShapes={getShapes}
              toImage={toImage}
              getViewport={getViewport}
              executeActions={executeActions}
              onConversationUpdate={(messages) => {
                console.log('[AI Edit] 对话更新:', messages);
              }}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
