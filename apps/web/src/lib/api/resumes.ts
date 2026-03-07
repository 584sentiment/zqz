import { apiClient } from './client';

export interface Resume {
  id: string;
  userId: string;
  jobId: string | null;
  name: string;
  templateId: string;
  language: string;
  content: Record<string, unknown> | null;
  fileUrl: string | null;
  status: string;
  matchScore: number | null;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string | null;
    company: string | null;
  };
}

export interface ResumeTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  isPremium: boolean;
}

export interface MatchAnalysis {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  breakdown: {
    skills: { score: number; details: string };
    experience: { score: number; details: string };
    education: { score: number; details: string };
    overall: { score: number; details: string };
  };
}

export interface PdfExportResult {
  html: string;
  filename: string;
}

export interface WordExportResult {
  html: string;
  filename: string;
}

export interface ResumeVersion {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
}

export interface ResumeVersionDetail extends ResumeVersion {
  content: Record<string, unknown>;
}

export interface GenerateResult {
  success: boolean;
  content?: Record<string, unknown>;
  matchAnalysis?: {
    score: number;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
  };
  error?: string;
}

// AI 优化相关类型
export interface ResumeSuggestion {
  id: string;
  type: 'grammar' | 'content' | 'keyword' | 'format';
  section: string;
  sectionPath: string;
  original: string;
  suggestion: string;
  reason: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

export interface SectionOptimizeResult {
  optimized: string;
  changes: Array<{
    original: string;
    modified: string;
    reason: string;
  }>;
}

export interface JobKeywordExtraction {
  technicalSkills: string[];
  softSkills: string[];
  requirements: string[];
  responsibilities: string[];
  industry: string;
  experienceLevel: string;
}

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  recommended: string[];
}

// 布局分析相关类型
export interface LayoutOptimizeSuggestion {
  id: string;
  type: 'spacing' | 'alignment' | 'hierarchy' | 'readability' | 'balance';
  targetShapeIds: string[];
  description: string;
  action: {
    type: 'move' | 'resize' | 'reorder' | 'group';
    params: Record<string, unknown>;
  };
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface LayoutAnalyzeResult {
  score: number;
  suggestions: LayoutOptimizeSuggestion[];
  summary: string;
}

export interface ShapeInfo {
  id: string;
  type: string;
  x: number;
  y: number;
  bounds?: { x: number; y: number; w: number; h: number };
  props?: Record<string, unknown>;
}

export interface TextContent {
  id: string;
  text: string;
  type: string;
}

export const resumesApi = {
  async getList(params?: { jobId?: string; status?: string }): Promise<Resume[]> {
    const searchParams = new URLSearchParams();
    if (params?.jobId) searchParams.set('jobId', params.jobId);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    const response = await apiClient.get<Resume[]>(`/resumes${query ? `?${query}` : ''}`);
    return response.data;
  },

  async getById(id: string): Promise<Resume> {
    const response = await apiClient.get<Resume>(`/resumes/${id}`);
    return response.data;
  },

  async getTemplates(): Promise<ResumeTemplate[]> {
    const response = await apiClient.get<ResumeTemplate[]>('/resumes/templates');
    return response.data;
  },

  async create(data: {
    name: string;
    jobId?: string;
    templateId?: string;
    language?: string;
  }): Promise<Resume> {
    const response = await apiClient.post<Resume>('/resumes', data);
    return response.data;
  },

  async update(id: string, data: Record<string, unknown>): Promise<Resume> {
    const response = await apiClient.put<Resume>(`/resumes/${id}`, data);
    return response.data;
  },

  async duplicate(id: string): Promise<Resume> {
    const response = await apiClient.post<Resume>(`/resumes/${id}/duplicate`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/resumes/${id}`);
  },

  async analyzeMatch(id: string): Promise<MatchAnalysis> {
    const response = await apiClient.get<MatchAnalysis>(`/resumes/${id}/match`);
    return response.data;
  },

  async exportPdf(id: string): Promise<PdfExportResult> {
    const response = await apiClient.get<PdfExportResult>(`/resumes/${id}/export`);
    return response.data;
  },

  async exportWord(id: string): Promise<WordExportResult> {
    const response = await apiClient.get<WordExportResult>(`/resumes/${id}/export-word`);
    return response.data;
  },

  async getVersionHistory(id: string): Promise<ResumeVersion[]> {
    const response = await apiClient.get<ResumeVersion[]>(`/resumes/${id}/versions`);
    return response.data;
  },

  async getVersion(id: string, versionId: string): Promise<ResumeVersionDetail> {
    const response = await apiClient.get<ResumeVersionDetail>(
      `/resumes/${id}/versions/${versionId}`
    );
    return response.data;
  },

  async restoreVersion(id: string, versionId: string): Promise<Resume> {
    const response = await apiClient.post<Resume>(`/resumes/${id}/versions/${versionId}/restore`);
    return response.data;
  },

  async generate(id: string): Promise<GenerateResult> {
    const response = await apiClient.post<GenerateResult>(`/resumes/${id}/generate`);
    return response.data;
  },

  // 获取优化建议
  async getSuggestions(
    id: string,
    sections?: string[]
  ): Promise<{ suggestions: ResumeSuggestion[] }> {
    const response = await apiClient.post<{ suggestions: ResumeSuggestion[] }>(
      `/resumes/${id}/suggestions`,
      { sections }
    );
    return response.data;
  },

  // 优化指定区块
  async optimizeSection(
    id: string,
    data: {
      sectionType: string;
      content: string;
      style?: 'professional' | 'concise' | 'detailed';
    }
  ): Promise<SectionOptimizeResult> {
    const response = await apiClient.post<SectionOptimizeResult>(
      `/resumes/${id}/optimize-section`,
      data
    );
    return response.data;
  },

  // 获取岗位关键词
  async getJobKeywords(
    id: string
  ): Promise<{ keywords: JobKeywordExtraction | null; skillMatch: SkillMatchResult | null }> {
    const response = await apiClient.get<{
      keywords: JobKeywordExtraction | null;
      skillMatch: SkillMatchResult | null;
    }>(`/resumes/${id}/job-keywords`);
    return response.data;
  },

  // 布局分析
  async analyzeLayout(
    id: string,
    shapes: ShapeInfo[],
    textContent?: TextContent[]
  ): Promise<LayoutAnalyzeResult | null> {
    const response = await apiClient.post<{ success: boolean; data: LayoutAnalyzeResult | null }>(
      `/resume/${id}/analyze-layout`,
      { shapes, textContent }
    );
    return response.data.data;
  },

  // 应用布局优化
  async applyOptimizations(
    id: string,
    suggestions: Array<{
      shapeId: string;
      action: string;
      params: Record<string, unknown>;
    }>
  ): Promise<{ success: boolean; appliedCount: number; errors: string[] }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { appliedCount: number; errors: string[] };
    }>(`/resume/${id}/apply-optimizations`, { suggestions });
    return { ...response.data, ...response.data.data };
  },
};
