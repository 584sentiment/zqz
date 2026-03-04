'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ResumeContent, StylePreset, RenderPlan } from '../types';
import { getStylePreset, getAllStylePresets } from '../services/style-presets';
import { createLocalRenderPlanGenerator } from '../services/local-render-plan-generator';
import { createRenderEngine } from '../services/render-engine';

interface ResumeRendererV2Props {
  /** 简历内容 */
  content: ResumeContent;
  /** 样式预设 ID */
  presetId?: string;
  /** 缩放比例 */
  scale?: number;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示预设选择器 */
  showPresetSelector?: boolean;
  /** 生成完成回调 */
  onRenderPlanGenerated?: (plan: RenderPlan) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 缩放变化回调 */
  onScaleChange?: (scale: number) => void;
  /** 全屏预览回调 */
  onFullscreen?: () => void;
}

/**
 * 简历渲染器 V2
 * 使用 LLM 生成绘制指令的新一代渲染系统
 */
export const ResumeRendererV2: React.FC<ResumeRendererV2Props> = ({
  content,
  presetId = 'modern',
  scale: externalScale = 0.8,
  showToolbar = true,
  showPresetSelector = true,
  onRenderPlanGenerated,
  onError,
  onScaleChange,
  onFullscreen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPresetId, setCurrentPresetId] = useState(presetId);
  const [renderPlan, setRenderPlan] = useState<RenderPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [internalScale, setInternalScale] = useState(externalScale);

  // 使用外部 scale 或内部 scale
  const scale = onScaleChange ? externalScale : internalScale;

  const presets = getAllStylePresets();
  const currentPreset = getStylePreset(currentPresetId);

  // 监听外部 presetId 变化
  useEffect(() => {
    if (presetId && presetId !== currentPresetId) {
      setCurrentPresetId(presetId);
    }
  }, [presetId]);

  // 监听外部 scale 变化
  useEffect(() => {
    if (externalScale !== internalScale && !onScaleChange) {
      setInternalScale(externalScale);
    }
  }, [externalScale, onScaleChange]);

  /**
   * 生成渲染方案
   */
  const generateRenderPlan = useCallback(() => {
    const preset = getStylePreset(currentPresetId);
    if (!preset) {
      setError('样式预设不存在');
      return;
    }

    if (!content) {
      setError('简历内容为空');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 使用本地生成器
      const generator = createLocalRenderPlanGenerator(preset);
      const plan = generator.generate(content);

      setRenderPlan(plan);
      setCurrentPage(0);
      onRenderPlanGenerated?.(plan);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setIsGenerating(false);
    }
  }, [content, currentPresetId, onRenderPlanGenerated, onError]);

  /**
   * 渲染当前页面
   */
  useEffect(() => {
    if (!renderPlan || !canvasRef.current || !currentPreset) return;

    const page = renderPlan.pages[currentPage];
    if (!page) return;

    const engine = createRenderEngine(currentPreset);
    engine.renderPage(page, canvasRef.current, scale);
  }, [renderPlan, currentPage, scale, currentPreset]);

  /**
   * 内容或预设变化时重新生成
   */
  useEffect(() => {
    if (content && currentPreset) {
      generateRenderPlan();
    }
  }, [currentPresetId, content]); // 依赖 presetId 和 content

  /**
   * 处理预设切换
   */
  const handlePresetChange = (newPresetId: string) => {
    setCurrentPresetId(newPresetId);
  };

  /**
   * 处理缩放
   */
  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.1, 2);
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.1, 0.3);
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  };

  /**
   * 处理页面切换
   */
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (renderPlan && currentPage < renderPlan.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="resume-renderer-v2 flex flex-col h-full bg-gray-100">
      {/* 工具栏 */}
      {showToolbar && (
        <div className="toolbar flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          {/* 左侧：预设选择 */}
          <div className="flex items-center gap-3">
            {showPresetSelector && (
              <select
                value={currentPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={generateRenderPlan}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重新生成
                </>
              )}
            </button>
          </div>

          {/* 中间：页面导航 */}
          {renderPlan && renderPlan.pages.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-600">
                {currentPage + 1} / {renderPlan.pages.length}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === renderPlan.pages.length - 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* 右侧：缩放控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-gray-100"
              title="缩小"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-gray-100"
              title="放大"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {/* 全屏预览按钮 */}
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                className="p-1.5 rounded hover:bg-gray-100 ml-2"
                title="全屏预览"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 预览区域 */}
      <div className="preview-area flex-1 overflow-auto flex items-center justify-center p-8">
        {error ? (
          <div className="text-center text-red-500">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg font-medium">生成失败</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <button
              onClick={generateRenderPlan}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        ) : isGenerating ? (
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-lg font-medium">AI 正在生成排版...</p>
            <p className="text-sm mt-2">根据内容和样式预设，智能生成最佳布局</p>
          </div>
        ) : renderPlan ? (
          <div className="shadow-xl">
            <canvas
              ref={canvasRef}
              style={{
                border: '1px solid #e5e7eb',
              }}
            />
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>点击「重新生成」开始</p>
          </div>
        )}
      </div>

      {/* 设计意图提示 */}
      {currentPreset && !isGenerating && (
        <div className="design-intent px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          <span className="font-medium">{currentPreset.name}：</span>
          {currentPreset.description}
        </div>
      )}
    </div>
  );
};

export default ResumeRendererV2;
