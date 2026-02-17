import { apiClient } from './client';

export interface QuotaInfo {
  total: number;
  used: number;
  remaining: number;
  unlimited: boolean;
}

export interface SubscriptionInfo {
  plan: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  canceledAt: string | null;
  autoRenew: boolean;
  quotaResetAt: string;
  quotas: {
    ai: QuotaInfo;
    resume: QuotaInfo;
    interview: QuotaInfo;
  };
  features: string[];
}

export interface PlanInfo {
  id: string;
  name: string;
  price: number;
  aiQuota: number | string;
  resumeQuota: number | string;
  interviewQuota: number | string;
  features: string[];
}

export const subscriptionsApi = {
  async getMySubscription(): Promise<SubscriptionInfo> {
    const response = await apiClient.get<SubscriptionInfo>('/subscriptions/me');
    return response.data;
  },

  async getPlans(): Promise<PlanInfo[]> {
    const response = await apiClient.get<PlanInfo[]>('/subscriptions/plans');
    return response.data;
  },

  async updateAutoRenew(autoRenew: boolean): Promise<{ success: boolean; autoRenew: boolean }> {
    const response = await apiClient.patch<{ success: boolean; autoRenew: boolean }>(
      '/subscriptions/auto-renew',
      { autoRenew },
    );
    return response.data;
  },

  async cancelSubscription(): Promise<{
    success: boolean;
    status: string;
    canceledAt: string | null;
    endDate: string | null;
    message: string;
  }> {
    const response = await apiClient.post('/subscriptions/cancel');
    return response.data;
  },

  async resumeSubscription(): Promise<{
    success: boolean;
    status: string;
    autoRenew: boolean;
    message: string;
  }> {
    const response = await apiClient.post('/subscriptions/resume');
    return response.data;
  },

  async resetQuota(): Promise<{
    success: boolean;
    message: string;
    resetAt: string;
  }> {
    const response = await apiClient.post('/subscriptions/reset-quota');
    return response.data;
  },
};
