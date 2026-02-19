'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  notificationsApi,
  Notification,
  getNotificationTypeLabel,
  getNotificationTypeColor,
  getNotificationIcon,
  formatNotificationTime,
} from '@/lib/api/notifications';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Settings,
  Loader2,
  Check,
  Trash2,
  Settings as SettingsIcon,
  Briefcase,
  Gift,
  Crown,
  FileText,
  Video,
  Shield,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';

// 图标映射
const iconMap: Record<string, React.ElementType> = {
  Settings: SettingsIcon,
  Briefcase,
  Gift,
  Crown,
  FileText,
  Video,
  Shield,
  AlertTriangle,
  Bell,
};

type FilterType = 'all' | 'unread' | 'system' | 'business' | 'activity' | 'subscription';

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'system', label: '系统通知' },
  { value: 'business', label: '业务提醒' },
  { value: 'activity', label: '活动公告' },
  { value: 'subscription', label: '订阅消息' },
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  });

  // 加载消息列表
  const loadNotifications = useCallback(async (page = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await notificationsApi.getList({
        page,
        limit: 20,
        type: filter === 'unread' ? 'all' : filter,
        unreadOnly: filter === 'unread',
      });

      if (append) {
        setNotifications((prev) => [...prev, ...response.data]);
      } else {
        setNotifications(response.data);
      }

      setPagination(response.pagination);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载消息列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  // 标记消息为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 全部标记已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.batchMarkAsRead({ all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({
        title: '操作成功',
        description: '已将所有消息标记为已读',
      });
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 删除消息
  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast({
        title: '删除成功',
        description: '消息已删除',
      });
    } catch (error) {
      toast({
        title: '删除失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 加载更多
  const handleLoadMore = () => {
    if (!isLoadingMore && pagination.hasMore) {
      loadNotifications(pagination.page + 1, true);
    }
  };

  // 点击消息卡片
  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    // 如果有跳转链接，这里由 Link 组件处理
  };

  // 渲染消息图标
  const renderIcon = (notification: Notification) => {
    const iconName = getNotificationIcon(notification.icon, notification.type);
    const IconComponent = iconMap[iconName] || Bell;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">消息中心</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `有 ${unreadCount} 条未读消息` : '暂无未读消息'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
                全部已读
              </Button>
            )}
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 筛选标签 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
              {option.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 消息列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无消息</h3>
            <p className="text-gray-500 text-sm">
              {filter === 'all'
                ? '当有新消息时，会在这里显示'
                : '当前筛选条件下没有消息'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.actionUrl || '#'}
                onClick={() => handleNotificationClick(notification)}
                className={`block bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                  notification.isRead
                    ? 'border-gray-100'
                    : 'border-primary/20 bg-primary/5'
                }`}
              >
                <div className="p-4 flex gap-4">
                  {/* 未读标记 */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-4 flex-shrink-0" />
                  )}

                  {/* 图标 */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationTypeColor(
                      notification.type,
                    )}`}
                  >
                    {renderIcon(notification)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {notification.content}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getNotificationTypeColor(
                          notification.type,
                        )}`}
                      >
                        {getNotificationTypeLabel(notification.type)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* 加载更多 */}
            {pagination.hasMore && (
              <div className="text-center py-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  加载更多
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 底部提示 */}
        {notifications.length > 0 && !pagination.hasMore && (
          <div className="text-center py-6 text-gray-400 text-sm">
            已显示全部消息
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
