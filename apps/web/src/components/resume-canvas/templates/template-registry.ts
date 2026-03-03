/**
 * 模板注册表
 */

import type { ResumeTemplate } from '../types/template.types';

// 重新导出类型
export type { ResumeTemplate } from '../types/template.types';

// 动态导入模板
let _templates: ResumeTemplate[] | null = null;
let _templateMap: Record<string, ResumeTemplate> | null = null;

async function loadTemplates(): Promise<ResumeTemplate[]> {
  if (_templates) return _templates;

  const [{ modernTemplate }] = await Promise.all([
    import('./modern.template').then((m) => m.modernTemplate),
  ]);

  _templates = [modernTemplate];
  _templateMap = _templates.reduce(
    (acc, template) => {
      acc[template.id] = template;
      return acc;
    },
    {} as Record<string, ResumeTemplate>
  );

  return _templates;
}

/** 所有可用模板（同步版本，需要先调用 loadTemplates） */
export const templates: ResumeTemplate[] = [];

/** 模板映射表（同步版本） */
export const templateMap: Record<string, ResumeTemplate> = {};

/**
 * 获取模板
 */
export function getTemplate(id: string): ResumeTemplate | undefined {
  return templateMap[id];
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): ResumeTemplate[] {
  return templates;
}

/**
 * 检查模板是否存在
 */
export function hasTemplate(id: string): boolean {
  return id in templateMap;
}

// 同步导出模板（用于 SSR）
export { modernTemplate } from './modern.template';
