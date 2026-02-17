import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// 套餐定义
export const PLAN_CONFIGS = {
  free: {
    name: '免费版',
    price: 0,
    aiQuota: 10,
    resumeQuota: 3,
    interviewQuota: 1,
    features: ['基础岗位解析', '3份简历/月', '1次模拟面试/月'],
  },
  basic: {
    name: '基础版',
    price: 29,
    aiQuota: 50,
    resumeQuota: 10,
    interviewQuota: 5,
    features: ['高级岗位解析', '10份简历/月', '5次模拟面试/月', 'AI 技能发掘'],
  },
  pro: {
    name: '专业版',
    price: 99,
    aiQuota: -1, // 无限
    resumeQuota: -1,
    interviewQuota: -1,
    features: ['无限 AI 对话', '无限简历生成', '无限模拟面试', '高级模板', '优先客服'],
  },
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户当前订阅信息
   */
  async getSubscription(userId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    // 如果没有订阅，创建一个免费的
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          plan: 'free',
          aiQuota: PLAN_CONFIGS.free.aiQuota,
          resumeQuota: PLAN_CONFIGS.free.resumeQuota,
          interviewQuota: PLAN_CONFIGS.free.interviewQuota,
        },
      });
    }

    // 检查是否需要重置配额（如果 quotaResetAt 是上个月或更早）
    const now = new Date();
    const quotaResetAt = subscription.quotaResetAt;
    const needsReset = this.needsQuotaReset(quotaResetAt, now);

    if (needsReset) {
      await this.resetUserQuota(userId);
      // 重新获取订阅信息
      const updatedSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });
      if (updatedSubscription) {
        subscription = updatedSubscription;
      }
    }

    // 获取当前计费周期的使用情况
    const usageLogs = await this.prisma.usageLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: subscription.quotaResetAt },
      },
      _count: true,
    });

    // 计算已使用量
    const usage = {
      ai: 0,
      resume: 0,
      interview: 0,
    };

    for (const log of usageLogs) {
      if (log.action === 'ai_chat') usage.ai = log._count;
      // 简历配额包含生成和导出
      if (log.action === 'resume_generate' || log.action === 'resume_export') {
        usage.resume += log._count;
      }
      if (log.action === 'interview_mock') usage.interview = log._count;
    }

    // 计算剩余配额
    const planConfig = PLAN_CONFIGS[subscription.plan as keyof typeof PLAN_CONFIGS];

    return {
      plan: subscription.plan,
      planName: planConfig.name,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      canceledAt: subscription.canceledAt,
      autoRenew: subscription.autoRenew,
      quotaResetAt: subscription.quotaResetAt,
      quotas: {
        ai: {
          total: subscription.aiQuota,
          used: usage.ai,
          remaining: subscription.aiQuota === -1 ? -1 : subscription.aiQuota - usage.ai,
          unlimited: subscription.aiQuota === -1,
        },
        resume: {
          total: subscription.resumeQuota,
          used: usage.resume,
          remaining: subscription.resumeQuota === -1 ? -1 : subscription.resumeQuota - usage.resume,
          unlimited: subscription.resumeQuota === -1,
        },
        interview: {
          total: subscription.interviewQuota,
          used: usage.interview,
          remaining: subscription.interviewQuota === -1 ? -1 : subscription.interviewQuota - usage.interview,
          unlimited: subscription.interviewQuota === -1,
        },
      },
      features: planConfig.features,
    };
  }

  /**
   * 获取所有套餐信息
   */
  getPlans() {
    return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
      id: key,
      name: config.name,
      price: config.price,
      aiQuota: config.aiQuota === -1 ? '无限' : config.aiQuota,
      resumeQuota: config.resumeQuota === -1 ? '无限' : config.resumeQuota,
      interviewQuota: config.interviewQuota === -1 ? '无限' : config.interviewQuota,
      features: config.features,
    }));
  }

  /**
   * 记录使用量
   */
  async recordUsage(
    userId: string,
    action: 'ai_chat' | 'resume_generate' | 'resume_export' | 'interview_mock',
    resource?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.usageLog.create({
      data: {
        userId,
        action,
        resource,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  }

  /**
   * 检查配额是否充足
   */
  async checkQuota(
    userId: string,
    type: 'ai' | 'resume' | 'interview',
  ): Promise<{ available: boolean; remaining: number; unlimited: boolean }> {
    const subscription = await this.getSubscription(userId);
    const quota = subscription.quotas[type];

    return {
      available: quota.unlimited || quota.remaining > 0,
      remaining: quota.remaining,
      unlimited: quota.unlimited,
    };
  }

  /**
   * 更新自动续费设置
   */
  async updateAutoRenew(userId: string, autoRenew: boolean) {
    // 获取当前订阅
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('订阅不存在');
    }

    // 只有付费用户才能开启自动续费
    if (autoRenew && subscription.plan === 'free') {
      throw new Error('免费用户无法开启自动续费');
    }

    // 更新自动续费状态
    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: { autoRenew },
    });

    return {
      success: true,
      autoRenew: updated.autoRenew,
    };
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('订阅不存在');
    }

    // 免费用户无需取消
    if (subscription.plan === 'free') {
      throw new Error('免费用户无需取消订阅');
    }

    // 已经取消的
    if (subscription.status === 'canceled') {
      throw new Error('订阅已取消');
    }

    // 更新订阅状态为已取消
    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'canceled',
        autoRenew: false,
        canceledAt: new Date(),
      },
    });

    return {
      success: true,
      status: updated.status,
      canceledAt: updated.canceledAt,
      endDate: updated.endDate,
      message: updated.endDate
        ? `订阅已取消，将在 ${new Date(updated.endDate).toLocaleDateString('zh-CN')} 到期后降级为免费版`
        : '订阅已取消',
    };
  }

  /**
   * 恢复已取消的订阅
   */
  async resumeSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('订阅不存在');
    }

    // 只有已取消的订阅才能恢复
    if (subscription.status !== 'canceled') {
      throw new Error('订阅未取消，无需恢复');
    }

    // 检查是否已过期
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      throw new Error('订阅已过期，无法恢复');
    }

    // 恢复订阅
    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'active',
        autoRenew: true,
        canceledAt: null,
      },
    });

    return {
      success: true,
      status: updated.status,
      autoRenew: updated.autoRenew,
      message: '订阅已恢复',
    };
  }

  /**
   * 检查是否需要重置配额
   * 如果 quotaResetAt 是上个月或更早，需要重置
   */
  private needsQuotaReset(quotaResetAt: Date, now: Date): boolean {
    const resetMonth = quotaResetAt.getMonth();
    const resetYear = quotaResetAt.getFullYear();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 如果年份不同，或者同年但月份不同，需要重置
    return resetYear < currentYear || (resetYear === currentYear && resetMonth < currentMonth);
  }

  /**
   * 重置单个用户的配额
   */
  async resetUserQuota(userId: string): Promise<{ success: boolean; resetAt: Date }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('订阅不存在');
    }

    // 获取套餐配置
    const planConfig = PLAN_CONFIGS[subscription.plan as keyof typeof PLAN_CONFIGS];

    // 重置配额到套餐默认值，并更新重置时间
    const now = new Date();
    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        aiQuota: planConfig.aiQuota,
        resumeQuota: planConfig.resumeQuota,
        interviewQuota: planConfig.interviewQuota,
        quotaResetAt: now,
      },
    });

    this.logger.log(`配额已重置: userId=${userId}, plan=${subscription.plan}, resetAt=${now.toISOString()}`);

    return {
      success: true,
      resetAt: updated.quotaResetAt,
    };
  }

  /**
   * 定时任务：每月 1 日凌晨 0 点重置所有用户配额
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyQuotaReset() {
    this.logger.log('开始执行每月配额重置任务...');

    try {
      // 获取所有活跃订阅
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
        },
        select: {
          userId: true,
          plan: true,
        },
      });

      let resetCount = 0;
      let errorCount = 0;

      for (const sub of subscriptions) {
        try {
          await this.resetUserQuota(sub.userId);
          resetCount++;
        } catch (error) {
          this.logger.error(`重置配额失败: userId=${sub.userId}, error=${error}`);
          errorCount++;
        }
      }

      this.logger.log(`配额重置完成: 成功=${resetCount}, 失败=${errorCount}`);

      return {
        success: true,
        resetCount,
        errorCount,
      };
    } catch (error) {
      this.logger.error('配额重置任务执行失败', error);
      throw error;
    }
  }

  /**
   * 手动触发配额重置（管理员接口）
   */
  async triggerQuotaReset(userId?: string): Promise<{ success: boolean; resetCount: number }> {
    if (userId) {
      // 重置单个用户
      await this.resetUserQuota(userId);
      return { success: true, resetCount: 1 };
    }

    // 重置所有需要重置的用户
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        quotaResetAt: { lt: currentMonthStart },
      },
      select: { userId: true },
    });

    let resetCount = 0;
    for (const sub of subscriptions) {
      try {
        await this.resetUserQuota(sub.userId);
        resetCount++;
      } catch {
        // 忽略单个错误，继续处理其他用户
      }
    }

    return { success: true, resetCount };
  }
}
