import { apiClient } from './client';

export interface CreatePaymentResponse {
  orderNo: string;
  amount: number;
  subject: string;
  paymentUrl: string;
  expiredAt: string;
}

export interface PaymentStatus {
  orderNo: string;
  plan: string;
  period: number;
  amount: number;
  status: 'pending' | 'paid' | 'closed';
  subject: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentHistory {
  orderNo: string;
  plan: string;
  period: number;
  amount: number;
  status: 'pending' | 'paid' | 'closed';
  subject: string;
  paidAt: string | null;
  createdAt: string;
}

export const paymentsApi = {
  /**
   * 创建支付订单
   */
  async createPayment(plan: string, period: number = 1): Promise<CreatePaymentResponse> {
    const response = await apiClient.post<CreatePaymentResponse>('/payments/create', {
      plan,
      period,
    });
    return response.data;
  },

  /**
   * 查询订单状态
   */
  async getPaymentStatus(orderNo: string): Promise<PaymentStatus> {
    const response = await apiClient.get<PaymentStatus>(`/payments/status/${orderNo}`);
    return response.data;
  },

  /**
   * 获取订单历史
   */
  async getPaymentHistory(): Promise<PaymentHistory[]> {
    const response = await apiClient.get<PaymentHistory[]>('/payments/history');
    return response.data;
  },
};
