import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
}
