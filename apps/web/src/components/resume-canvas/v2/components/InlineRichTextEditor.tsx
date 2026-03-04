/**
 * 内联富文本编辑器
 * 基于 TipTap 实现，用于画布内编辑
 */

'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Check,
  X,
} from 'lucide-react';
import type { EditableRegion } from '../services/interactive-generator';

interface InlineRichTextEditorProps {
  /** 可编辑区域信息 */
  region: EditableRegion;
  /** 缩放比例 */
  scale: number;
  /** 保存回调 */
  onSave: (value: string) => void;
  /** 取消回调 */
  onCancel: () => void;
}

/**
 * 内联富文本编辑器
 */
export function InlineRichTextEditor({
  region,
  scale,
  onSave,
  onCancel,
}: InlineRichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialValue = typeof region.value === 'string'
    ? region.value
    : region.value.join(', ');

  // 判断是否为多行内容
  const isMultiline = initialValue.includes('\n') || initialValue.length > 100;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
    ],
    content: initialValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none',
      },
    },
  });

  // 自动聚焦
  useEffect(() => {
    if (editor) {
      editor.commands.focus('end');
    }
  }, [editor]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, onCancel]);

  // 点击外部保存
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor]);

  const handleSave = useCallback(() => {
    if (editor) {
      const content = editor.getText();
      onSave(content);
    }
  }, [editor, onSave]);

  // 计算编辑器位置和大小
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: region.rect.x * scale,
    top: region.rect.y * scale,
    width: Math.max(region.rect.width * scale, 200),
    minHeight: Math.max(region.rect.height * scale + 40, 80),
    fontSize: region.style.fontSize * scale,
    fontFamily: region.style.fontFamily,
    background: 'white',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
    overflow: 'hidden',
  };

  const toolbarButtonClass = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? 'bg-blue-100 text-blue-600'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`;

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={toolbarButtonClass(editor?.isActive('bold') || false)}
            title="加粗 (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={toolbarButtonClass(editor?.isActive('italic') || false)}
            title="斜体 (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {isMultiline && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={toolbarButtonClass(editor?.isActive('bulletList') || false)}
                title="无序列表"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={toolbarButtonClass(editor?.isActive('orderedList') || false)}
                title="有序列表"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="取消 (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="p-1 rounded text-green-600 hover:text-green-700 hover:bg-green-50"
            title="保存 (Ctrl+Enter)"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div
        className="p-2"
        style={{
          minHeight: (region.rect.height * scale) - 8,
          color: region.style.color,
          fontWeight: region.style.fontWeight as React.CSSProperties['fontWeight'],
          lineHeight: region.style.lineHeight,
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* 提示 */}
      <div className="px-2 py-1 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
        Enter 换行 · Ctrl+Enter 保存 · Esc 取消
      </div>
    </div>
  );
}

export default InlineRichTextEditor;
