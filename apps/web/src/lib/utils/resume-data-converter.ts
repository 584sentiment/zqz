/**
 * 简历数据转换工具
 * 用于 API 数据格式和编辑器 SectionData 格式之间的转换
 */

import type { JSONContent } from '@tiptap/react';

/** 富文本内容 (TipTap JSON) */
export type RichTextContent = JSONContent;

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

/** API 返回的简历内容格式 */
export interface ApiResumeContent {
  name?: string;
  title?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
  };
  summary?: string | { text?: string } | unknown;
  experience?: Array<{
    company: string;
    position: string;
    period: string;
    location?: string;
    description?: string | unknown;
    highlights?: string[];
  }> | { list?: Array<{
    company: string;
    position: string;
    period: string;
    location?: string;
    description?: string | unknown;
    highlights?: string[];
  }> };
  education?: Array<{
    school: string;
    degree: string;
    major: string;
    period: string;
    gpa?: string;
    honors?: string[];
  }> | { list?: Array<{
    school: string;
    degree: string;
    major: string;
    period: string;
    gpa?: string;
    honors?: string[];
  }> };
  skills?: string[] | { list?: string[] };
  projects?: Array<{
    name: string;
    role?: string;
    period?: string;
    description?: string | unknown;
    techStack?: string[];
    highlights?: string[];
  }> | { list?: Array<{
    name: string;
    role?: string;
    period?: string;
    description?: string | unknown;
    techStack?: string[];
    highlights?: string[];
  }> };
  matchedSkills?: string[];
  _meta?: {
    generatedAt?: string;
    aiModel?: string;
    isAIGenerated?: boolean;
  };
}

/**
 * 将 API 数据转换为编辑器 SectionData 格式
 */
export function apiToEditorData(content: Record<string, unknown>): SectionData {
  const data = content as ApiResumeContent;

  // 解析 summary
  let summary: SectionData['summary'] = undefined;
  if (typeof data.summary === 'string') {
    summary = data.summary;
  } else if (data.summary && typeof data.summary === 'object') {
    const summaryObj = data.summary as { text?: string };
    summary = summaryObj.text;
  }

  // 解析 skills
  let skills: SectionData['skills'] = undefined;
  if (Array.isArray(data.skills)) {
    skills = data.skills.filter((s): s is string => typeof s === 'string');
  } else if (data.skills && typeof data.skills === 'object') {
    const skillsObj = data.skills as { list?: unknown[] };
    if (Array.isArray(skillsObj.list)) {
      skills = skillsObj.list.filter((s): s is string => typeof s === 'string');
    }
  }

  // 解析 experience
  let experience: SectionData['experience'] = undefined;
  const expSource = Array.isArray(data.experience)
    ? data.experience
    : (data.experience as { list?: unknown[] })?.list;
  if (Array.isArray(expSource)) {
    experience = expSource.map((exp, index) => {
      const e = exp as {
        company?: string;
        position?: string;
        period?: string;
        location?: string;
        description?: string | unknown;
        highlights?: string[];
      };
      return {
        id: `exp-${index}-${Date.now()}`,
        company: e.company || '',
        position: e.position || '',
        period: e.period || '',
        location: e.location || '',
        description: typeof e.description === 'string' ? e.description : undefined,
        highlights: e.highlights || [],
      };
    });
  }

  // 解析 education
  let education: SectionData['education'] = undefined;
  const eduSource = Array.isArray(data.education)
    ? data.education
    : (data.education as { list?: unknown[] })?.list;
  if (Array.isArray(eduSource)) {
    education = eduSource.map((edu, index) => {
      const e = edu as {
        school?: string;
        degree?: string;
        major?: string;
        period?: string;
        gpa?: string;
        honors?: string[];
      };
      return {
        id: `edu-${index}-${Date.now()}`,
        school: e.school || '',
        degree: e.degree || '',
        major: e.major || '',
        period: e.period || '',
        gpa: e.gpa || '',
        honors: e.honors || [],
      };
    });
  }

  // 解析 projects
  let projects: SectionData['projects'] = undefined;
  const projSource = Array.isArray(data.projects)
    ? data.projects
    : (data.projects as { list?: unknown[] })?.list;
  if (Array.isArray(projSource)) {
    projects = projSource.map((proj, index) => {
      const p = proj as {
        name?: string;
        role?: string;
        period?: string;
        description?: string | unknown;
        techStack?: string[];
        highlights?: string[];
      };
      return {
        id: `proj-${index}-${Date.now()}`,
        name: p.name || '',
        role: p.role || '',
        period: p.period || '',
        description: typeof p.description === 'string' ? p.description : undefined,
        techStack: p.techStack || [],
        highlights: p.highlights || [],
      };
    });
  }

  return {
    header: {
      name: data.name || '',
      title: data.title || '',
      phone: data.contact?.phone || '',
      email: data.contact?.email || '',
      location: data.contact?.location || '',
      website: data.contact?.website || '',
      linkedin: data.contact?.linkedin || '',
    },
    summary,
    experience,
    education,
    skills,
    projects,
  };
}

/**
 * 将编辑器 SectionData 转换回 API 格式
 */
export function editorDataToApi(sectionData: SectionData): Record<string, unknown> {
  // 处理 summary - 转换为字符串
  let summaryText: string | undefined;
  if (sectionData.summary) {
    if (typeof sectionData.summary === 'string') {
      summaryText = sectionData.summary;
    } else {
      // TipTap JSONContent 转换为纯文本
      summaryText = jsonContentToText(sectionData.summary);
    }
  }

  // 处理 experience
  const experience = sectionData.experience?.map((exp) => ({
    company: exp.company,
    position: exp.position,
    period: exp.period,
    location: exp.location,
    description: typeof exp.description === 'string'
      ? exp.description
      : exp.description
      ? jsonContentToText(exp.description)
      : undefined,
    highlights: exp.highlights || [],
  }));

  // 处理 education
  const education = sectionData.education?.map((edu) => ({
    school: edu.school,
    degree: edu.degree,
    major: edu.major,
    period: edu.period,
    gpa: edu.gpa,
    honors: edu.honors || [],
  }));

  // 处理 projects
  const projects = sectionData.projects?.map((proj) => ({
    name: proj.name,
    role: proj.role,
    period: proj.period,
    description: typeof proj.description === 'string'
      ? proj.description
      : proj.description
      ? jsonContentToText(proj.description)
      : undefined,
    techStack: proj.techStack || [],
    highlights: proj.highlights || [],
  }));

  return {
    name: sectionData.header?.name || '',
    title: sectionData.header?.title || '',
    contact: {
      email: sectionData.header?.email || '',
      phone: sectionData.header?.phone || '',
      location: sectionData.header?.location || '',
      website: sectionData.header?.website || '',
      linkedin: sectionData.header?.linkedin || '',
    },
    summary: summaryText,
    experience: experience || [],
    education: education || [],
    skills: sectionData.skills || [],
    projects: projects,
  };
}

/**
 * 将 TipTap JSONContent 转换为纯文本
 */
function jsonContentToText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!content || typeof content !== 'object') {
    return '';
  }

  const node = content as {
    type?: string;
    text?: string;
    content?: unknown[];
  };

  if (node.text) {
    return node.text;
  }

  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map((child) => jsonContentToText(child))
      .join('')
      .trim();
  }

  // 添加段落换行
  if (node.type === 'paragraph') {
    return '\n';
  }

  // 添加列表项标记
  if (node.type === 'listItem') {
    return '• ';
  }

  return '';
}

/**
 * 将 TipTap JSONContent 转换为 highlights 数组
 * 每个段落或列表项成为一个 highlight
 */
export function jsonContentToHighlights(content: unknown): string[] {
  if (typeof content === 'string') {
    // 按换行分割
    return content.split('\n').filter((line) => line.trim().length > 0);
  }

  if (!content || typeof content !== 'object') {
    return [];
  }

  const node = content as {
    type?: string;
    text?: string;
    content?: unknown[];
  };

  const highlights: string[] = [];

  function extractText(n: unknown): void {
    if (!n || typeof n !== 'object') return;

    const node = n as {
      type?: string;
      text?: string;
      content?: unknown[];
    };

    if (node.text) {
      highlights.push(node.text);
      return;
    }

    // 处理段落或列表项
    if (node.type === 'paragraph' || node.type === 'listItem') {
      let text = '';
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          const childNode = child as { text?: string };
          if (childNode.text) {
            text += childNode.text;
          }
        }
      }
      if (text.trim()) {
        highlights.push(text.trim());
      }
      return;
    }

    // 递归处理子节点
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        extractText(child);
      }
    }
  }

  extractText(node);
  return highlights;
}
