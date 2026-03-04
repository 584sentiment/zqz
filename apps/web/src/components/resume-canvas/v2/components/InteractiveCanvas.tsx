/**
 * 交互式简历画布组件
 * 支持直接在画布上点击编辑
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { ResumeContent, StylePreset, RenderPlan } from '../types';
import type { InteractiveRenderPlan, EditableRegion } from '../services/interactive-generator';
import { getStylePreset } from '../services/style-presets';
import { createInteractiveGenerator } from '../services/interactive-generator';
import { createRenderEngine } from '../services/render-engine';

interface InteractiveCanvasProps {
  /** 简历内容 */
  content: ResumeContent;
  /** 样式预设 ID */
  presetId?: string;
  /** 缩放比例 */
  scale?: number;
  /** 内容变化回调 */
  onContentChange?: (content: ResumeContent) => void;
  /** 渲染方案生成完成回调 */
  onRenderPlanGenerated?: (plan: RenderPlan) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 是否处于编辑模式 */
  isEditing?: boolean;
}

/**
 * 内联文本编辑器
 */
function InlineTextEditor({
  region,
  scale,
  onSave,
  onCancel,
}: {
  region: EditableRegion;
  scale: number;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(typeof region.value === 'string' ? region.value : region.value.join(', '));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave(value);
  };

  // 计算编辑器位置和大小
  const style: React.CSSProperties = {
    position: 'absolute',
    left: region.rect.x * scale,
    top: region.rect.y * scale,
    width: region.rect.width * scale,
    minHeight: (region.rect.height * scale) + 8,
    fontSize: region.style.fontSize * scale,
    fontFamily: region.style.fontFamily,
    fontWeight: region.style.fontWeight as React.CSSProperties['fontWeight'],
    lineHeight: region.style.lineHeight,
    color: region.style.color,
    padding: '4px 8px',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    background: 'white',
    outline: 'none',
    resize: 'none',
    zIndex: 100,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={style}
    />
  );
}

/**
 * 交互式简历画布
 */
export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  content,
  presetId = 'modern',
  scale = 1,
  onContentChange,
  onRenderPlanGenerated,
  onError,
  isEditing = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [interactivePlan, setInteractivePlan] = useState<InteractiveRenderPlan | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<EditableRegion | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<EditableRegion | null>(null);

  const preset = getStylePreset(presetId);

  // 生成渲染方案
  const generatePlan = useCallback(() => {
    if (!preset || !content) return;

    try {
      const generator = createInteractiveGenerator(preset);
      const plan = generator.generate(content);
      setInteractivePlan(plan);
      onRenderPlanGenerated?.(plan);
    } catch (err) {
      const error = err as Error;
      onError?.(error);
    }
  }, [preset, content, onRenderPlanGenerated, onError]);

  // 初始化生成
  useEffect(() => {
    generatePlan();
  }, [generatePlan]);

  // 渲染画布
  useEffect(() => {
    if (!interactivePlan || !canvasRef.current || !preset) return;

    const page = interactivePlan.pages[0];
    if (!page) return;

    const engine = createRenderEngine(preset);
    engine.renderPage(page, canvasRef.current, scale);
  }, [interactivePlan, scale, preset]);

  // 处理点击事件
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isEditing || !interactivePlan || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // 查找点击的可编辑区域
    const clickedRegion = interactivePlan.editableRegions.find((region) => {
      const r = region.rect;
      return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
    });

    if (clickedRegion) {
      setSelectedRegion(clickedRegion);
    } else {
      setSelectedRegion(null);
    }
  }, [isEditing, interactivePlan, scale]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isEditing || !interactivePlan || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const hovered = interactivePlan.editableRegions.find((region) => {
      const r = region.rect;
      return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
    });

    setHoveredRegion(hovered || null);
  }, [isEditing, interactivePlan, scale]);

  // 保存编辑
  const handleSaveEdit = useCallback((value: string) => {
    if (!selectedRegion || !onContentChange) {
      setSelectedRegion(null);
      return;
    }

    // 根据路径更新内容
    const newContent = { ...content };
    const pathParts = selectedRegion.path.split('.');

    let current: Record<string, unknown> = newContent as Record<string, unknown>;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      // 处理数组索引，如 "experience.0.company"
      if (/^\d+$/.test(part) && Array.isArray(current)) {
        current = current[parseInt(part)] as Record<string, unknown>;
      } else if (current[part]) {
        current = current[part] as Record<string, unknown>;
      }
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (/^\d+$/.test(lastPart) && Array.isArray(current)) {
      current[parseInt(lastPart)] = value;
    } else {
      current[lastPart] = value;
    }

    onContentChange(newContent as ResumeContent);
    setSelectedRegion(null);
  }, [selectedRegion, content, onContentChange]);

  // 渲染可编辑区域覆盖层
  const renderEditableOverlays = () => {
    if (!isEditing || !interactivePlan) return null;

    return interactivePlan.editableRegions.map((region) => {
      const isSelected = selectedRegion?.id === region.id;
      const isHovered = hoveredRegion?.id === region.id;

      if (isSelected) return null; // 选中的区域由编辑器渲染

      return (
        <div
          key={region.id}
          style={{
            position: 'absolute',
            left: region.rect.x * scale,
            top: region.rect.y * scale,
            width: region.rect.width * scale,
            height: region.rect.height * scale,
            cursor: 'text',
            background: isHovered ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            border: isHovered ? '1px dashed rgba(59, 130, 246, 0.5)' : 'none',
            borderRadius: '2px',
            transition: 'all 0.15s ease',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRegion(region);
          }}
        />
      );
    });
  };

  if (!preset) {
    return (
      <div className="text-center text-red-500 p-8">
        样式预设不存在
      </div>
    );
  }

  const pageWidth = 595 * scale;
  const pageHeight = 842 * scale;

  return (
    <div
      ref={containerRef}
      className="interactive-canvas relative"
      style={{
        width: pageWidth,
        height: pageHeight,
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredRegion(null)}
    >
      {/* Canvas 层 */}
      <canvas
        ref={canvasRef}
        style={{
          width: pageWidth,
          height: pageHeight,
        }}
      />

      {/* 可编辑区域覆盖层 */}
      {renderEditableOverlays()}

      {/* 内联编辑器 */}
      {selectedRegion && (
        <InlineTextEditor
          region={selectedRegion}
          scale={scale}
          onSave={handleSaveEdit}
          onCancel={() => setSelectedRegion(null)}
        />
      )}

      {/* 编辑模式提示 */}
      {isEditing && (
        <div
          className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
          style={{ zIndex: 200 }}
        >
          点击文字进行编辑
        </div>
      )}
    </div>
  );
};

export default InteractiveCanvas;
