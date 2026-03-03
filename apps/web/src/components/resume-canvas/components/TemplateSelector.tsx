'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Crown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { templates, getTemplate } from '../templates/template-registry';
import type { ResumeTemplate } from '../types/template.types';

interface TemplateSelectorProps {
  /** 当前选中的模板 ID */
  currentTemplateId: string;
  /** 模板切换回调 */
  onTemplateChange: (templateId: string) => void;
  /** 显示高级模板提示 */
  showPremiumBadge?: boolean;
  /** 容器类名 */
  className?: string;
}

/**
 * 模板选择器组件
 * 显示模板缩略图列表，支持切换
 */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  currentTemplateId,
  onTemplateChange,
  showPremiumBadge = true,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 初始化当前索引
  useEffect(() => {
    const index = templates.findIndex((t) => t.id === currentTemplateId);
    if (index >= 0) {
      setCurrentIndex(index);
    }
  }, [currentTemplateId]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onTemplateChange(templates[newIndex].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < templates.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onTemplateChange(templates[newIndex].id);
    }
  };

  const handleSelect = (index: number) => {
    setCurrentIndex(index);
    onTemplateChange(templates[index].id);
  };

  const currentTemplate = templates[currentIndex];

  if (!currentTemplate) {
    return null;
  }

  return (
    <div className={cn('template-selector', className)}>
      {/* 主展示区 */}
      <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 模板预览区 */}
        <div className="aspect-[210/297] bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center">
          {/* 模板名称预览 */}
          <div className="text-center p-6">
            <div className="text-2xl font-bold text-gray-800 mb-2">{currentTemplate.name}</div>
            <div className="text-sm text-gray-500">{currentTemplate.description}</div>
          </div>

          {/* 高级模板标识 */}
          {currentTemplate.isPremium && showPremiumBadge && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 rounded-full text-xs font-medium shadow-sm">
              <Crown className="w-3.5 h-3.5" />
              高级
            </div>
          )}

          {/* 当前选中标识 */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-full text-xs font-medium shadow-sm">
            <Check className="w-3.5 h-3.5" />
            当前模板
          </div>
        </div>

        {/* 模板信息 */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{currentTemplate.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{currentTemplate.description}</p>
            </div>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {getCategoryName(currentTemplate.category)}
            </span>
          </div>
        </div>

        {/* 左右导航 */}
        {templates.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200"
              title="上一个模板"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === templates.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200"
              title="下一个模板"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </>
        )}
      </div>

      {/* 模板缩略图列表 */}
      <div className="flex gap-3 mt-4 overflow-x-auto pb-2 -mx-1 px-1">
        {templates.map((template, index) => (
          <button
            key={template.id}
            onClick={() => handleSelect(index)}
            className={cn(
              'flex-shrink-0 w-16 aspect-[210/297] rounded-lg border-2 overflow-hidden transition-all relative group',
              index === currentIndex
                ? 'border-blue-600 ring-2 ring-blue-200 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow'
            )}
            title={template.name}
          >
            {/* 模板缩略图占位 */}
            <div className={cn(
              'w-full h-full flex items-center justify-center text-xs font-medium transition-colors',
              index === currentIndex
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-500'
            )}>
              {template.name.slice(0, 2)}
            </div>

            {/* 高级标识点 */}
            {template.isPremium && showPremiumBadge && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full shadow-sm" />
            )}
          </button>
        ))}
      </div>

      {/* 模板计数 */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {templates.map((_, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex
                ? 'bg-blue-600 w-4'
                : 'bg-gray-300 hover:bg-gray-400'
            )}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 获取分类中文名
 */
function getCategoryName(category: ResumeTemplate['category']): string {
  const names: Record<ResumeTemplate['category'], string> = {
    professional: '商务专业',
    creative: '创意设计',
    simple: '简约清新',
    executive: '高管高端',
  };
  return names[category] || category;
}

export default TemplateSelector;
