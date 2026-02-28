import { apiClient } from './client';

export interface SkillSession {
  id: string;
  userId: string;
  jobId: string | null;
  status: string;
  discoveredSkills: string[];
  messagesCount: number;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string | null;
    company: string | null;
  };
}

export interface ChatResponse {
  response: string;
  discoveredSkills: string[];
  isComplete: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const skillsApi = {
  async createSession(jobId?: string): Promise<SkillSession> {
    const response = await apiClient.post<SkillSession>('/skills/discovery/sessions', { jobId });
    return response.data;
  },

  async getSessions(status?: string): Promise<SkillSession[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get<SkillSession[]>(`/skills/discovery/sessions${params}`);
    return response.data;
  },

  async getSession(id: string): Promise<SkillSession> {
    const response = await apiClient.get<SkillSession>(`/skills/discovery/sessions/${id}`);
    return response.data;
  },

  async addSkill(sessionId: string, skill: string): Promise<SkillSession> {
    const response = await apiClient.post<SkillSession>(
      `/skills/discovery/sessions/${sessionId}/skills`,
      { skill }
    );
    return response.data;
  },

  async incrementMessage(sessionId: string): Promise<SkillSession> {
    const response = await apiClient.post<SkillSession>(
      `/skills/discovery/sessions/${sessionId}/message`
    );
    return response.data;
  },

  async chat(
    sessionId: string,
    message: string,
    conversationHistory: ChatMessage[]
  ): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>(
      `/skills/discovery/sessions/${sessionId}/chat`,
      { message, conversationHistory }
    );
    return response.data;
  },

  async completeSession(sessionId: string): Promise<SkillSession> {
    const response = await apiClient.post<SkillSession>(
      `/skills/discovery/sessions/${sessionId}/complete`
    );
    return response.data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/skills/discovery/sessions/${sessionId}`);
  },
};
