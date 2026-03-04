/**
 * 区块拖拽排序组件
 * 使用 @dnd-kit 实现
 */

'use client';

import React from 'react';
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

export interface DraggableSection {
  id: string;
  name: string;
  type: string;
  order: number;
}

interface SortableItemProps {
  section: DraggableSection;
  onToggleVisibility?: (id: string) => void;
  isVisible?: boolean;
}

function SortableItem({ section, onToggleVisibility, isVisible = true }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg ${
        isDragging ? 'shadow-lg' : ''
      } ${!isVisible ? 'opacity-50' : ''}`}
    >
      {/* 拖拽手柄 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* 区块名称 */}
      <span className="flex-1 text-sm font-medium text-gray-700">
        {section.name}
      </span>

      {/* 显示/隐藏切换 */}
      {onToggleVisibility && (
        <button
          onClick={() => onToggleVisibility(section.id)}
          className={`text-xs px-2 py-0.5 rounded ${
            isVisible
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isVisible ? '显示' : '隐藏'}
        </button>
      )}
    </div>
  );
}

interface SectionDragListProps {
  /** 区块列表 */
  sections: DraggableSection[];
  /** 排序变化回调 */
  onReorder: (sections: DraggableSection[]) => void;
  /** 显示/隐藏切换回调 */
  onToggleVisibility?: (id: string) => void;
  /** 隐藏的区块 ID 列表 */
  hiddenSectionIds?: string[];
}

export function SectionDragList({
  sections,
  onReorder,
  onToggleVisibility,
  hiddenSectionIds = [],
}: SectionDragListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex).map(
        (s, i) => ({ ...s, order: i })
      );

      onReorder(newSections);
    }

    setActiveId(null);
  };

  const activeSection = activeId
    ? sections.find((s) => s.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sections.map((section) => (
            <SortableItem
              key={section.id}
              section={section}
              onToggleVisibility={onToggleVisibility}
              isVisible={!hiddenSectionIds.includes(section.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* 拖拽时的悬浮层 */}
      <DragOverlay>
        {activeSection ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg shadow-xl">
            <GripVertical className="w-4 h-4 text-blue-500" />
            <span className="flex-1 text-sm font-medium text-gray-700">
              {activeSection.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default SectionDragList;
