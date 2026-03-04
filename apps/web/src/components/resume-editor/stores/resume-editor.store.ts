/**
 * 简历编辑器状态管理
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  DraggableSection,
  SectionData,
  AISuggestion,
} from '../types/editor.types';

const MAX_HISTORY = 50;

const DEFAULT_SECTIONS: DraggableSection[] = [
  { id: 'header', type: 'header', name: '基本信息', order: 0 },
  { id: 'summary', type: 'summary', name: '个人简介', order: 1 },
  { id: 'experience', type: 'experience', name: '工作经历', order: 2 },
  { id: 'education', type: 'education', name: '教育背景', order: 3 },
  { id: 'skills', type: 'skills', name: '专业技能', order: 4 },
  { id: 'projects', type: 'projects', name: '项目经历', order: 5 },
];

const DEFAULT_SECTION_DATA: SectionData = {
  header: {
    name: '',
    title: '',
    phone: '',
    email: '',
    location: '',
    website: '',
    linkedin: '',
  },
  summary: undefined,
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

interface HistoryState {
  past: SectionData[];
  future: SectionData[];
}

interface EditorState {
  sections: DraggableSection[];
  sectionData: SectionData;
  activeSection: string | null;
  selectedElement: string | null;
  isDragging: boolean;
  history: HistoryState;
  suggestions: Map<string, AISuggestion[]>;
  isGeneratingSuggestion: boolean;
}

interface EditorActions {
  // 区块操作
  reorderSections: (fromIndex: number, toIndex: number) => void;
  toggleSectionCollapse: (sectionId: string) => void;

  // 内容更新
  updateHeader: (data: Partial<NonNullable<SectionData['header']>>) => void;
  updateSummary: (summary: string | undefined) => void;
  updateExperience: (id: string, data: Partial<NonNullable<SectionData['experience']>[number]>) => void;
  addExperience: () => void;
  removeExperience: (id: string) => void;
  updateEducation: (id: string, data: Partial<NonNullable<SectionData['education']>[number]>) => void;
  addEducation: () => void;
  removeEducation: (id: string) => void;
  updateSkills: (skills: string[]) => void;
  updateProjects: (id: string, data: Partial<NonNullable<SectionData['projects']>[number]>) => void;
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

type StoreState = EditorState & EditorActions;

// 保存历史快照
function pushHistorySnapshot(
  state: EditorState,
  snapshot: SectionData
): HistoryState {
  const newPast = [...state.history.past, snapshot].slice(-MAX_HISTORY);
  return {
    past: newPast,
    future: [],
  };
}

export const useResumeEditorStore = create<StoreState>()(
  immer((set, get) => ({
    // 初始状态
    sections: DEFAULT_SECTIONS,
    sectionData: DEFAULT_SECTION_DATA,
    activeSection: null,
    selectedElement: null,
    isDragging: false,
    history: {
      past: [],
      future: [],
    },
    suggestions: new Map(),
    isGeneratingSuggestion: false,

    // ===== 区块操作 =====

    reorderSections: (fromIndex, toIndex) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        const sections = [...state.sections];
        const [removed] = sections.splice(fromIndex, 1);
        sections.splice(toIndex, 0, removed);
        sections.forEach((s, i) => {
          s.order = i;
        });
        state.sections = sections;
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    toggleSectionCollapse: (sectionId) => {
      set((state) => {
        const section = state.sections.find((s: DraggableSection) => s.id === sectionId);
        if (section) {
          section.collapsed = !section.collapsed;
        }
      });
    },

    // ===== 内容更新 =====

    updateHeader: (data) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        state.sectionData.header = {
          ...state.sectionData.header,
          ...data,
        } as NonNullable<SectionData['header']>;
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    updateSummary: (summary) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        state.sectionData.summary = summary;
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    updateExperience: (id, data) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        const experiences = state.sectionData.experience;
        if (experiences) {
          const index = experiences.findIndex((e: { id: string }) => e.id === id);
          if (index !== -1) {
            experiences[index] = { ...experiences[index], ...data };
          }
        }
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    addExperience: () => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        if (!state.sectionData.experience) {
          state.sectionData.experience = [];
        }
        state.sectionData.experience.push({
          id: `exp-${Date.now()}`,
          company: '',
          position: '',
          period: '',
          location: '',
          description: '',
          highlights: [],
        });
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    removeExperience: (id) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        if (state.sectionData.experience) {
          state.sectionData.experience = state.sectionData.experience.filter(
            (e: { id: string }) => e.id !== id
          );
        }
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    updateEducation: (id, data) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        const educations = state.sectionData.education;
        if (educations) {
          const index = educations.findIndex((e: { id: string }) => e.id === id);
          if (index !== -1) {
            educations[index] = { ...educations[index], ...data };
          }
        }
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    addEducation: () => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        if (!state.sectionData.education) {
          state.sectionData.education = [];
        }
        state.sectionData.education.push({
          id: `edu-${Date.now()}`,
          school: '',
          major: '',
          degree: '',
          period: '',
          gpa: '',
          honors: [],
        });
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    removeEducation: (id) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        if (state.sectionData.education) {
          state.sectionData.education = state.sectionData.education.filter(
            (e: { id: string }) => e.id !== id
          );
        }
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    updateSkills: (skills) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        state.sectionData.skills = skills;
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    updateProjects: (id, data) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        const projects = state.sectionData.projects;
        if (projects) {
          const index = projects.findIndex((p: { id: string }) => p.id === id);
          if (index !== -1) {
            projects[index] = { ...projects[index], ...data };
          }
        }
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    addProject: () => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        if (!state.sectionData.projects) {
          state.sectionData.projects = [];
        }
        state.sectionData.projects.push({
          id: `proj-${Date.now()}`,
          name: '',
          role: '',
          period: '',
          description: '',
          techStack: [],
          highlights: [],
        });
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    removeProject: (id) => {
      const currentSnapshot = JSON.parse(JSON.stringify(get().sectionData));
      set((state) => {
        if (state.sectionData.projects) {
          state.sectionData.projects = state.sectionData.projects.filter(
            (p: { id: string }) => p.id !== id
          );
        }
        state.history = pushHistorySnapshot(state, currentSnapshot);
      });
    },

    // ===== 历史操作 =====

    undo: () => {
      const { past, future } = get().history;
      if (past.length === 0) return;

      const current = JSON.parse(JSON.stringify(get().sectionData));
      const previous = past[past.length - 1];

      set((state) => {
        state.sectionData = previous;
        state.history = {
          past: past.slice(0, -1),
          future: [current, ...future],
        };
      });
    },

    redo: () => {
      const { past, future } = get().history;
      if (future.length === 0) return;

      const current = JSON.parse(JSON.stringify(get().sectionData));
      const next = future[0];

      set((state) => {
        state.sectionData = next;
        state.history = {
          past: [...past, current],
          future: future.slice(1),
        };
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    clearHistory: () => {
      set((state) => {
        state.history = { past: [], future: [] };
      });
    },

    // ===== AI 建议操作 =====

    setSuggestions: (sectionId, suggestions) => {
      set((state) => {
        state.suggestions.set(sectionId, suggestions);
      });
    },

    applySuggestion: (suggestion) => {
      set((state) => {
        const sectionSuggestions = state.suggestions.get(suggestion.sectionId) || [];
        state.suggestions.set(
          suggestion.sectionId,
          sectionSuggestions.filter((s: AISuggestion) => s.id !== suggestion.id)
        );
      });
    },

    dismissSuggestion: (sectionId, suggestionId) => {
      set((state) => {
        const sectionSuggestions = state.suggestions.get(sectionId) || [];
        state.suggestions.set(
          sectionId,
          sectionSuggestions.filter((s: AISuggestion) => s.id !== suggestionId)
        );
      });
    },

    clearSuggestions: (sectionId) => {
      set((state) => {
        state.suggestions.delete(sectionId);
      });
    },

    // ===== UI 操作 =====

    setActiveSection: (sectionId) => {
      set({ activeSection: sectionId });
    },

    setSelectedElement: (elementId) => {
      set({ selectedElement: elementId });
    },

    setIsDragging: (isDragging) => {
      set({ isDragging });
    },

    // ===== 数据导入导出 =====

    loadData: (data) => {
      set((state) => {
        state.sectionData = data;
        state.history = { past: [], future: [] };
        state.suggestions = new Map();
      });
    },

    getData: () => get().sectionData,

    reset: () => {
      set({
        sections: DEFAULT_SECTIONS,
        sectionData: DEFAULT_SECTION_DATA,
        activeSection: null,
        selectedElement: null,
        isDragging: false,
        history: { past: [], future: [] },
        suggestions: new Map(),
        isGeneratingSuggestion: false,
      });
    },
  }))
);
