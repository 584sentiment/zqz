import { apiClient } from './client';

export interface Interview {
  id: string;
  userId: string;
  type: string;
  status: string;
  jobContext: Record<string, unknown> | null;
  questions: Record<string, unknown>[];
  transcript: Record<string, unknown> | null;
  report: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewStats {
  total: number;
  completed: number;
  inProgress: number;
  avgScore: number | null;
}

export interface QuestionCategory {
  id: string;
  name: string;
  icon: string;
}

export interface AnswerFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string;
}

export const interviewsApi = {
  async getList(params?: { status?: string; type?: string }): Promise<Interview[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    const query = searchParams.toString();
    const response = await apiClient.get<Interview[]>(`/interviews${query ? `?${query}` : ''}`);
    return response.data;
  },

  async getById(id: string): Promise<Interview> {
    const response = await apiClient.get<Interview>(`/interviews/${id}`);
    return response.data;
  },

  async getStats(): Promise<InterviewStats> {
    const response = await apiClient.get<InterviewStats>('/interviews/stats');
    return response.data;
  },

  async getCategories(): Promise<QuestionCategory[]> {
    const response = await apiClient.get<QuestionCategory[]>('/interviews/categories');
    return response.data;
  },

  async getReport(id: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/interviews/${id}/report`);
    return response.data;
  },

  async create(data: {
    type?: string;
    jobId?: string;
    mode?: string;
    difficulty?: string;
  }): Promise<Interview> {
    const response = await apiClient.post<Interview>('/interviews', data);
    return response.data;
  },

  async start(id: string): Promise<Interview> {
    const response = await apiClient.post<Interview>(`/interviews/${id}/start`);
    return response.data;
  },

  async submitAnswer(
    id: string,
    data: { questionIndex: number; answer: string; duration?: number }
  ): Promise<{
    interview: Interview;
    feedback: AnswerFeedback;
    isCompleted: boolean;
  }> {
    const response = await apiClient.post<{
      interview: Interview;
      feedback: AnswerFeedback;
      isCompleted: boolean;
    }>(`/interviews/${id}/answer`, data);
    return response.data;
  },

  async abort(id: string): Promise<Interview> {
    const response = await apiClient.put<Interview>(`/interviews/${id}/abort`);
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/interviews/${id}`);
    return response.data;
  },
};
