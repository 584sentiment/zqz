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

// 进行中的面试（包含进度信息）
export interface InProgressInterview extends Interview {
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
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

// 面试准备计划相关类型
export interface PreparationTask {
  id: string;
  title: string;
  duration: number;
  type: string;
  completed: boolean;
}

export interface DailyPlan {
  day: number;
  date: string;
  focusArea: string;
  tasks: PreparationTask[];
  totalDuration: number;
  completedCount: number;
  totalTasks: number;
}

export interface PreparationPlan {
  id: string;
  type: string;
  status: string;
  jobContext: Record<string, unknown> | null;
  questions: DailyPlan[];
  createdAt: string;
  progress: number;
}

export interface PreparationPlanListItem {
  id: string;
  jobContext: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  progress: number;
}

// 面试题库相关类型
export interface QuestionBankItem {
  id: string;
  category: string;
  type: string;
  difficulty: string;
  question: string;
  tags: string[];
  keypoints: string[];
  referenceAnswer: string;
}

export interface QuestionBankListResponse {
  data: QuestionBankItem[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

// 预测面试题相关类型
export interface PredictedQuestion {
  id: string;
  type: string;
  category: string;
  question: string;
  keypoints: string[];
  difficulty: string;
  source: string;
}

export interface PredictedQuestionsResponse {
  jobId: string;
  jobTitle: string;
  company: string;
  questions: PredictedQuestion[];
  generatedAt: string;
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

  async getInProgress(): Promise<InProgressInterview | null> {
    const response = await apiClient.get<InProgressInterview | null>('/interviews/in-progress');
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

  // 面试准备计划
  async getPreparationPlans(): Promise<PreparationPlanListItem[]> {
    const response = await apiClient.get<PreparationPlanListItem[]>('/interviews/preparations');
    return response.data;
  },

  async getPreparationPlan(id: string): Promise<PreparationPlan> {
    const response = await apiClient.get<PreparationPlan>(`/interviews/preparations/${id}`);
    return response.data;
  },

  async createPreparationPlan(data: {
    jobId?: string;
    days: number;
    focusAreas?: string[];
  }): Promise<PreparationPlan> {
    const response = await apiClient.post<PreparationPlan>('/interviews/preparations', data);
    return response.data;
  },

  async completePreparationTask(
    planId: string,
    data: { dayIndex: number; taskId: string }
  ): Promise<PreparationPlan> {
    const response = await apiClient.post<PreparationPlan>(
      `/interviews/preparations/${planId}/complete`,
      data
    );
    return response.data;
  },

  async deletePreparationPlan(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/interviews/preparations/${id}`
    );
    return response.data;
  },

  // 面试题库
  async getQuestionBank(params?: {
    category?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<QuestionBankListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    const response = await apiClient.get<QuestionBankListResponse>(
      `/interviews/questions${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  async getQuestionDetail(questionId: string): Promise<QuestionBankItem> {
    const response = await apiClient.get<QuestionBankItem>(
      `/interviews/questions/${questionId}`
    );
    return response.data;
  },

  // 预测面试题
  async predictQuestions(jobId: string): Promise<PredictedQuestionsResponse> {
    const response = await apiClient.post<PredictedQuestionsResponse>(
      '/interviews/predict-questions',
      { jobId }
    );
    return response.data;
  },
};
