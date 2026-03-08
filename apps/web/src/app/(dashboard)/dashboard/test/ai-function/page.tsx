/**
 * AI 功能测试页面
 * 用于测试 AI 代理和对话功能
 */

'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AIChatPanel } from '@/components/resume-canvas/ai-chat/AIChatPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ResumeCanvasAgent, AgentAction } from '@ai-job-assistant/ai';
import { Loader2, Play, CheckCircle, XCircle } from 'lucide-react';

// 动态导入 tldraw
const Tldraw = dynamic(() => import('tldraw').then((mod) => mod.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  ),
});

export default function AIFunctionTestPage() {
  const [testResults, setTestResults] = useState<
    Array<{
      name: string;
      status: 'pending' | 'running' | 'success' | 'error';
      message?: string;
    }>
  >([
    { name: 'AI 代理初始化', status: 'pending' },
    { name: '感知画布状态', status: 'pending' },
    { name: '理解用户意图', status: 'pending' },
    { name: '执行 AI 操作', status: 'pending' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef<any>(null);
  const agentRef = useRef<ResumeCanvasAgent | null>(null);

  // 运行测试
  const runTests = async () => {
    setIsRunning(true);
    const results = [...testResults];

    try {
      // 测试 1: AI 代理初始化
      results[0].status = 'running';
      setTestResults([...results]);

      await new Promise((resolve) => setTimeout(resolve, 500));
      agentRef.current = new ResumeCanvasAgent();

      results[0].status = 'success';
      results[0].message = 'AI 代理初始化成功';
      setTestResults([...results]);

      // 测试 2: 感知画布状态
      results[1].status = 'running';
      setTestResults([...results]);

      const perception = await agentRef.current.perceive({
        getShapes: () => [],
        getViewport: () => ({ x: 0, y: 0, z: 1 }),
      });

      results[1].status = 'success';
      results[1].message = `感知成功: ${perception.shapes.length} 个形状`;
      setTestResults([...results]);

      // 测试 3: 理解用户意图
      results[2].status = 'running';
      setTestResults([...results]);

      const plan = await agentRef.current.understand(
        '请创建一个文本形状，内容为"测试"',
        perception
      );

      results[2].status = 'success';
      results[2].message = `理解成功: ${plan.actions.length} 个操作`;
      setTestResults([...results]);

      // 测试 4: 执行 AI 操作
      results[3].status = 'running';
      setTestResults([...results]);

      let executedCount = 0;
      await agentRef.current.execute(plan.actions, async (action) => {
        console.log('[Test] 执行操作:', action);
        executedCount++;
      });

      results[3].status = 'success';
      results[3].message = `执行成功: ${executedCount} 个操作`;
      setTestResults([...results]);
    } catch (error: any) {
      // 找到第一个 pending 或 running 的测试，标记为错误
      const errorIndex = results.findIndex((r) => r.status === 'pending' || r.status === 'running');
      if (errorIndex !== -1) {
        results[errorIndex].status = 'error';
        results[errorIndex].message = error.message;
        setTestResults([...results]);
      }
    } finally {
      setIsRunning(false);
    }
  };

  // 获取画布形状
  const getShapes = () => {
    if (!editorRef.current) return [];
    return editorRef.current.getCurrentPageShapes();
  };

  // 执行 AI 操作
  const executeActions = async (actions: AgentAction[]) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
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
              if (action.shape) {
                editor.updateShapes([action.shape]);
              }
              break;
            case 'delete':
              if (action.shapeId) {
                editor.deleteShapes([action.shapeId]);
              }
              break;
            case 'move':
              if (action.shapeId && action.x !== undefined && action.y !== undefined) {
                editor.updateShape({
                  id: action.shapeId,
                  x: action.x,
                  y: action.y,
                });
              }
              break;
          }
        } catch (error) {
          console.error('[AI Edit] 执行操作失败:', action, error);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI 功能测试</h1>
          <p className="text-gray-600">测试 AI 代理和对话功能</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 测试面板 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>测试套件</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                    {result.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full bg-gray-300" />
                    )}
                    {result.status === 'running' && (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    )}
                    {result.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {result.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                    <div className="flex-1">
                      <div className="font-medium">{result.name}</div>
                      {result.message && (
                        <div className="text-sm text-gray-600 mt-1">{result.message}</div>
                      )}
                    </div>
                  </div>
                ))}

                <Separator />

                <Button onClick={runTests} disabled={isRunning} className="w-full">
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      运行中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      运行测试
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 画布编辑器 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>tldraw 画布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <div ref={editorRef} className="w-full h-full">
                  <Tldraw
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI 对话面板测试 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>AI 对话测试</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] border rounded-lg overflow-hidden">
              <AIChatPanel
                resumeId="test-resume"
                getShapes={getShapes}
                executeActions={executeActions}
                onConversationUpdate={(messages) => {
                  console.log('[AI Chat] 对话更新:', messages);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>1. 运行测试套件</strong>
                <br />
                点击"运行测试"按钮，验证 AI 代理的核心功能是否正常工作。
              </p>
              <p>
                <strong>2. 测试 AI 对话</strong>
                <br />
                在下方对话面板中输入指令，例如："请创建一个文本形状，内容为'Hello World'"
              </p>
              <p>
                <strong>3. 验证结果</strong>
                <br />
                观察 tldraw 画布是否按预期创建或修改了形状。
              </p>
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="font-medium text-blue-900 mb-2">测试示例指令:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>创建一个文本形状</li>
                  <li>把所有形状向上移动 50px</li>
                  <li>删除选中的形状</li>
                  <li>调整形状大小为 200x100</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
