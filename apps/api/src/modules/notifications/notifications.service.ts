import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/database/prisma.service';
import { MailService } from '../mail/mail.service';
import { Prisma } from '@prisma/client';

interface UserPreferences {
  dailyReminder?: boolean;
  reminderTime?: string; // e.g., "09:00"
  systemEnabled?: boolean;
  businessEnabled?: boolean;
  activityEnabled?: boolean;
  subscriptionEnabled?: boolean;
}

interface DailyTask {
  day: number;
  date: string;
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    type: string;
    duration: number;
  }>;
  focusArea: string;
}

export interface CreateNotificationDto {
  userId: string;
  type: 'system' | 'business' | 'activity' | 'subscription';
  title: string;
  content: string;
  icon?: string;
  actionType?: 'link' | 'modal' | 'none';
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ============== 消息管理 API ==============

  /**
   * 获取消息列表
   */
  async getNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      unreadOnly?: boolean;
    },
  ) {
    const { page = 1, limit = 20, type, unreadOnly } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(type && type !== 'all' && { type }),
      ...(unreadOnly && { isRead: false }),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        hasMore: skip + data.length < total,
      },
      unreadCount,
    };
  }

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 获取最新未读消息
   */
  async getLatestUnread(userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        icon: true,
        createdAt: true,
      },
    });

    return notification;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count > 0;
  }

  /**
   * 批量标记已读
   */
  async batchMarkAsRead(
    userId: string,
    options: { ids?: string[]; all?: boolean; type?: string },
  ): Promise<number> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      isRead: false,
    };

    if (options.ids && options.ids.length > 0) {
      where.id = { in: options.ids };
    }

    if (options.type && options.type !== 'all') {
      where.type = options.type;
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * 删除消息
   */
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }

  /**
   * 清空所有已读消息
   */
  async clearReadNotifications(userId: string): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return result.count;
  }

  // ============== 消息创建服务 ==============

  /**
   * 创建消息
   */
  async createNotification(dto: CreateNotificationDto) {
    // 检查用户是否启用了该类型消息
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { preferences: true },
    });

    const preferences = user?.preferences as UserPreferences | null;

    // 根据消息类型检查用户偏好
    if (preferences) {
      const typeEnabledMap: Record<string, boolean | undefined> = {
        system: preferences.systemEnabled,
        business: preferences.businessEnabled,
        activity: preferences.activityEnabled,
        subscription: preferences.subscriptionEnabled,
      };

      // 如果用户明确关闭了该类型消息，则不创建
      if (typeEnabledMap[dto.type] === false) {
        this.logger.debug(`用户已关闭 ${dto.type} 类型消息，跳过创建`);
        return null;
      }
    }

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        icon: dto.icon,
        actionType: dto.actionType,
        actionUrl: dto.actionUrl,
        actionData: dto.actionData as Prisma.JsonObject,
        expiresAt: dto.expiresAt,
      },
    });
  }

  /**
   * 批量创建消息（用于系统广播）
   */
  async createBatchNotifications(
    userIds: string[],
    dto: Omit<CreateNotificationDto, 'userId'>,
  ) {
    const data = userIds.map((userId) => ({
      userId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      icon: dto.icon,
      actionType: dto.actionType,
      actionUrl: dto.actionUrl,
      actionData: dto.actionData as Prisma.JsonObject,
      expiresAt: dto.expiresAt,
    }));

    return this.prisma.notification.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * 广播消息给所有活跃用户
   */
  async broadcastToAllUsers(dto: Omit<CreateNotificationDto, 'userId'>) {
    // 获取所有活跃用户
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);

    // 检查用户消息偏好
    const enabledUserIds: string[] = [];
    const typeKey = `${dto.type}Enabled` as keyof UserPreferences;

    for (const userId of userIds) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });

      const preferences = user?.preferences as UserPreferences | null;

      // 如果用户没有明确关闭该类型消息，则发送
      if (!preferences || preferences[typeKey] !== false) {
        enabledUserIds.push(userId);
      }
    }

    if (enabledUserIds.length === 0) {
      return { count: 0 };
    }

    return this.createBatchNotifications(enabledUserIds, dto);
  }

  /**
   * 获取广播统计信息
   */
  async getBroadcastStats() {
    const [totalUsers, activeUsers, totalNotifications, unreadNotifications] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({
          where: { deletedAt: null, emailVerified: true },
        }),
        this.prisma.notification.count(),
        this.prisma.notification.count({ where: { isRead: false } }),
      ]);

    // 按类型统计
    const byType = await this.prisma.notification.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    return {
      totalUsers,
      activeUsers,
      totalNotifications,
      unreadNotifications,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
    };
  }

  // ============== 消息模板管理 ==============

  /**
   * 获取所有模板
   */
  async getTemplates(type?: string) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个模板
   */
  async getTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('模板不存在');
    }

    return template;
  }

  /**
   * 根据 code 获取模板
   */
  async getTemplateByCode(code: string) {
    return this.prisma.notificationTemplate.findUnique({
      where: { code },
    });
  }

  /**
   * 创建模板
   */
  async createTemplate(dto: {
    code: string;
    name: string;
    type: 'system' | 'business' | 'activity' | 'subscription';
    title: string;
    content: string;
    icon?: string;
    actionType?: string;
    actionUrl?: string;
  }) {
    // 检查 code 是否已存在
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new Error(`模板代码 ${dto.code} 已存在`);
    }

    return this.prisma.notificationTemplate.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        icon: dto.icon,
        actionType: dto.actionType,
        actionUrl: dto.actionUrl,
      },
    });
  }

  /**
   * 更新模板
   */
  async updateTemplate(
    id: string,
    dto: {
      name?: string;
      title?: string;
      content?: string;
      icon?: string;
      actionType?: string;
      actionUrl?: string;
      isActive?: boolean;
    },
  ) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('模板不存在');
    }

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('模板不存在');
    }

    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  /**
   * 使用模板发送消息
   */
  async sendFromTemplate(
    code: string,
    userIds?: string[],
    all = false,
    variables: Record<string, string> = {},
  ) {
    const template = await this.getTemplateByCode(code);

    if (!template || !template.isActive) {
      throw new Error(`模板 ${code} 不存在或已禁用`);
    }

    // 替换变量
    const replaceVariables = (text: string) => {
      let result = text;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return result;
    };

    const title = replaceVariables(template.title);
    const content = replaceVariables(template.content);

    if (all) {
      return this.broadcastToAllUsers({
        type: template.type as 'system' | 'business' | 'activity' | 'subscription',
        title,
        content,
        icon: template.icon || undefined,
        actionType: template.actionType as 'link' | 'modal' | 'none' | undefined,
        actionUrl: template.actionUrl || undefined,
      });
    }

    if (!userIds || userIds.length === 0) {
      throw new Error('请指定目标用户或选择全部用户');
    }

    return this.createBatchNotifications(userIds, {
      type: template.type as 'system' | 'business' | 'activity' | 'subscription',
      title,
      content,
      icon: template.icon || undefined,
      actionType: template.actionType as 'link' | 'modal' | 'none' | undefined,
      actionUrl: template.actionUrl || undefined,
    });
  }

  // ============== 业务消息快捷方法 ==============

  /**
   * 简历生成完成通知
   */
  async notifyResumeCompleted(userId: string, resumeId: string, resumeName: string) {
    return this.createNotification({
      userId,
      type: 'business',
      title: '简历生成完成',
      content: `您的简历「${resumeName}」已生成完成，点击查看详情。`,
      icon: 'FileText',
      actionType: 'link',
      actionUrl: `/dashboard/resumes/${resumeId}`,
    });
  }

  /**
   * 模拟面试完成通知
   */
  async notifyInterviewCompleted(userId: string, interviewId: string, score?: number) {
    const scoreText = score ? `，得分：${score}分` : '';
    return this.createNotification({
      userId,
      type: 'business',
      title: '模拟面试完成',
      content: `您的模拟面试已完成${scoreText}，点击查看详细报告。`,
      icon: 'Video',
      actionType: 'link',
      actionUrl: `/dashboard/interviews/${interviewId}`,
    });
  }

  /**
   * 新设备登录通知
   */
  async notifyNewLogin(userId: string, device: string, location: string) {
    return this.createNotification({
      userId,
      type: 'system',
      title: '新设备登录提醒',
      content: `您的账户在 ${location} 使用 ${device} 登录。如非本人操作，请立即修改密码。`,
      icon: 'Shield',
      actionType: 'link',
      actionUrl: '/dashboard/settings/security',
    });
  }

  /**
   * 订阅即将到期通知
   */
  async notifySubscriptionExpiring(userId: string, days: number) {
    return this.createNotification({
      userId,
      type: 'subscription',
      title: '订阅即将到期',
      content: `您的订阅将于 ${days} 天后到期，续费可继续享受会员权益。`,
      icon: 'Crown',
      actionType: 'link',
      actionUrl: '/dashboard/subscription',
    });
  }

  /**
   * 配额使用提醒
   */
  async notifyQuotaWarning(userId: string, quotaType: string, percentage: number) {
    const quotaNames: Record<string, string> = {
      ai: 'AI 对话',
      resume: '简历生成',
      interview: '模拟面试',
    };
    const name = quotaNames[quotaType] || quotaType;

    return this.createNotification({
      userId,
      type: 'subscription',
      title: '配额使用提醒',
      content: `您的 ${name} 配额已使用 ${percentage}%，升级套餐可获得更多配额。`,
      icon: 'AlertTriangle',
      actionType: 'link',
      actionUrl: '/dashboard/subscription/upgrade',
    });
  }

  // ============== 用户设置 ==============

  /**
   * 更新用户提醒设置
   */
  async updateReminderPreference(userId: string, enabled: boolean): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPreferences = (user?.preferences as unknown as UserPreferences) || {};
    const updatedPreferences = {
      ...currentPreferences,
      dailyReminder: enabled,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.parse(JSON.stringify(updatedPreferences)) },
    });
  }

  /**
   * 获取用户提醒设置
   */
  async getReminderPreference(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const preferences = user?.preferences as UserPreferences | null;
    return preferences?.dailyReminder ?? false;
  }

  /**
   * 获取用户消息设置
   */
  async getNotificationSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const preferences = user?.preferences as UserPreferences | null;
    return {
      systemEnabled: preferences?.systemEnabled ?? true,
      businessEnabled: preferences?.businessEnabled ?? true,
      activityEnabled: preferences?.activityEnabled ?? true,
      subscriptionEnabled: preferences?.subscriptionEnabled ?? true,
      dailyReminder: preferences?.dailyReminder ?? false,
    };
  }

  /**
   * 更新用户消息设置
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<{
      systemEnabled: boolean;
      businessEnabled: boolean;
      activityEnabled: boolean;
      subscriptionEnabled: boolean;
      dailyReminder: boolean;
    }>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPreferences = (user?.preferences as unknown as UserPreferences) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...settings,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.parse(JSON.stringify(updatedPreferences)) },
    });

    return this.getNotificationSettings(userId);
  }

  // ============== 定时任务 ==============

  /**
   * 每日早上 9 点发送准备计划提醒
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    timeZone: 'Asia/Shanghai',
  })
  async sendDailyPreparationReminders() {
    this.logger.log('开始发送每日面试准备提醒...');

    try {
      // 获取所有启用了每日提醒的用户
      const users = await this.prisma.user.findMany({
        where: {
          emailVerified: true,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          preferences: true,
          interviews: {
            where: {
              type: 'preparation',
              status: 'in_progress',
            },
          },
        },
      });

      let sentCount = 0;

      for (const user of users) {
        const preferences = user.preferences as UserPreferences | null;

        // 检查用户是否启用了每日提醒
        if (!preferences?.dailyReminder) {
          continue;
        }

        // 检查是否有进行中的准备计划
        if (!user.interviews || user.interviews.length === 0) {
          continue;
        }

        // 获取今天的任务
        const today = new Date().toISOString().split('T')[0];
        let todayTasks: Array<{ title: string; type: string; duration: number }> = [];

        for (const plan of user.interviews) {
          const questions = plan.questions as unknown as DailyTask[];
          if (Array.isArray(questions)) {
            for (const day of questions) {
              if (day.date === today) {
                const incompleteTasks = day.tasks.filter((t) => !t.completed);
                todayTasks = todayTasks.concat(
                  incompleteTasks.map((t) => ({
                    title: t.title,
                    type: t.type,
                    duration: t.duration,
                  })),
                );
              }
            }
          }
        }

        // 如果今天有未完成的任务，发送提醒
        if (todayTasks.length > 0) {
          await this.sendReminderEmail(user.email, user.nickname || '用户', todayTasks);
          sentCount++;
        }
      }

      this.logger.log(`每日提醒发送完成，共发送 ${sentCount} 封邮件`);
    } catch (error) {
      this.logger.error('发送每日提醒失败:', error);
    }
  }

  /**
   * 每天凌晨 2 点清理过期的已读消息
   * 删除 90 天前的已读消息和过期消息
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    timeZone: 'Asia/Shanghai',
  })
  async cleanupOldNotifications() {
    this.logger.log('开始清理过期消息...');

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // 删除 90 天前的已读消息
      const deletedRead = await this.prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      // 删除已过期的消息（无论是否已读）
      const deletedExpired = await this.prisma.notification.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      this.logger.log(
        `清理完成：已删除 ${deletedRead.count} 条已读消息，${deletedExpired.count} 条过期消息`,
      );
    } catch (error) {
      this.logger.error('清理过期消息失败:', error);
    }
  }

  /**
   * 发送提醒邮件
   */
  private async sendReminderEmail(
    email: string,
    name: string,
    tasks: Array<{ title: string; type: string; duration: number }>,
  ) {
    const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);

    const subject = '【智求职】今日面试准备任务提醒';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">智求职</h1>
          <p style="color: #6B7280; margin: 5px 0;">面试准备每日提醒</p>
        </div>

        <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0;">你好，${name}！</h2>
          <p style="color: #4B5563; margin: 0;">
            你今天还有 <strong style="color: #4F46E5;">${tasks.length}</strong> 个面试准备任务待完成，
            预计需要 <strong style="color: #4F46E5;">${totalDuration}</strong> 分钟。
          </p>
        </div>

        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #111827; margin: 0 0 16px 0;">📋 今日待办任务</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${tasks.map((t) => `<li style="margin-bottom: 8px;">${t.title} <span style="color: #9CA3AF;">(${t.duration}分钟)</span></li>`).join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/interviews/preparation"
             style="display: inline-block; background: #4F46E5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            前往完成今日任务
          </a>
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            如不想收到每日提醒，请在「面试准备计划」页面关闭提醒设置。
          </p>
        </div>
      </div>
    `;

    await this.mailService.sendCustomEmail(email, subject, html);
  }

  /**
   * 手动触发提醒（用于测试）
   */
  async triggerReminder(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        preferences: true,
        interviews: {
          where: {
            type: 'preparation',
            status: 'in_progress',
          },
        },
      },
    });

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 获取今天的任务
    const today = new Date().toISOString().split('T')[0];
    let todayTasks: Array<{ title: string; type: string; duration: number }> = [];

    for (const plan of user.interviews) {
      const questions = plan.questions as unknown as DailyTask[];
      if (Array.isArray(questions)) {
        for (const day of questions) {
          if (day.date === today) {
            const incompleteTasks = day.tasks.filter((t) => !t.completed);
            todayTasks = todayTasks.concat(
              incompleteTasks.map((t) => ({
                title: t.title,
                type: t.type,
                duration: t.duration,
              })),
            );
          }
        }
      }
    }

    if (todayTasks.length === 0) {
      return { success: false, message: '今天没有待完成的准备任务' };
    }

    await this.sendReminderEmail(user.email, user.nickname || '用户', todayTasks);
    return { success: true, message: `已发送提醒邮件，包含 ${todayTasks.length} 个待办任务` };
  }
}
