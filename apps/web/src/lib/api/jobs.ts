import { apiClient } from './client';

export interface ParsedJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  experience?: string;
  education?: string;
  requirements: string[];
  niceToHave: string[];
  skills: string[];
  confidence: number;
}

export interface Job {
  id: string;
  userId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  sourceType: string;
  sourceUrl: string | null;
  description: string | null;
  requirements: Record<string, unknown> | null;
  matchScore: number | null;
  matchedSkills: string[];
  status: string;
  notes: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobsListResponse {
  data: Job[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

export interface JobStatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: string;
  createdAt: string;
}

export interface JobStatusStats {
  status: string;
  count: number;
}

export const jobsApi = {
  async parseText(text: string): Promise<ParsedJobResult> {
    const response = await apiClient.post<ParsedJobResult>('/jobs/parse', { text });
    return response.data;
  },

  async parseUrl(url: string): Promise<ParsedJobResult> {
    const response = await apiClient.post<ParsedJobResult>('/jobs/parse-url', { url });
    return response.data;
  },

  async parseImage(imageBase64: string): Promise<ParsedJobResult> {
    const response = await apiClient.post<ParsedJobResult>('/jobs/parse-image', { imageBase64 });
    return response.data;
  },

  async importJob(
    text: string,
    parsedData?: Record<string, unknown>,
    sourceType?: string,
    sourceUrl?: string,
  ): Promise<Job> {
    const response = await apiClient.post<Job>('/jobs/import', {
      text,
      parsedData,
      sourceType,
      sourceUrl,
    });
    return response.data;
  },

  async getList(params?: { status?: string; skip?: number; take?: number; favorites?: boolean }): Promise<JobsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());
    if (params?.favorites) searchParams.set('favorites', 'true');

    const response = await apiClient.get<JobsListResponse>(`/jobs?${searchParams.toString()}`);
    return response.data;
  },

  async getFavorites(): Promise<Job[]> {
    const response = await apiClient.get<Job[]>('/jobs/favorites/list');
    return response.data;
  },

  async toggleFavorite(id: string, favorite?: boolean): Promise<Job> {
    const response = await apiClient.post<Job>(`/jobs/${id}/favorite`, { favorite });
    return response.data;
  },

  async getById(id: string): Promise<Job> {
    const response = await apiClient.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  async update(id: string, data: Partial<Job>): Promise<Job> {
    const response = await apiClient.put<Job>(`/jobs/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/jobs/${id}`);
  },

  // 状态追踪
  async getStatusStats(): Promise<JobStatusStats[]> {
    const response = await apiClient.get<JobStatusStats[]>('/jobs/stats/status');
    return response.data;
  },

  async updateStatus(id: string, status: string, note?: string): Promise<Job> {
    const response = await apiClient.post<Job>(`/jobs/${id}/status`, { status, note });
    return response.data;
  },

  async getStatusHistory(id: string): Promise<JobStatusHistory[]> {
    const response = await apiClient.get<JobStatusHistory[]>(`/jobs/${id}/status/history`);
    return response.data;
  },

  async batchUpdateStatus(jobIds: string[], status: string, note?: string): Promise<Array<{ jobId: string; success: boolean; job?: Job; error?: string }>> {
    const response = await apiClient.post('/jobs/batch/status', { jobIds, status, note });
    return response.data;
  },
};
