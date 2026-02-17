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
    const response = await apiClient.get<ResumeVersionDetail>(`/resumes/${id}/versions/${versionId}`);
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
};
