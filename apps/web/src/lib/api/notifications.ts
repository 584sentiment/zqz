import { apiClient } from './client';

// ============== 类型定义 ==============

export interface Notification {
  id: string;
  userId: string;
  type: 'system' | 'business' | 'activity' | 'subscription';
  title: string;
  content: string;
  icon: string | null;
  actionType: 'link' | 'modal' | 'none' | null;
  actionUrl: string | null;
  actionData: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

export interface NotificationSettings {
  systemEnabled: boolean;
  businessEnabled: boolean;
  activityEnabled: boolean;
  subscriptionEnabled: boolean;
  dailyReminder: boolean;
}

export interface ReminderSettings {
  dailyReminder: boolean;
}

export interface TriggerReminderResponse {
  success: boolean;
  message: string;
}

// ============== API 客户端 ==============

export const notificationsApi = {
  /**
   * 获取消息列表
   */
  async getList(params?: {
    page?: number;
    limit?: number;
    type?: string;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');

    const query = searchParams.toString();
    const response = await apiClient.get<NotificationListResponse>(
      `/notifications${query ? `?${query}` : ''}`,
    );
    return response.data;
  },

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },

  /**
   * 标记消息为已读
   */
  async markAsRead(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * 批量标记已读
   */
  async batchMarkAsRead(options: {
    ids?: string[];
    all?: boolean;
    type?: string;
  }): Promise<{ success: boolean; count: number }> {
    const response = await apiClient.post<{ success: boolean; count: number }>(
      '/notifications/batch-read',
      options,
    );
    return response.data;
  },

  /**
   * 删除消息
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
    return response.data;
  },

  /**
   * 清空所有已读消息
   */
  async clearRead(): Promise<{ success: boolean; count: number }> {
    const response = await apiClient.delete<{ success: boolean; count: number }>('/notifications/read');
    return response.data;
  },

  /**
   * 获取消息设置
   */
  async getSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get<NotificationSettings>('/notifications/settings');
    return response.data;
  },

  /**
   * 更新消息设置
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await apiClient.patch<NotificationSettings>('/notifications/settings', settings);
    return response.data;
  },

  // ============== 兼容旧 API ==============

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

  /**
   * 获取最新未读消息
   */
  async getLatestUnread(): Promise<{ notification: Notification | null }> {
    const response = await apiClient.get<{ notification: Notification | null }>('/notifications/latest-unread');
    return response.data;
  },

  /**
   * 创建 SSE 连接，实时接收消息通知
   * 返回 EventSource 实例，调用者负责关闭连接
   */
  createNotificationStream(
    onMessage: (data: { unreadCount: number; latestNotification: Notification | null }) => void,
    onError?: (error: Event) => void,
  ): EventSource {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // 由于 SSE 不支持自定义 header，我们需要通过 URL 参数传递 token
    if (!token) {
      throw new Error('未找到认证 token，无法建立 SSE 连接');
    }

    const url = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(url, {
      withCredentials: true, // 携带 cookie
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('解析 SSE 消息失败:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE 连接错误:', error);
      if (onError) {
        onError(error);
      }
    };

    return eventSource;
  },
};

// ============== 辅助函数 ==============

/**
 * 获取消息类型的中文名称
 */
export function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    system: '系统通知',
    business: '业务提醒',
    activity: '活动公告',
    subscription: '订阅消息',
  };
  return labels[type] || type;
}

/**
 * 获取消息类型的颜色
 */
export function getNotificationTypeColor(type: string): string {
  const colors: Record<string, string> = {
    system: 'bg-blue-50 text-blue-600',
    business: 'bg-green-50 text-green-600',
    activity: 'bg-purple-50 text-purple-600',
    subscription: 'bg-yellow-50 text-yellow-600',
  };
  return colors[type] || 'bg-gray-50 text-gray-600';
}

/**
 * 获取消息图标的 Lucide 组件名
 */
export function getNotificationIcon(icon: string | null, type: string): string {
  if (icon) return icon;

  const defaultIcons: Record<string, string> = {
    system: 'Settings',
    business: 'Briefcase',
    activity: 'Gift',
    subscription: 'Crown',
  };
  return defaultIcons[type] || 'Bell';
}

/**
 * 格式化消息时间
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}
