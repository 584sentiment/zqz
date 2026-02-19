import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 获取消息列表
   */
  @Get()
  async getNotifications(
    @Req() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getNotifications(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type: type || 'all',
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * 获取未读消息数量
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: { user: { id: string } }) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  /**
   * 获取消息设置
   */
  @Get('settings')
  async getSettings(@Req() req: { user: { id: string } }) {
    return this.notificationsService.getNotificationSettings(req.user.id);
  }

  /**
   * 更新消息设置
   */
  @Patch('settings')
  async updateSettings(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      systemEnabled?: boolean;
      businessEnabled?: boolean;
      activityEnabled?: boolean;
      subscriptionEnabled?: boolean;
      dailyReminder?: boolean;
    },
  ) {
    return this.notificationsService.updateNotificationSettings(req.user.id, body);
  }

  /**
   * 标记消息为已读
   */
  @Patch(':id/read')
  async markAsRead(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const success = await this.notificationsService.markAsRead(req.user.id, id);
    return { success };
  }

  /**
   * 批量标记已读
   */
  @Post('batch-read')
  async batchMarkAsRead(
    @Req() req: { user: { id: string } },
    @Body() body: { ids?: string[]; all?: boolean; type?: string },
  ) {
    const count = await this.notificationsService.batchMarkAsRead(req.user.id, body);
    return { success: true, count };
  }

  /**
   * 删除消息
   */
  @Delete(':id')
  async deleteNotification(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const success = await this.notificationsService.deleteNotification(req.user.id, id);
    return { success };
  }

  /**
   * 清空所有已读消息
   */
  @Delete('read')
  async clearReadNotifications(@Req() req: { user: { id: string } }) {
    const count = await this.notificationsService.clearReadNotifications(req.user.id);
    return { success: true, count };
  }

  // ============== 兼容旧 API ==============

  /**
   * 获取提醒设置（兼容旧版）
   */
  @Get('reminder-settings')
  async getReminderSettings(@Req() req: { user: { id: string } }) {
    const dailyReminder = await this.notificationsService.getReminderPreference(req.user.id);
    return { dailyReminder };
  }

  /**
   * 更新提醒设置（兼容旧版）
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
