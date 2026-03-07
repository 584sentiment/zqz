/**
 * 区块润色对话框组件
 * 提供风格选择，预览对比，一键应用
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SectionOptimizeResult, resumesApi } from '@/lib/api/resumes';
import {
  X,
  Sparkles,
  Check,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type PolishStyle = 'professional' | 'concise' | 'detailed';

interface SectionPolishDialogProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭对话框 */
  onClose: () => void;
  /** 区块类型 */
  sectionType: string;
  /** 原始内容 */
  originalContent: string;
  /** 应用优化结果 */
  onApply: (optimized: string) => void;
  /** 简历 ID */
  resumeId: string;
}

const styleOptions: Array<{
  value: PolishStyle;
  label: string;
  description: string;
}> = [
  {
    value: 'professional',
    label: '专业风格',
    description: '正式商务语言，突出成就和影响力',
  },
  {
    value: 'concise',
    label: '简洁风格',
    description: '简洁明了，去除冗余，每句话都有价值',
  },
  {
    value: 'detailed',
    label: '详细风格',
    description: '详细描述，包含具体情境、行动和结果',
  },
];

export function SectionPolishDialog({
  isOpen,
  onClose,
  sectionType,
  originalContent,
  onApply,
  resumeId,
}: SectionPolishDialogProps) {
  const [selectedStyle, setSelectedStyle] = useState<PolishStyle>('professional');
  const [result, setResult] = useState<SectionOptimizeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 防止重复请求的 ref
  const isRequestInProgress = useRef(false);

  // 打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setSelectedStyle('professional');
    }
  }, [isOpen, sectionType, originalContent]);

  // 执行润色
  const handlePolish = async () => {
    // 防止重复调用
    if (isRequestInProgress.current) {
      return;
    }

    isRequestInProgress.current = true;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const optimizeResult = await resumesApi.optimizeSection(resumeId, {
        sectionType,
        content: originalContent,
        style: selectedStyle,
      });

      if (optimizeResult.optimized === originalContent) {
        setError('内容已经很好，无需优化');
      } else {
        setResult(optimizeResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败，请稍后重试');
    } finally {
      setIsLoading(false);
      isRequestInProgress.current = false;
    }
  };

  // 应用结果
  const handleApply = () => {
    if (result) {
      onApply(result.optimized);
      onClose();
    }
  };

  if (!isOpen) return null;

  const sectionLabel = getSectionLabel(sectionType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">
              AI 润色 - {sectionLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 风格选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择润色风格
            </label>
            <div className="grid grid-cols-3 gap-3">
              {styleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStyle(option.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedStyle === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p
                    className={`font-medium text-sm ${
                      selectedStyle === option.value
                        ? 'text-purple-700'
                        : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 润色按钮 */}
          <Button
            onClick={handlePolish}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在润色...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                开始润色
              </>
            )}
          </Button>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              {error}
            </div>
          )}

          {/* 结果对比 */}
          {result && (
            <div className="space-y-4">
              {/* 原文 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  原文
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-200">
                  {originalContent}
                </div>
              </div>

              {/* 箭头 */}
              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400 rotate-90" />
              </div>

              {/* 优化后 */}
              <div>
                <label className="block text-sm font-medium text-green-600 mb-2">
                  优化后
                </label>
                <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-900 border border-green-200">
                  {result.optimized}
                </div>
              </div>

              {/* 修改说明 */}
              {result.changes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    修改说明
                  </label>
                  <div className="space-y-2">
                    {result.changes.map((change, index) => (
                      <div
                        key={index}
                        className="p-2 bg-gray-50 rounded text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <RefreshCw className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-500 line-through mr-2">
                              {change.original}
                            </span>
                            <span className="text-gray-900">{change.modified}</span>
                            <span className="text-gray-400 ml-2">— {change.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {result && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleApply}>
              <Check className="w-4 h-4 mr-2" />
              应用优化
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 获取区块标签
 */
function getSectionLabel(sectionType: string): string {
  // 处理嵌套路径，如 "experience.0" -> "experience"
  const baseSection = sectionType.split('.')[0] ?? sectionType;

  const labels: Record<string, string> = {
    summary: '个人简介',
    skills: '技能',
    experience: '工作经历',
    projects: '项目经历',
    education: '教育经历',
  };
  return labels[baseSection] || baseSection;
}

export default SectionPolishDialog;
