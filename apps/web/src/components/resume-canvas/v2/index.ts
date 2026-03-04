/**
 * LLM 驱动的简历渲染系统 V2
 *
 * 核心理念：
 * 1. 模板 = 样式预设（颜色体系 + 排版体系 + 间距体系 + 装饰体系）
 * 2. LLM 生成结构化绘制指令
 * 3. 绘制引擎执行指令渲染到 Canvas
 *
 * 使用方式：
 * ```tsx
 * import { ResumeRendererV2, getStylePreset } from './resume-canvas/v2';
 *
 * const preset = getStylePreset('modern');
 *
 * <ResumeRendererV2
 *   content={resumeContent}
 *   presetId="modern"
 *   scale={0.8}
 * />
 * ```
 */

// 类型定义
export type {
  // 基础类型
  ColorValue,
  Size,
  Position,
  Rect,
  Spacing,
  BorderRadius,

  // 样式系统
  ColorSystem,
  TypographyLevel,
  TypographySystem,
  SpacingSystem,
  DecorationSystem,
  LayoutConstraints,
  StylePreset,

  // 绘制指令
  BaseDrawCommand,
  RectCommand,
  CircleCommand,
  LineCommand,
  TextCommand,
  TextBlockCommand,
  IconCommand,
  SkillTagCommand,
  DividerCommand,
  ContainerCommand,
  PageCommand,
  DrawCommand,
  RenderPlan,

  // 输入输出
  ResumeContent,
  RenderOptions,
} from './types';

// 样式预设服务
export {
  stylePresets,
  modernPreset,
  classicPreset,
  creativePreset,
  minimalPreset,
  executivePreset,
  getStylePreset,
  getAllStylePresets,
} from './services/style-presets';

// 渲染方案生成器
export {
  RenderPlanGenerator,
  createRenderPlanGenerator,
  RESUME_RENDER_PROMPT,
} from './services/render-plan-generator';

// 本地渲染方案生成器
export {
  LocalRenderPlanGenerator,
  createLocalRenderPlanGenerator,
} from './services/local-render-plan-generator';

// 绘制引擎
export {
  RenderEngine,
  createRenderEngine,
} from './services/render-engine';

// PDF 导出
export {
  exportToPDF,
  downloadPDF,
  createPDFExporter,
} from './services/pdf-exporter';

// 组件
export { ResumeRendererV2 } from './components/ResumeRendererV2';
export { default } from './components/ResumeRendererV2';
