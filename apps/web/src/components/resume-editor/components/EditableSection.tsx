/**
 * 可编辑区块组件
 * 支持拖拽排序
 */

'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import type { DraggableSection } from '../types/editor.types';

interface EditableSectionProps {
  section: DraggableSection;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddItem?: () => void;
  children: React.ReactNode;
  dragHandle?: boolean;
  readOnly?: boolean;
}

/**
 * 可拖拽区块容器
 */
export function EditableSection({
  section,
  isCollapsed = false,
  onToggleCollapse,
  onAddItem,
  children,
  dragHandle = true,
  readOnly = false,
}: EditableSectionProps) {
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
    zIndex: isDragging ? 10 : undefined,
  };

  const canAddItem = ['experience', 'education', 'projects'].includes(section.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg mb-3 ${
        isDragging ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      {/* 区块头部 */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        {/* 拖拽手柄 */}
        {dragHandle && !readOnly && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* 折叠按钮 */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 p-0.5"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* 区块标题 */}
        <h3 className="flex-1 text-sm font-medium text-gray-800">
          {section.name}
        </h3>

        {/* 操作按钮 */}
        {!readOnly && (
          <div className="flex items-center gap-1">
            {canAddItem && onAddItem && (
              <button
                type="button"
                onClick={onAddItem}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title={`添加${section.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 区块内容 */}
      {!isCollapsed && (
        <div className="p-3">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * 列表项容器（用于经历、教育等可添加多项的区块）
 */
interface ListItemProps {
  id: string;
  index: number;
  onRemove?: () => void;
  children: React.ReactNode;
  readOnly?: boolean;
}

export function ListItem({
  index,
  onRemove,
  children,
  readOnly = false,
}: ListItemProps) {
  return (
    <div className="relative group">
      {/* 序号 */}
      <div className="absolute -left-6 top-3 w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-500 text-xs rounded-full">
        {index + 1}
      </div>

      {/* 内容 */}
      <div className="ml-2 pl-4 border-l-2 border-gray-200 group-hover:border-blue-300 transition-colors">
        {children}
      </div>

      {/* 删除按钮 */}
      {!readOnly && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 top-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * 空状态提示
 */
export function EmptyState({
  message,
  onAdd,
  addLabel = '添加',
}: {
  message: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="text-center py-6 text-gray-400">
      <p className="text-sm mb-2">{message}</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </button>
      )}
    </div>
  );
}

export default EditableSection;
