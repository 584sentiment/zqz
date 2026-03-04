/**
 * 简历编辑器模块入口
 */

// 类型导出
export type {
  ResumeSectionType,
  DraggableSection,
  RichTextContent,
  AISuggestionType,
  AISuggestion,
  SectionData,
  ResumeEditorState,
  ResumeEditorActions,
  ResumeEditorProps,
  ToolbarButtonProps,
} from './types/editor.types';

// 组件导出
export { ResumeEditor } from './components/ResumeEditor';
export { EditableSection, ListItem, EmptyState } from './components/EditableSection';
export { RichTextEditor, SimpleTextInput, TagsInput } from './components/RichTextEditor';

// Store 导出
export { useResumeEditorStore } from './stores/resume-editor.store';

// 默认导出
export { ResumeEditor as default } from './components/ResumeEditor';
