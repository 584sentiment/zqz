import { Controller, Get, Patch, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * 获取当前用户订阅信息
   */
  @Get('me')
  async getMySubscription(@Request() req: { user: { id: string } }) {
    return this.subscriptionsService.getSubscription(req.user.id);
  }

  /**
   * 获取所有可用套餐
   */
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  /**
   * 更新自动续费设置
   */
  @Patch('auto-renew')
  async updateAutoRenew(
    @Request() req: { user: { id: string } },
    @Body() body: { autoRenew: boolean },
  ) {
    if (typeof body.autoRenew !== 'boolean') {
      throw new BadRequestException('autoRenew 必须是布尔值');
    }

    try {
      return await this.subscriptionsService.updateAutoRenew(req.user.id, body.autoRenew);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * 取消订阅
   */
  @Post('cancel')
  async cancelSubscription(@Request() req: { user: { id: string } }) {
    try {
      return await this.subscriptionsService.cancelSubscription(req.user.id);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * 恢复订阅
   */
  @Post('resume')
  async resumeSubscription(@Request() req: { user: { id: string } }) {
    try {
      return await this.subscriptionsService.resumeSubscription(req.user.id);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * 重置配额（手动触发，用于测试或特殊情况）
   */
  @Post('reset-quota')
  async resetQuota(@Request() req: { user: { id: string } }) {
    try {
      const result = await this.subscriptionsService.resetUserQuota(req.user.id);
      return {
        success: true,
        message: '配额已重置',
        resetAt: result.resetAt,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
