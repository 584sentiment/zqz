/**
 * 简历编辑器类型定义
 */

import type { JSONContent } from '@tiptap/react';

/** 编辑器区块类型 */
export type ResumeSectionType =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects';

/** 可拖拽区块 */
export interface DraggableSection {
  id: string;
  type: ResumeSectionType;
  name: string;
  order: number;
  collapsed?: boolean;
}

/** 富文本内容 (TipTap JSON) */
export type RichTextContent = JSONContent;

/** AI 建议类型 */
export type AISuggestionType = 'grammar' | 'content' | 'keyword' | 'format';

/** AI 建议 */
export interface AISuggestion {
  id: string;
  type: AISuggestionType;
  sectionId: string;
  original: string;
  suggestion: string;
  reason: string;
  confidence: number;
  position?: {
    start: number;
    end: number;
  };
}

/** 编辑器区块数据 */
export interface SectionData {
  // 头部信息
  header?: {
    name: string;
    title?: string;
    phone?: string;
    email?: string;
    location?: string;
    website?: string;
    linkedin?: string;
  };

  // 摘要
  summary?: string | RichTextContent;

  // 工作经历
  experience?: Array<{
    id: string;
    company: string;
    position: string;
    period: string;
    location?: string;
    description?: string | RichTextContent;
    highlights?: string[];
  }>;

  // 教育背景
  education?: Array<{
    id: string;
    school: string;
    major: string;
    degree: string;
    period: string;
    gpa?: string;
    honors?: string[];
  }>;

  // 技能
  skills?: string[];

  // 项目经历
  projects?: Array<{
    id: string;
    name: string;
    role?: string;
    period?: string;
    description?: string | RichTextContent;
    techStack?: string[];
    highlights?: string[];
  }>;
}

/** 编辑器状态 */
export interface ResumeEditorState {
  // 区块列表
  sections: DraggableSection[];

  // 区块数据
  sectionData: SectionData;

  // UI 状态
  activeSection: string | null;
  selectedElement: string | null;
  isDragging: boolean;

  // 历史记录
  history: {
    past: SectionData[];
    future: SectionData[];
  };

  // AI 建议
  suggestions: Map<string, AISuggestion[]>;
  isGeneratingSuggestion: boolean;
}

/** 编辑器操作 */
export interface ResumeEditorActions {
  // 区块操作
  reorderSections: (fromIndex: number, toIndex: number) => void;
  toggleSectionCollapse: (sectionId: string) => void;

  // 内容更新
  updateSectionData: <K extends keyof SectionData>(
    key: K,
    data: SectionData[K]
  ) => void;
  updateHeader: (data: Partial<NonNullable<SectionData['header']>>) => void;
  updateExperience: (id: string, data: Partial<NonNullable<SectionData['experience']>[0]>) => void;
  addExperience: () => void;
  removeExperience: (id: string) => void;
  updateEducation: (id: string, data: Partial<NonNullable<SectionData['education']>[0]>) => void;
  addEducation: () => void;
  removeEducation: (id: string) => void;
  updateSkills: (skills: string[]) => void;
  updateSummary: (summary: string | RichTextContent) => void;
  updateProjects: (id: string, data: Partial<NonNullable<SectionData['projects']>[0]>) => void;
  addProject: () => void;
  removeProject: (id: string) => void;

  // 历史操作
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // AI 建议操作
  setSuggestions: (sectionId: string, suggestions: AISuggestion[]) => void;
  applySuggestion: (suggestion: AISuggestion) => void;
  dismissSuggestion: (sectionId: string, suggestionId: string) => void;
  clearSuggestions: (sectionId: string) => void;

  // UI 操作
  setActiveSection: (sectionId: string | null) => void;
  setSelectedElement: (elementId: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;

  // 数据导入导出
  loadData: (data: SectionData) => void;
  getData: () => SectionData;
  reset: () => void;
}

/** 编辑器 Props */
export interface ResumeEditorProps {
  /** 初始内容 */
  initialContent?: SectionData;
  /** 内容变化回调 */
  onChange?: (data: SectionData) => void;
  /** 保存回调 */
  onSave?: (data: SectionData) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 目标岗位描述（用于 AI 建议） */
  jobDescription?: string;
}

/** 工具栏按钮 Props */
export interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}
