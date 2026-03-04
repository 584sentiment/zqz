/**
 * 简历编辑器主组件
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Undo2, Redo2, Save, Sparkles } from 'lucide-react';

import { useResumeEditorStore } from '../stores/resume-editor.store';
import { EditableSection, ListItem, EmptyState } from './EditableSection';
import { RichTextEditor, SimpleTextInput, TagsInput } from './RichTextEditor';
import type { ResumeEditorProps, SectionData } from '../types/editor.types';

// 工具栏按钮
function ToolbarButton({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 ${
        active
          ? 'bg-blue-100 text-blue-700'
          : disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

// 编辑器工具栏
function EditorToolbar({
  onSave,
  onOptimize,
  isSaving,
}: {
  onSave?: () => void;
  onOptimize?: () => void;
  isSaving?: boolean;
}) {
  const { undo, redo, canUndo, canRedo } = useResumeEditorStore();

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <ToolbarButton onClick={undo} disabled={!canUndo()} title="撤销 (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
          撤销
        </ToolbarButton>
        <ToolbarButton onClick={redo} disabled={!canRedo()} title="重做 (Ctrl+Shift+Z)">
          <Redo2 className="w-4 h-4" />
          重做
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-2">
        {onOptimize && (
          <ToolbarButton onClick={onOptimize} title="AI 优化">
            <Sparkles className="w-4 h-4" />
            AI 优化
          </ToolbarButton>
        )}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 简历编辑器
 */
export function ResumeEditor({
  initialContent,
  onChange,
  onSave,
  readOnly = false,
  jobDescription,
}: ResumeEditorProps) {
  const {
    sections,
    sectionData,
    reorderSections,
    toggleSectionCollapse,
    loadData,
    getData,
    updateHeader,
    updateSummary,
    addExperience,
    removeExperience,
    updateExperience,
    addEducation,
    removeEducation,
    updateEducation,
    updateSkills,
    addProject,
    removeProject,
    updateProjects,
  } = useResumeEditorStore();

  // 拖拽传感器
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

  // 初始化数据
  useEffect(() => {
    if (initialContent) {
      loadData(initialContent as SectionData);
    }
  }, [initialContent, loadData]);

  // 内容变化回调
  useEffect(() => {
    if (onChange) {
      onChange(getData());
    }
  }, [sectionData, onChange, getData]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = sections.findIndex((s) => s.id === active.id);
        const newIndex = sections.findIndex((s) => s.id === over.id);
        reorderSections(oldIndex, newIndex);
      }
    },
    [sections, reorderSections]
  );

  // 键盘快捷键
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (useResumeEditorStore.getState().canUndo()) {
          useResumeEditorStore.getState().undo();
        }
      }

      if (isMeta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (useResumeEditorStore.getState().canRedo()) {
          useResumeEditorStore.getState().redo();
        }
      }

      if (isMeta && e.key === 's') {
        e.preventDefault();
        onSave?.(getData());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, onSave]);

  return (
    <div className="resume-editor h-full flex flex-col bg-gray-50">
      {/* 工具栏 */}
      {!readOnly && (
        <EditorToolbar
          onSave={onSave ? () => onSave(getData()) : undefined}
        />
      )}

      {/* 编辑区域 */}
      <div className="flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section) => (
              <EditableSection
                key={section.id}
                section={section}
                isCollapsed={section.collapsed}
                onToggleCollapse={() => toggleSectionCollapse(section.id)}
                onAddItem={
                  section.type === 'experience'
                    ? addExperience
                    : section.type === 'education'
                    ? addEducation
                    : section.type === 'projects'
                    ? addProject
                    : undefined
                }
                readOnly={readOnly}
              >
                {/* 根据区块类型渲染不同的编辑内容 */}
                {section.type === 'header' && (
                  <HeaderEditor
                    data={sectionData.header!}
                    onChange={updateHeader}
                    readOnly={readOnly}
                  />
                )}

                {section.type === 'summary' && (
                  <SummaryEditor
                    data={sectionData.summary}
                    onChange={updateSummary}
                    readOnly={readOnly}
                  />
                )}

                {section.type === 'experience' && (
                  <ExperienceEditor
                    data={sectionData.experience || []}
                    onUpdate={updateExperience}
                    onRemove={removeExperience}
                    readOnly={readOnly}
                  />
                )}

                {section.type === 'education' && (
                  <EducationEditor
                    data={sectionData.education || []}
                    onUpdate={updateEducation}
                    onRemove={removeEducation}
                    readOnly={readOnly}
                  />
                )}

                {section.type === 'skills' && (
                  <SkillsEditor
                    data={sectionData.skills || []}
                    onChange={updateSkills}
                    readOnly={readOnly}
                  />
                )}

                {section.type === 'projects' && (
                  <ProjectsEditor
                    data={sectionData.projects || []}
                    onUpdate={updateProjects}
                    onRemove={removeProject}
                    readOnly={readOnly}
                  />
                )}
              </EditableSection>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// ===== 区块编辑器组件 =====

// 头部信息编辑器
function HeaderEditor({
  data,
  onChange,
  readOnly,
}: {
  data: NonNullable<SectionData['header']>;
  onChange: (data: Partial<NonNullable<SectionData['header']>>) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">姓名</label>
        <SimpleTextInput
          value={data.name || ''}
          onChange={(v) => onChange({ name: v })}
          placeholder="您的姓名"
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">职位</label>
        <SimpleTextInput
          value={data.title || ''}
          onChange={(v) => onChange({ title: v })}
          placeholder="目标职位"
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">电话</label>
        <SimpleTextInput
          value={data.phone || ''}
          onChange={(v) => onChange({ phone: v })}
          placeholder="手机号码"
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">邮箱</label>
        <SimpleTextInput
          value={data.email || ''}
          onChange={(v) => onChange({ email: v })}
          placeholder="电子邮箱"
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">所在地</label>
        <SimpleTextInput
          value={data.location || ''}
          onChange={(v) => onChange({ location: v })}
          placeholder="城市"
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">个人网站</label>
        <SimpleTextInput
          value={data.website || ''}
          onChange={(v) => onChange({ website: v })}
          placeholder="https://"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

// 个人简介编辑器
function SummaryEditor({
  data,
  onChange,
  readOnly,
}: {
  data: SectionData['summary'];
  onChange: (summary: string | undefined) => void;
  readOnly: boolean;
}) {
  // 解析 JSON 内容
  const parsedContent = data ? (typeof data === 'string' ? JSON.parse(data) : data) : undefined;

  return (
    <RichTextEditor
      content={parsedContent}
      onChange={(content) => onChange(JSON.stringify(content))}
      placeholder="简要介绍您的专业背景和核心优势..."
      minHeight={100}
      readOnly={readOnly}
    />
  );
}

// 工作经历编辑器
function ExperienceEditor({
  data,
  onUpdate,
  onRemove,
  readOnly,
}: {
  data: NonNullable<SectionData['experience']>;
  onUpdate: (id: string, data: Partial<NonNullable<SectionData['experience']>[0]>) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  if (data.length === 0) {
    return <EmptyState message="暂无工作经历" />;
  }

  return (
    <div className="space-y-4">
      {data.map((exp, index) => (
        <ListItem
          key={exp.id}
          id={exp.id}
          index={index}
          onRemove={() => onRemove(exp.id)}
          readOnly={readOnly}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">公司</label>
                <SimpleTextInput
                  value={exp.company}
                  onChange={(v) => onUpdate(exp.id, { company: v })}
                  placeholder="公司名称"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">职位</label>
                <SimpleTextInput
                  value={exp.position}
                  onChange={(v) => onUpdate(exp.id, { position: v })}
                  placeholder="职位名称"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">时间段</label>
                <SimpleTextInput
                  value={exp.period}
                  onChange={(v) => onUpdate(exp.id, { period: v })}
                  placeholder="2020.01 - 2023.06"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">地点</label>
                <SimpleTextInput
                  value={exp.location || ''}
                  onChange={(v) => onUpdate(exp.id, { location: v })}
                  placeholder="城市"
                  readOnly={readOnly}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">工作描述</label>
              <RichTextEditor
                content={typeof exp.description === 'string' ? undefined : exp.description as any}
                onChange={(content) => onUpdate(exp.id, { description: JSON.stringify(content) as any })}
                placeholder="描述您的主要职责和成就..."
                minHeight={80}
                readOnly={readOnly}
              />
            </div>
          </div>
        </ListItem>
      ))}
    </div>
  );
}

// 教育背景编辑器
function EducationEditor({
  data,
  onUpdate,
  onRemove,
  readOnly,
}: {
  data: NonNullable<SectionData['education']>;
  onUpdate: (id: string, data: Partial<NonNullable<SectionData['education']>[0]>) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  if (data.length === 0) {
    return <EmptyState message="暂无教育背景" />;
  }

  return (
    <div className="space-y-4">
      {data.map((edu, index) => (
        <ListItem
          key={edu.id}
          id={edu.id}
          index={index}
          onRemove={() => onRemove(edu.id)}
          readOnly={readOnly}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">学校</label>
              <SimpleTextInput
                value={edu.school}
                onChange={(v) => onUpdate(edu.id, { school: v })}
                placeholder="学校名称"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">专业</label>
              <SimpleTextInput
                value={edu.major}
                onChange={(v) => onUpdate(edu.id, { major: v })}
                placeholder="专业名称"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">学位</label>
              <SimpleTextInput
                value={edu.degree}
                onChange={(v) => onUpdate(edu.id, { degree: v })}
                placeholder="本科/硕士/博士"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">时间段</label>
              <SimpleTextInput
                value={edu.period}
                onChange={(v) => onUpdate(edu.id, { period: v })}
                placeholder="2016.09 - 2020.06"
                readOnly={readOnly}
              />
            </div>
          </div>
        </ListItem>
      ))}
    </div>
  );
}

// 技能编辑器
function SkillsEditor({
  data,
  onChange,
  readOnly,
}: {
  data: string[];
  onChange: (skills: string[]) => void;
  readOnly: boolean;
}) {
  return (
    <TagsInput
      value={data}
      onChange={onChange}
      placeholder="输入技能后按 Enter 添加"
      readOnly={readOnly}
    />
  );
}

// 项目经历编辑器
function ProjectsEditor({
  data,
  onUpdate,
  onRemove,
  readOnly,
}: {
  data: NonNullable<SectionData['projects']>;
  onUpdate: (id: string, data: Partial<NonNullable<SectionData['projects']>[0]>) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  if (data.length === 0) {
    return <EmptyState message="暂无项目经历" />;
  }

  return (
    <div className="space-y-4">
      {data.map((proj, index) => (
        <ListItem
          key={proj.id}
          id={proj.id}
          index={index}
          onRemove={() => onRemove(proj.id)}
          readOnly={readOnly}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">项目名称</label>
                <SimpleTextInput
                  value={proj.name}
                  onChange={(v) => onUpdate(proj.id, { name: v })}
                  placeholder="项目名称"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">角色</label>
                <SimpleTextInput
                  value={proj.role || ''}
                  onChange={(v) => onUpdate(proj.id, { role: v })}
                  placeholder="您的角色"
                  readOnly={readOnly}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">技术栈</label>
              <TagsInput
                value={proj.techStack || []}
                onChange={(v) => onUpdate(proj.id, { techStack: v })}
                placeholder="输入技术后按 Enter 添加"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">项目描述</label>
              <RichTextEditor
                content={typeof proj.description === 'string' ? undefined : proj.description as any}
                onChange={(content) => onUpdate(proj.id, { description: JSON.stringify(content) as any })}
                placeholder="描述项目背景和您的贡献..."
                minHeight={80}
                readOnly={readOnly}
              />
            </div>
          </div>
        </ListItem>
      ))}
    </div>
  );
}

export default ResumeEditor;
