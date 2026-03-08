/**
 * Canvas 简历渲染系统
 * 主入口文件
 */

// ============== 编辑器组件 ==============

export {
  default as TldrawResumeEditor,
  type ResumeContentForEditor,
  type TldrawResumeEditorProps,
  type ExportOptions,
  type TldrawResumeEditorRef,
} from './editor/components/TldrawResumeEditor';

// ============== 旧类型（兼容） ==============

export type {
  ResumeElementType,
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
  LayoutContext as LegacyLayoutContext,
} from './types/resume-canvas.types';

export type {
  ColorTheme,
  FontConfig,
  TemplateLayout,
  TemplateStyles,
  ResumeTemplate,
} from './types/template.types';

export { A4_PAGE, COLOR_THEMES, DEFAULT_FONTS } from './types/template.types';

// ============== 新类型（Canvas Resume） ==============

export {
  // 常量
  A4_SIZE,
  DEFAULT_MARGINS,
  CONTENT_WIDTH,
  // 类型
  type TextAlign,
  type FontSize,
  type TldrawColor,
  type ResumeShapeType,
  type BaseShapeProps,
  type TextShapeProps,
  type SectionTitleShapeProps,
  type DividerShapeProps,
  type TagShapeProps,
  type CardShapeProps,
  type SidebarShapeProps,
  type BannerShapeProps,
  type IconShapeProps,
  type ResumeShape,
  type ResumePage,
  type CanvasResumeMeta,
  type CanvasResume,
  type LegacyResumeContent,
  type ShapeConverter,
  type DocumentConverter,
  type ShapeLayoutResult,
  type LayoutContext,
  // 类型守卫
  isTextShape,
  isSectionTitleShape,
  isDividerShape,
  isTagShape,
  isCardShape,
  isSidebarShape,
  isBannerShape,
  isIconShape,
  // 工厂函数
  createTextShape,
  createSectionTitleShape,
  createDividerShape,
  createTagShape,
  createResumePage,
  createCanvasResume,
} from './types/canvas-resume.types';

// ============== 服务 ==============

export {
  TldrawSnapshotConverter,
  snapshotConverter,
  toTldrawSnapshot,
  fromTldrawSnapshot,
} from './services/tldraw-snapshot-converter';

export {
  TemplateRenderer,
  createTemplateRenderer,
  renderResumeWithTemplate,
} from './services/template-renderer';

// ============== 渲染服务 ==============

export { ResumeRenderer, resumeRenderer, createResumeRenderer } from './services/resume-renderer';

// ============== AI 内容转换器 ==============

export {
  AIContentConverter,
  aiContentConverter,
  createAIContentConverter,
  convertLayoutResumeToCanvas,
  convertLegacyContentToCanvas,
} from './services/ai-content-converter';

// ============== AI 编辑面板 ==============

export {
  default as AIEditorPanel,
  type AIEditAction,
  type AIEditRequest,
  type AIEditResponse,
  type BlockPolishOption,
  type AIEditorPanelProps,
} from './editor/AIEditorPanel';
