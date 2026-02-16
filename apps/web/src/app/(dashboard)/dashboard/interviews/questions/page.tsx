'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  interviewsApi,
  QuestionBankItem,
  QuestionCategory,
} from '@/lib/api/interviews';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Search,
  Filter,
  ChevronRight,
  Loader2,
  BookOpen,
  Users,
  Code,
  Briefcase,
  Target,
  Lightbulb,
  X,
  Eye,
  Bookmark,
  Heart,
} from 'lucide-react';

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

const categoryIcons: Record<string, React.ReactNode> = {
  behavioral: <Users className="w-4 h-4" />,
  technical: <Code className="w-4 h-4" />,
  hr: <Briefcase className="w-4 h-4" />,
  situational: <Target className="w-4 h-4" />,
};

export default function QuestionBankPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBankItem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // 从 localStorage 加载收藏
  useEffect(() => {
    const saved = localStorage.getItem('questionFavorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // 保存收藏到 localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('questionFavorites', JSON.stringify(newFavorites));
  };

  // 切换收藏状态
  const toggleFavorite = (questionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const isFavorited = favorites.includes(questionId);
    const newFavorites = isFavorited
      ? favorites.filter((id) => id !== questionId)
      : [...favorites, questionId];
    saveFavorites(newFavorites);
    toast({
      title: isFavorited ? '已取消收藏' : '已收藏',
      description: isFavorited ? '题目已从收藏列表移除' : '题目已添加到收藏列表',
    });
  };

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [questionsRes, categoriesRes] = await Promise.all([
        interviewsApi.getQuestionBank({
          category: selectedCategory || undefined,
          difficulty: selectedDifficulty || undefined,
          search: searchQuery || undefined,
          limit: 50,
        }),
        interviewsApi.getCategories(),
      ]);
      setQuestions(questionsRes.data);
      setPagination(questionsRes.pagination);
      setCategories(categoriesRes);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载题库',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedDifficulty, searchQuery, toast]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSearch = () => {
    loadQuestions();
  };

  const handleQuestionClick = (question: QuestionBankItem) => {
    setSelectedQuestion(question);
    setShowAnswer(false);
  };

  const handleCloseDetail = () => {
    setSelectedQuestion(null);
    setShowAnswer(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">面试题库</h1>
          <p className="text-sm text-gray-500 mt-1">
            浏览各类面试题目，提前准备，提升面试成功率
          </p>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索题目..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* 难度筛选 */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">全部难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>

            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              搜索
            </Button>
          </div>

          {/* 快捷分类 */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedDifficulty('');
                setSearchQuery('');
                setShowFavoritesOnly(false);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                !selectedCategory && !selectedDifficulty && !showFavoritesOnly
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => {
                setShowFavoritesOnly(true);
                setSelectedCategory('');
                setSelectedDifficulty('');
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1 ${
                showFavoritesOnly
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className="w-4 h-4" />
              我的收藏 ({favorites.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setShowFavoritesOnly(false);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1 ${
                  selectedCategory === cat.id && !showFavoritesOnly
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {categoryIcons[cat.id]}
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 题目列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (() => {
          // 过滤收藏
          const displayQuestions = showFavoritesOnly
            ? questions.filter((q) => favorites.includes(q.id))
            : questions;

          if (displayQuestions.length === 0) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                {showFavoritesOnly ? (
                  <>
                    <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无收藏</h3>
                    <p className="text-gray-500">浏览题目并点击收藏按钮添加收藏</p>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无题目</h3>
                    <p className="text-gray-500">调整筛选条件试试</p>
                  </>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {displayQuestions.map((question) => (
                <div
                  key={question.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-primary/20 transition cursor-pointer"
                  onClick={() => handleQuestionClick(question)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          {categoryIcons[question.category]}
                          {categories.find((c) => c.id === question.category)?.name || question.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded border ${
                            difficultyColors[question.difficulty]
                          }`}
                        >
                          {difficultyLabels[question.difficulty]}
                        </span>
                      </div>
                      <h3 className="text-gray-900 font-medium">{question.question}</h3>
                      {question.tags && question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {question.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => toggleFavorite(question.id, e)}
                        className={`p-2 rounded-lg transition ${
                          favorites.includes(question.id)
                            ? 'text-red-500 bg-red-50 hover:bg-red-100'
                            : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                        }`}
                        title={favorites.includes(question.id) ? '取消收藏' : '收藏'}
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            favorites.includes(question.id) ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}

              {/* 统计 */}
              <div className="text-center text-sm text-gray-500 py-4">
                {showFavoritesOnly
                  ? `收藏 ${displayQuestions.length} 道题目`
                  : `共 ${pagination.total} 道题目`
                }
              </div>
            </div>
          );
        })()}
      </div>

      {/* 题目详情弹窗 */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* 头部 */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {categoryIcons[selectedQuestion.category]}
                <span className="text-sm text-gray-500">
                  {categories.find((c) => c.id === selectedQuestion.category)?.name ||
                    selectedQuestion.category}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded border ${
                    difficultyColors[selectedQuestion.difficulty]
                  }`}
                >
                  {difficultyLabels[selectedQuestion.difficulty]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleFavorite(selectedQuestion.id, e)}
                  className={`p-2 rounded-lg transition ${
                    favorites.includes(selectedQuestion.id)
                      ? 'text-red-500 bg-red-50 hover:bg-red-100'
                      : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                  }`}
                  title={favorites.includes(selectedQuestion.id) ? '取消收藏' : '收藏'}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorites.includes(selectedQuestion.id) ? 'fill-current' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={handleCloseDetail}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 问题 */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedQuestion.question}
                </h2>
                {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedQuestion.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 评分要点 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  评分要点
                </h3>
                <ul className="space-y-2">
                  {selectedQuestion.keypoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-primary mt-0.5">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 参考答案 */}
              {showAnswer ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    参考答案
                  </h3>
                  <p className="text-sm text-green-700 leading-relaxed whitespace-pre-wrap">
                    {selectedQuestion.referenceAnswer}
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAnswer(true)}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  查看参考答案
                </Button>
              )}
            </div>

            {/* 底部 */}
            <div className="p-4 border-t border-gray-100">
              <Button onClick={handleCloseDetail} className="w-full">
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
