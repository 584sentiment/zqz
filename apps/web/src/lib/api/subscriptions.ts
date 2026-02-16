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
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
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
};
