import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/database/prisma.service';
import { MailService } from '../mail/mail.service';

interface UserPreferences {
  dailyReminder?: boolean;
  reminderTime?: string; // e.g., "09:00"
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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
   * 发送提醒邮件
   */
  private async sendReminderEmail(
    email: string,
    name: string,
    tasks: Array<{ title: string; type: string; duration: number }>,
  ) {
    const taskList = tasks
      .map((t) => `- ${t.title} (${t.duration}分钟)`)
      .join('\n');

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
