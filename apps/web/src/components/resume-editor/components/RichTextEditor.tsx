/**
 * 富文本编辑器组件
 * 基于 TipTap 实现
 */

'use client';

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Type,
} from 'lucide-react';
import type { ToolbarButtonProps } from '../types/editor.types';

// 工具栏按钮
function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// 编辑器工具栏
interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>;
  showHistory?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

function EditorToolbar({
  editor,
  showHistory = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 p-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {/* 格式化按钮 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="加粗 (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* 列表按钮 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      {/* 历史按钮 */}
      {showHistory && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <ToolbarButton
            onClick={() => onUndo?.()}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onRedo?.()}
            disabled={!canRedo}
            title="重做 (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

// 富文本编辑器 Props
export interface RichTextEditorProps {
  /** 初始内容 */
  content: JSONContent | string | undefined;
  /** 内容变化回调 */
  onChange: (content: JSONContent) => void;
  /** 占位文本 */
  placeholder?: string;
  /** 最小高度 */
  minHeight?: number;
  /** 最大字符数 */
  maxLength?: number;
  /** 是否显示字符计数 */
  showCharCount?: boolean;
  /** 是否显示历史按钮 */
  showHistory?: boolean;
  /** 外部撤销函数 */
  onUndo?: () => void;
  /** 外部重做函数 */
  onRedo?: () => void;
  /** 是否可撤销 */
  canUndo?: boolean;
  /** 是否可重做 */
  canRedo?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 获得焦点回调 */
  onFocus?: () => void;
  /** 失去焦点回调 */
  onBlur?: () => void;
}

/**
 * 富文本编辑器
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = '输入内容...',
  minHeight = 80,
  maxLength,
  showCharCount = false,
  showHistory = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  readOnly = false,
  onFocus,
  onBlur,
}: RichTextEditorProps) {
  // 初始化编辑器
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
      Placeholder.configure({
        placeholder,
      }),
      ...(maxLength ? [CharacterCount.configure({ limit: maxLength })] : []),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-3',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // 外部内容更新时同步
  useEffect(() => {
    if (editor && content && !editor.isFocused) {
      const currentContent = editor.getJSON();
      // 只有当内容确实不同时才更新
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content as JSONContent);
      }
    }
  }, [editor, content]);

  return (
    <div className="rich-text-editor border border-gray-200 rounded-lg bg-white">
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          showHistory={showHistory}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      )}
      <EditorContent editor={editor} />
      {showCharCount && editor && (
        <div className="flex justify-end px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
          <Type className="w-3 h-3 mr-1" />
          {editor.storage.characterCount.characters()} 字符
        </div>
      )}
    </div>
  );
}

/**
 * 简单文本输入（单行）
 */
export function SimpleTextInput({
  value,
  onChange,
  placeholder,
  className = '',
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        readOnly ? 'bg-gray-50 cursor-not-allowed' : ''
      } ${className}`}
    />
  );
}

/**
 * 标签输入组件
 */
export function TagsInput({
  value,
  onChange,
  placeholder = '输入后按 Enter 添加',
  readOnly = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
          >
            {tag}
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

export default RichTextEditor;
