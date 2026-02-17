import { apiClient } from './client';

export interface ReminderSettings {
  dailyReminder: boolean;
}

export interface TriggerReminderResponse {
  success: boolean;
  message: string;
}

export const notificationsApi = {
  /**
   * 获取提醒设置
   */
  async getReminderSettings(): Promise<ReminderSettings> {
    const response = await apiClient.get<ReminderSettings>('/notifications/reminder-settings');
    return response.data;
  },

  /**
   * 更新提醒设置
   */
  async updateReminderSettings(data: ReminderSettings): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/notifications/reminder-settings', data);
    return response.data;
  },

  /**
   * 手动触发提醒（测试用）
   */
  async triggerReminder(): Promise<TriggerReminderResponse> {
    const response = await apiClient.post<TriggerReminderResponse>('/notifications/trigger-reminder');
    return response.data;
  },
};
