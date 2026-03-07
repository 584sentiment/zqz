/**
 * AI 对话面板组件
 * 用于与 AI 代理交互
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ResumeCanvasAgent, AgentPlan, AgentPerception } from '@ai-job-assistant/ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles, RotateCcw, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 对话消息
 */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** 操作预览 */
  actions?: any[];
}

/**
 * AI 对话面板 Props
 */
export interface AIChatPanelProps {
  /** 简历 ID */
  resumeId: string;
  /** 获取画布形状 */
  getShapes: () => any[];
  /** 获取画布截图 */
  toImage?: () => Promise<Blob>;
  /** 获取视口信息 */
  getViewport?: () => { x: number; y: number; z: number };
  /** 执行 AI 操作 */
  executeActions: (actions: any[]) => Promise<void>;
  /** 对话历史 */
  conversationHistory?: Message[];
  /** 对话更新回调 */
  onConversationUpdate?: (messages: Message[]) => void;
  /** 初始提示 */
  initialPrompt?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * AI 对话面板组件
 */
export function AIChatPanel({
  resumeId,
  getShapes,
  toImage,
  getViewport,
  executeActions,
  conversationHistory = [],
  onConversationUpdate,
  initialPrompt,
  className,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(conversationHistory);
  const [input, setInput] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化代理
  const agentRef = useRef<ResumeCanvasAgent | null>(null);
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new ResumeCanvasAgent();
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // 1. 感知画布状态
      const perception: AgentPerception = await agentRef.current!.perceive({
        getShapes,
        toImage,
        getViewport,
      });

      // 2. 理解用户意图并生成操作计划
      const plan: AgentPlan = await agentRef.current!.understand(input, perception);

      // 3. 执行操作
      if (plan.actions && plan.actions.length > 0) {
        await executeActions(plan.actions);
      }

      // 4. 添加 AI 回复
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: plan.response,
        timestamp: new Date(),
        actions: plan.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onConversationUpdate?.([...messages, userMessage, assistantMessage]);
    } catch (err: any) {
      console.error('[AI Chat] 对话失败:', err);
      setError(err.message || '处理请求时出现错误');

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，处理您的请求时出现错误：${err.message || '未知错误'}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 快捷操作
  const quickActions = [
    { label: '调整布局', prompt: '请优化简历的布局，使其更加美观' },
    { label: '突出技能', prompt: '请突出显示与目标岗位匹配的技能' },
    { label: '简化内容', prompt: '请简化简历内容，使其更加简洁' },
    { label: '添加分隔', prompt: '请在各个区块之间添加视觉分隔' },
  ];

  // 复制消息
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white border-l', className)}>
      {/* 标题 */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">AI 助手</h2>
        </div>
        <p className="text-sm text-gray-500">描述你想要的修改</p>
      </div>

      {/* 消息列表 */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>开始与 AI 对话吧！</p>
              <p className="text-sm mt-1">描述你想要对简历进行的修改</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg p-3',
                  message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      'text-xs',
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    )}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.actions && message.actions.length > 0 && (
                    <Badge
                      variant={message.role === 'user' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {message.actions.length} 个操作
                    </Badge>
                  )}
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(message.content)}
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        'text-gray-400 hover:text-gray-600'
                      )}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">AI 正在思考...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2">
                <RotateCcw className="w-3 h-3 mr-1" />
                重试
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 快捷操作 */}
      <div className="px-4 py-2 border-t">
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => setInput(action.prompt)}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你想要的修改... (如：把技能部分向上移动)"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">提示：按 Enter 发送，Shift + Enter 换行</p>
      </div>
    </div>
  );
}
