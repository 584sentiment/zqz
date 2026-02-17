import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 获取提醒设置
   */
  @Get('reminder-settings')
  async getReminderSettings(@Req() req: { user: { id: string } }) {
    const dailyReminder = await this.notificationsService.getReminderPreference(req.user.id);
    return { dailyReminder };
  }

  /**
   * 更新提醒设置
   */
  @Post('reminder-settings')
  async updateReminderSettings(
    @Req() req: { user: { id: string } },
    @Body() body: { dailyReminder: boolean },
  ) {
    await this.notificationsService.updateReminderPreference(
      req.user.id,
      body.dailyReminder,
    );
    return { success: true };
  }

  /**
   * 手动触发提醒（测试用）
   */
  @Post('trigger-reminder')
  async triggerReminder(@Req() req: { user: { id: string } }) {
    return this.notificationsService.triggerReminder(req.user.id);
  }
}
