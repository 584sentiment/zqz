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
};
