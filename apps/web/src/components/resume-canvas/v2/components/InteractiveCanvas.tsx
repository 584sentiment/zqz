/**
 * 交互式简历画布组件
 * 支持直接在画布上点击编辑和区块拖拽排序
 *
 * 功能：
 * - 内联文本编辑
 * - 富文本编辑（加粗、列表等）
 * - 区块拖拽排序
 * - 撤销/重做支持
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDndContext,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ResumeContent, RenderPlan } from '../types';
import type { InteractiveRenderPlan, EditableRegion, SectionRegion } from '../services/interactive-generator';
import { getStylePreset } from '../services/style-presets';
import { createInteractiveGenerator } from '../services/interactive-generator';
import { createRenderEngine } from '../services/render-engine';
import { InlineRichTextEditor } from './InlineRichTextEditor';

interface InteractiveCanvasProps {
  /** 简历内容 */
  content: ResumeContent;
  /** 样式预设 ID */
  presetId?: string;
  /** 缩放比例 */
  scale?: number;
  /** 内容变化回调 */
  onContentChange?: (content: ResumeContent) => void;
  /** 区块排序变化回调 */
  onSectionOrderChange?: (sections: SectionInfo[]) => void;
  /** 渲染方案生成完成回调 */
  onRenderPlanGenerated?: (plan: RenderPlan) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 是否处于编辑模式 */
  isEditing?: boolean;
  /** 是否使用富文本编辑器 */
  useRichText?: boolean;
  /** 是否启用区块拖拽 */
  enableSectionDrag?: boolean;
}

/** 区块信息 */
export interface SectionInfo {
  id: string;
  type: string;
  name: string;
  order: number;
  rect: { x: number; y: number; width: number; height: number };
}

/**
 * 从可编辑区域推断区块边界
 */
function inferSectionsFromRegions(regions: EditableRegion[]): SectionInfo[] {
  const sectionMap = new Map<string, { minY: number; maxY: number; minX: number; maxX: number; type: string }>();

  for (const region of regions) {
    const pathParts = region.path.split('.');
    let sectionType = pathParts[0];
    let sectionName = sectionType;

    // 特殊处理
    if (sectionType === 'contact') {
      sectionType = 'contact';
      sectionName = '联系方式';
    } else if (sectionType === 'name' || sectionType === 'title') {
      sectionType = 'header';
      sectionName = '基本信息';
    } else {
      const sectionNames: Record<string, string> = {
        summary: '个人简介',
        experience: '工作经历',
        skills: '专业技能',
        projects: '项目经历',
        education: '教育背景',
      };
      sectionName = sectionNames[sectionType] || sectionType;
    }

    const existing = sectionMap.get(sectionType);
    if (existing) {
      existing.minY = Math.min(existing.minY, region.rect.y);
      existing.maxY = Math.max(existing.maxY, region.rect.y + region.rect.height);
      existing.minX = Math.min(existing.minX, region.rect.x);
      existing.maxX = Math.max(existing.maxX, region.rect.x + region.rect.width);
    } else {
      sectionMap.set(sectionType, {
        type: sectionType,
        minY: region.rect.y,
        maxY: region.rect.y + region.rect.height,
        minX: region.rect.x,
        maxX: region.rect.x + region.rect.width,
      });
    }
  }

  // 转换为数组并按 Y 坐标排序
  const sections = Array.from(sectionMap.entries()).map(([id, bounds], index) => ({
    id,
    type: bounds.type,
    name: id === 'contact' ? '联系方式' :
          id === 'header' ? '基本信息' :
          id === 'summary' ? '个人简介' :
          id === 'experience' ? '工作经历' :
          id === 'skills' ? '专业技能' :
          id === 'projects' ? '项目经历' :
          id === 'education' ? '教育背景' : id,
    order: index,
    rect: {
      x: bounds.minX - 10,
      y: bounds.minY - 5,
      width: bounds.maxX - bounds.minX + 20,
      height: bounds.maxY - bounds.minY + 10,
    },
  }));

  // 按 Y 坐标排序
  sections.sort((a, b) => a.rect.y - b.rect.y);
  sections.forEach((s, i) => s.order = i);

  return sections;
}

/**
 * 可排序的区块覆盖层
 */
function SortableSectionOverlay({
  section,
  scale,
  isEditing,
  onRegionClick,
}: {
  section: SectionInfo;
  scale: number;
  isEditing: boolean;
  onRegionClick: (region: EditableRegion) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: section.rect.x * scale,
    top: section.rect.y * scale,
    width: section.rect.width * scale,
    height: section.rect.height * scale,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* 拖拽手柄 */}
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 bg-white rounded shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors"
          style={{ zIndex: 20 }}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* 区块名称标签 */}
      {isEditing && (
        <div
          className="absolute -top-5 left-0 px-2 py-0.5 bg-blue-500 text-white text-xs rounded"
          style={{ zIndex: 20 }}
        >
          {section.name}
        </div>
      )}

      {/* 区块边框 */}
      {isEditing && (
        <div
          className="absolute inset-0 border-2 border-dashed border-blue-300 rounded pointer-events-none"
          style={{ zIndex: 5 }}
        />
      )}
    </div>
  );
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
  onSectionOrderChange,
  onRenderPlanGenerated,
  onError,
  isEditing = false,
  useRichText = true,
  enableSectionDrag = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [interactivePlan, setInteractivePlan] = useState<InteractiveRenderPlan | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<EditableRegion | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<EditableRegion | null>(null);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState<string[] | undefined>(undefined);

  // 使用 ref 存储回调，避免依赖变化导致无限循环
  const onRenderPlanGeneratedRef = useRef(onRenderPlanGenerated);
  const onErrorRef = useRef(onError);
  const onContentChangeRef = useRef(onContentChange);
  const onSectionOrderChangeRef = useRef(onSectionOrderChange);

  // 同步更新 ref
  useEffect(() => {
    onRenderPlanGeneratedRef.current = onRenderPlanGenerated;
    onErrorRef.current = onError;
    onContentChangeRef.current = onContentChange;
    onSectionOrderChangeRef.current = onSectionOrderChange;
  });

  const preset = getStylePreset(presetId);

  // DnD 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 生成渲染方案 - 支持 sectionOrder
  useEffect(() => {
    if (!preset || !content) return;

    try {
      const generator = createInteractiveGenerator(preset);
      const plan = generator.generate(content, sectionOrder);
      setInteractivePlan(plan);
      onRenderPlanGeneratedRef.current?.(plan);

      // 推断区块信息
      if (plan.editableRegions.length > 0) {
        const inferredSections = inferSectionsFromRegions(plan.editableRegions);
        setSections(inferredSections);
      }
    } catch (err) {
      onErrorRef.current?.(err as Error);
    }
  }, [preset, content, sectionOrder]);

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
    if (!selectedRegion) {
      setSelectedRegion(null);
      return;
    }

    const newContent = JSON.parse(JSON.stringify(content)) as ResumeContent;
    const pathParts = selectedRegion.path.split('.');

    let current: unknown = newContent;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (current === null || current === undefined) break;

      if (Array.isArray(current)) {
        const index = parseInt(part);
        if (!isNaN(index) && index >= 0 && index < current.length) {
          current = current[index];
        }
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      }
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (current !== null && current !== undefined) {
      if (Array.isArray(current)) {
        const index = parseInt(lastPart);
        if (!isNaN(index)) {
          current[index] = value;
        }
      } else if (typeof current === 'object') {
        (current as Record<string, unknown>)[lastPart] = value;
      }
    }

    onContentChangeRef.current?.(newContent);
    setSelectedRegion(null);
  }, [selectedRegion, content]);

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveSectionId(event.active.id as string);
  }, []);

  // 拖拽结束 - 更新区块顺序并重新渲染
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);

        const newSections = arrayMove(prev, oldIndex, newIndex).map((s, i) => ({
          ...s,
          order: i,
        }));

        // 更新 sectionOrder 状态，触发重新渲染
        const newOrder = newSections.map(s => s.id);
        setSectionOrder(newOrder);

        // 通知父组件
        onSectionOrderChangeRef.current?.(newSections);

        return newSections;
      });
    }

    setActiveSectionId(null);
  }, []);

  // 渲染可编辑区域覆盖层
  const renderEditableOverlays = () => {
    if (!isEditing || !interactivePlan) return null;

    return interactivePlan.editableRegions.map((region) => {
      const isSelected = selectedRegion?.id === region.id;
      const isHovered = hoveredRegion?.id === region.id;

      if (isSelected) return null;

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
            zIndex: 2,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRegion(region);
          }}
        />
      );
    });
  };

  // 当前拖拽的区块
  const activeSection = activeSectionId
    ? sections.find((s) => s.id === activeSectionId)
    : null;

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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

        {/* 区块拖拽层 */}
        {isEditing && enableSectionDrag && sections.length > 0 && (
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section) => (
              <SortableSectionOverlay
                key={section.id}
                section={section}
                scale={scale}
                isEditing={isEditing}
                onRegionClick={setSelectedRegion}
              />
            ))}
          </SortableContext>
        )}

        {/* 可编辑区域覆盖层 */}
        {renderEditableOverlays()}

        {/* 内联编辑器 */}
        {selectedRegion && (
          useRichText ? (
            <InlineRichTextEditor
              region={selectedRegion}
              scale={scale}
              onSave={handleSaveEdit}
              onCancel={() => setSelectedRegion(null)}
            />
          ) : (
            <InlineTextEditor
              region={selectedRegion}
              scale={scale}
              onSave={handleSaveEdit}
              onCancel={() => setSelectedRegion(null)}
            />
          )
        )}

        {/* 编辑模式提示 */}
        {isEditing && (
          <div
            className="absolute top-2 right-2 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg shadow-lg"
            style={{ zIndex: 200 }}
          >
            {enableSectionDrag
              ? '拖拽左侧手柄排序 · 点击文字编辑'
              : useRichText
                ? '点击文字编辑 · 支持加粗、列表'
                : '点击文字进行编辑'}
          </div>
        )}
      </div>

      {/* 拖拽悬浮层 */}
      <DragOverlay>
        {activeSection ? (
          <div
            className="bg-blue-50 border-2 border-blue-400 rounded-lg px-4 py-2 shadow-xl"
            style={{
              width: activeSection.rect.width * scale,
            }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">
                {activeSection.name}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default InteractiveCanvas;
