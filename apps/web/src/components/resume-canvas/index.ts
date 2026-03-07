/**
 * Canvas 简历渲染系统
 * 主入口文件
 */

// 组件
export { ResumeCanvas } from './components/ResumeCanvas';

// 核心
export { LayoutEngine } from './core/layout-engine';
export { TextMeasurer } from './core/text-measurer';

// 导出器
export { PDFExporter } from './exporters/pdf-exporter';

// 模板
export {
  templates,
  templateMap,
  getTemplate,
  getAllTemplates,
  hasTemplate,
  modernTemplate,
} from './templates/template-registry';

// 编辑器
export { TldrawResumeEditor } from './editor/components/TldrawResumeEditor';
export type {
  ResumeContentForEditor,
  ExportOptions,
  TldrawResumeEditorRef
} from './editor/components/TldrawResumeEditor';

// 类型
export type {
  ResumeElementType,
  ContentSourceType,
  TextStyle,
  ContentSource,
  ResumeElementBase,
  ResumeElement,
  TextElement,
  SectionHeaderElement,
  ExperienceCardElement,
  SkillTagsElement,
  EducationElement,
  DividerElement,
  ContainerElement,
  PageData,
  LayoutResult,
  ResumeContent,
  LayoutContext,
} from './types/resume-canvas.types';

export type {
  ColorTheme,
  FontConfig,
  TemplateLayout,
  TemplateStyles,
  ResumeTemplate,
} from './types/template.types';

export { A4_PAGE, COLOR_THEMES, DEFAULT_FONTS } from './types/template.types';
