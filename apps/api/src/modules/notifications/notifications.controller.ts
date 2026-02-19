import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  MessageEvent,
  Sse,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Observable, interval, map, switchMap, startWith } from 'rxjs';

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

  // ============== 批量推送功能 ==============

  /**
   * 批量推送消息给指定用户
   */
  @Post('broadcast/users')
  async broadcastToUsers(
    @Body()
    body: {
      userIds: string[];
      type: 'system' | 'business' | 'activity' | 'subscription';
      title: string;
      content: string;
      icon?: string;
      actionUrl?: string;
    },
  ) {
    const result = await this.notificationsService.createBatchNotifications(
      body.userIds,
      {
        type: body.type,
        title: body.title,
        content: body.content,
        icon: body.icon,
        actionType: body.actionUrl ? 'link' : 'none',
        actionUrl: body.actionUrl,
      },
    );
    return {
      success: true,
      sentCount: result.count,
    };
  }

  /**
   * 广播消息给所有用户
   */
  @Post('broadcast/all')
  async broadcastToAll(
    @Body()
    body: {
      type: 'system' | 'business' | 'activity' | 'subscription';
      title: string;
      content: string;
      icon?: string;
      actionUrl?: string;
    },
  ) {
    const result = await this.notificationsService.broadcastToAllUsers({
      type: body.type,
      title: body.title,
      content: body.content,
      icon: body.icon,
      actionType: body.actionUrl ? 'link' : 'none',
      actionUrl: body.actionUrl,
    });
    return {
      success: true,
      sentCount: result.count,
    };
  }

  /**
   * 获取广播统计信息
   */
  @Get('broadcast/stats')
  async getBroadcastStats() {
    return this.notificationsService.getBroadcastStats();
  }

  // ============== 消息模板管理 ==============

  /**
   * 获取所有模板
   */
  @Get('templates')
  async getTemplates(@Query('type') type?: string) {
    return this.notificationsService.getTemplates(type);
  }

  /**
   * 获取单个模板
   */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.notificationsService.getTemplate(id);
  }

  /**
   * 创建模板
   */
  @Post('templates')
  async createTemplate(
    @Body()
    body: {
      code: string;
      name: string;
      type: 'system' | 'business' | 'activity' | 'subscription';
      title: string;
      content: string;
      icon?: string;
      actionType?: string;
      actionUrl?: string;
    },
  ) {
    return this.notificationsService.createTemplate(body);
  }

  /**
   * 更新模板
   */
  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      title?: string;
      content?: string;
      icon?: string;
      actionType?: string;
      actionUrl?: string;
      isActive?: boolean;
    },
  ) {
    return this.notificationsService.updateTemplate(id, body);
  }

  /**
   * 删除模板
   */
  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    await this.notificationsService.deleteTemplate(id);
    return { success: true };
  }

  /**
   * 使用模板发送消息
   */
  @Post('templates/:code/send')
  async sendFromTemplate(
    @Param('code') code: string,
    @Body()
    body: {
      userIds?: string[];
      all?: boolean;
      variables?: Record<string, string>;
    },
  ) {
    const result = await this.notificationsService.sendFromTemplate(
      code,
      body.userIds,
      body.all,
      body.variables,
    );
    return {
      success: true,
      sentCount: result.count,
    };
  }

  // ============== 实时推送 (SSE) ==============

  /**
   * SSE 实时消息推送
   * 前端通过 EventSource 连接此端点，实时接收未读消息数量变化
   */
  @Sse('stream')
  async notificationStream(
    @Req() req: { user: { id: string } },
  ): Promise<Observable<MessageEvent>> {
    const userId = req.user.id;

    // 每 30 秒推送一次未读数量
    return interval(30000).pipe(
      startWith(0),
      switchMap(async () => {
        const count = await this.notificationsService.getUnreadCount(userId);
        const latestNotification = await this.notificationsService.getLatestUnread(userId);
        return {
          unreadCount: count,
          latestNotification,
        };
      }),
      map((data) => ({
        data: JSON.stringify(data),
      } as MessageEvent)),
    );
  }

  /**
   * 获取最新未读消息（用于 SSE 推送）
   */
  @Get('latest-unread')
  async getLatestUnread(@Req() req: { user: { id: string } }) {
    const notification = await this.notificationsService.getLatestUnread(req.user.id);
    return { notification };
  }
}
