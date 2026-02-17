import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

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

    // 获取本月使用情况
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageLogs = await this.prisma.usageLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: monthStart },
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
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      autoRenew: subscription.autoRenew,
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
}
