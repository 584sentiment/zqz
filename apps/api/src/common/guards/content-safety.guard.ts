import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { ContentSafetyService } from '@ai-job-assistant/ai';

/**
 * 内容安全守卫
 * 检查请求中的内容是否包含敏感信息
 */
@Injectable()
export class ContentSafetyGuard implements CanActivate {
  private readonly contentSafetyService = new ContentSafetyService();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // 提取需要检查的内容字段
    const contentToCheck = this.extractContent(body);

    if (!contentToCheck) {
      return true;
    }

    // 检查内容安全性
    const result = this.contentSafetyService.checkContent(contentToCheck);

    // 严重程度为 high 或 critical 时拒绝请求
    if (result.severity === 'high' || result.severity === 'critical') {
      throw new BadRequestException({
        message: '内容包含敏感信息，请修改后再提交',
        code: 'CONTENT_UNSAFE',
        details: {
          severity: result.severity,
          categories: result.categories,
          suggestion: result.suggestion,
        },
      });
    }

    // 对于中等风险，记录日志但允许通过
    if (result.severity === 'medium') {
      console.warn('[ContentSafety] Medium risk content detected:', {
        categories: result.categories,
        path: request.path,
      });
    }

    return true;
  }

  /**
   * 从请求体中提取需要检查的内容
   */
  private extractContent(body: Record<string, unknown>): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    // 定义需要检查的字段
    const fieldsToCheck = [
      'content',
      'message',
      'description',
      'text',
      'answer',
      'question',
      'jobDescription',
      'userProfile',
      'jobInfo',
      'resumeSummary',
      'note',
      'comment',
      'feedback',
    ];

    const contents: string[] = [];

    for (const field of fieldsToCheck) {
      if (body[field] && typeof body[field] === 'string') {
        contents.push(body[field] as string);
      }
    }

    return contents.length > 0 ? contents.join(' ') : null;
  }
}
