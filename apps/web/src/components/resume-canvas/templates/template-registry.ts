/**
 * 模板注册表
 */

import type { ResumeTemplate } from '../types/template.types';

// 重新导出类型
export type { ResumeTemplate } from '../types/template.types';

// 导入所有模板
import { modernTemplate } from './modern.template';
import { classicTemplate } from './classic.template';
import { minimalTemplate } from './minimal.template';
import { creativeTemplate } from './creative.template';

/** 所有可用模板 */
export const templates: ResumeTemplate[] = [
  modernTemplate,
  classicTemplate,
  minimalTemplate,
  creativeTemplate,
];

/** 模板映射表 */
export const templateMap: Record<string, ResumeTemplate> = templates.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<string, ResumeTemplate>
);

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

/**
 * 获取免费模板
 */
export function getFreeTemplates(): ResumeTemplate[] {
  return templates.filter((t) => !t.isPremium);
}

/**
 * 获取高级模板
 */
export function getPremiumTemplates(): ResumeTemplate[] {
  return templates.filter((t) => t.isPremium);
}

// 导出各模板
export { modernTemplate, classicTemplate, minimalTemplate, creativeTemplate };
