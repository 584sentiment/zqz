import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '@/modules/subscriptions/subscriptions.service';

export const QUOTA_TYPE_KEY = 'quota_type';
export const RequireQuota = (type: 'ai' | 'resume' | 'interview') =>
  applyDecorators(SetMetadata(QUOTA_TYPE_KEY, type), UseGuards(QuotaGuard));

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaType = this.reflector.getAllAndOverride<'ai' | 'resume' | 'interview'>(
      QUOTA_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!quotaType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return true; // 让认证守卫处理
    }

    const quotaCheck = await this.subscriptionsService.checkQuota(userId, quotaType);

    if (!quotaCheck.available) {
      const quotaNames = {
        ai: 'AI 对话',
        resume: '简历生成',
        interview: '模拟面试',
      };

      throw new ForbiddenException({
        statusCode: 403,
        message: `${quotaNames[quotaType]}配额已用尽`,
        error: 'Quota Exceeded',
        data: {
          quotaType,
          quotaName: quotaNames[quotaType],
          remaining: 0,
          unlimited: false,
          upgradeRequired: true,
        },
      });
    }

    // 将配额信息附加到请求中
    request.quota = quotaCheck;

    return true;
  }
}
