import { apiClient } from './client';

// 登录历史记录
export interface LoginHistoryItem {
  id: string;
  loginAt: string;
  loginMethod: string;
  success: boolean;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
}

// 活跃会话
export interface ActiveSession {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

// 安全概览
export interface SecurityOverview {
  activeSessionsCount: number;
  lastLogin: {
    loginAt: string;
    device: string | null;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    location: string | null;
  } | null;
  recentLoginsCount: number;
  suspiciousActivities: number;
}

export const securityApi = {
  /**
   * 获取安全概览
   */
  async getOverview(): Promise<SecurityOverview> {
    const response = await apiClient.get('/security/overview');
    return response.data;
  },

  /**
   * 获取登录历史
   */
  async getLoginHistory(limit?: number): Promise<LoginHistoryItem[]> {
    const params = limit ? { limit } : {};
    const response = await apiClient.get('/security/login-history', { params });
    return response.data;
  },

  /**
   * 获取活跃会话
   */
  async getActiveSessions(): Promise<ActiveSession[]> {
    const response = await apiClient.get('/security/sessions');
    return response.data;
  },

  /**
   * 注销指定会话
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/security/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * 注销其他所有会话
   */
  async deleteOtherSessions(): Promise<{ success: boolean; message: string; count: number }> {
    const response = await apiClient.delete('/security/sessions/others/all');
    return response.data;
  },
};
