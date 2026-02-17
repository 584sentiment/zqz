import { Controller, Get, Patch, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
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
}
