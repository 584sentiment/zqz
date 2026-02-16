'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { skillsApi, SkillSession } from '@/lib/api/skills';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Send,
  Plus,
  History,
  Trash2,
  ChevronRight,
  Loader2,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function SkillDiscoveryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SkillSession[]>([]);
  const [currentSession, setCurrentSession] = useState<SkillSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await skillsApi.getSessions();
      setSessions(data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载会话列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewSession = async () => {
    try {
      const session = await skillsApi.createSession();
      setCurrentSession(session);
      setMessages([
        {
          role: 'assistant',
          content: '你好！我是你的技能发掘助手。让我来帮助你发现自己的核心技能和优势。\n\n请告诉我你最近的一份工作或项目经历，我会通过对话帮你挖掘出你可能忽视的技能。',
        },
      ]);
      setSessions((prev) => [session, ...prev]);
    } catch (error) {
      toast({
        title: '创建失败',
        description: '无法创建新会话',
        variant: 'destructive',
      });
    }
  };

  const continueSession = async (session: SkillSession) => {
    setCurrentSession(session);
    setMessages([
      {
        role: 'assistant',
        content: '欢迎回来！我们之前已经发现了一些技能。你想继续聊聊其他经历吗？',
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      // 模拟 AI 回复（实际应调用 AI 服务）
      await skillsApi.incrementMessage(currentSession.id);

      // 模拟技能发现
      const skills = extractSkills(userMessage);
      if (skills.length > 0) {
        for (const skill of skills) {
          await skillsApi.addSkill(currentSession.id, skill);
        }
        setCurrentSession((prev) =>
          prev ? { ...prev, discoveredSkills: [...prev.discoveredSkills, ...skills] } : null
        );
      }

      // 模拟 AI 响应
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: generateResponse(userMessage, skills),
          },
        ]);
        setIsSending(false);
      }, 1000);
    } catch (error) {
      toast({
        title: '发送失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
      setIsSending(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await skillsApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      toast({
        title: '删除成功',
        description: '会话已删除',
      });
    } catch (error) {
      toast({
        title: '删除失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const completeSession = async () => {
    if (!currentSession) return;
    try {
      await skillsApi.completeSession(currentSession.id);
      toast({
        title: '会话完成',
        description: `共发现 ${currentSession.discoveredSkills.length} 个技能`,
      });
      loadSessions();
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 简单的技能提取（模拟）
  const extractSkills = (text: string): string[] => {
    const skillKeywords = [
      'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Go',
      'Node.js', 'Next.js', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker',
      'Kubernetes', 'AWS', 'Git', 'Linux', '项目管理', '团队协作', '沟通能力',
      '问题解决', '领导力', '数据分析', '产品设计', '用户体验', '敏捷开发',
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();
    for (const skill of skillKeywords) {
      if (lowerText.includes(skill.toLowerCase()) && !found.includes(skill)) {
        found.push(skill);
      }
    }
    return found;
  };

  // 生成响应（模拟）
  const generateResponse = (userMessage: string, skills: string[]): string => {
    if (skills.length > 0) {
      return `太棒了！从你的描述中，我发现了这些技能：${skills.join('、')}。\n\n能再详细说说你在项目中是如何运用这些技能的吗？或者你还有其他想分享的经历？`;
    }

    const responses = [
      '这很有意思！能具体说说你在这个项目中负责什么吗？',
      '听起来是个很棒的经历。在这个过程中你遇到了哪些挑战？',
      '你是如何解决这些问题的？能举个例子吗？',
      '团队合作中你扮演了什么角色？和其他成员是如何配合的？',
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧：会话列表 */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <Button onClick={startNewSession} className="w-full shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  开始新对话
                </Button>
              </div>

              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  历史会话
                </h3>
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">暂无历史会话</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 rounded-lg cursor-pointer transition group ${
                          currentSession?.id === session.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => continueSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {session.job?.title || '技能发掘对话'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {session.discoveredSkills.length} 个技能 · {session.messagesCount} 条消息
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：对话区 */}
          <div className="flex-1">
            {currentSession ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-12rem)]">
                {/* 已发现技能 */}
                {currentSession.discoveredSkills.length > 0 && (
                  <div className="p-4 border-b border-gray-100 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">已发现技能</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentSession.discoveredSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white text-primary text-xs font-medium rounded-full border border-primary/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user' ? 'bg-primary/10' : 'bg-gradient-to-br from-primary to-teal-500'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-primary" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-primary text-white rounded-tr-md'
                            : 'bg-gray-100 text-gray-800 rounded-tl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区 */}
                <div className="p-4 border-t border-gray-100">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="描述你的工作或项目经历..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                      disabled={isSending}
                    />
                    <Button onClick={sendMessage} disabled={!input.trim() || isSending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-400">按 Enter 发送消息</p>
                    <Button variant="outline" size="sm" onClick={completeSession}>
                      结束会话
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">技能发掘</h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  通过与 AI 对话，挖掘你可能在简历中遗漏的核心技能和优势。我们会引导你描述工作经历，并从中识别可迁移技能。
                </p>
                <Button onClick={startNewSession} size="lg" className="shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  开始发掘我的技能
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
