import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoginRateLimitGuard {
  private readonly logger = new Logger(LoginRateLimitGuard.name);
  private readonly maxAttempts = 5;
  private readonly lockoutDurationMs = 15 * 60 * 1000; // 15 分钟
  private readonly cleanupIntervalMs = 60 * 1000; // 1 分钟清理一次

  // 内存存储（生产环境应使用 Redis）
  private loginAttempts: Map<
    string,
    { count: number; firstAttemptAt: number; lockedUntil?: number }
  > = new Map();

  constructor() {
    // 定期清理过期记录
    setInterval(() => {
      this.cleanupExpiredRecords();
    }, this.cleanupIntervalMs);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const email = request.body?.email?.toLowerCase();

    if (!email) {
      return true;
    }

    const record = this.loginAttempts.get(email);

    // 检查是否被锁定
    if (record?.lockedUntil && record.lockedUntil > Date.now()) {
      const remainingMs = record.lockedUntil - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      this.logger.warn(`账户 ${email} 被锁定，剩余 ${remainingMinutes} 分钟`);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `登录尝试次数过多，账户已暂时锁定`,
          error: 'Too Many Requests',
          data: {
            locked: true,
            remainingMinutes,
            remainingSeconds: Math.ceil(remainingMs / 1000),
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * 记录登录失败
   * @returns 是否被锁定
   */
  recordFailedAttempt(email: string): {
    locked: boolean;
    remainingAttempts: number;
    remainingMinutes?: number;
  } {
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();
    let record = this.loginAttempts.get(normalizedEmail);

    if (!record || now - record.firstAttemptAt > this.lockoutDurationMs) {
      // 新的计数周期
      record = {
        count: 1,
        firstAttemptAt: now,
      };
      this.loginAttempts.set(normalizedEmail, record);

      return {
        locked: false,
        remainingAttempts: this.maxAttempts - 1,
      };
    }

    record.count++;

    if (record.count >= this.maxAttempts) {
      // 锁定账户
      record.lockedUntil = now + this.lockoutDurationMs;
      this.loginAttempts.set(normalizedEmail, record);

      this.logger.warn(
        `账户 ${normalizedEmail} 因连续登录失败 ${record.count} 次被锁定 15 分钟`,
      );

      return {
        locked: true,
        remainingAttempts: 0,
        remainingMinutes: 15,
      };
    }

    this.loginAttempts.set(normalizedEmail, record);

    return {
      locked: false,
      remainingAttempts: this.maxAttempts - record.count,
    };
  }

  /**
   * 登录成功后清除失败记录
   */
  clearFailedAttempts(email: string): void {
    const normalizedEmail = email.toLowerCase();
    this.loginAttempts.delete(normalizedEmail);
    this.logger.debug(`已清除 ${normalizedEmail} 的登录失败记录`);
  }

  /**
   * 获取当前失败次数
   */
  getFailedAttempts(email: string): number {
    const normalizedEmail = email.toLowerCase();
    const record = this.loginAttempts.get(normalizedEmail);

    if (!record || Date.now() - record.firstAttemptAt > this.lockoutDurationMs) {
      return 0;
    }

    return record.count;
  }

  /**
   * 清理过期记录
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [email, record] of this.loginAttempts.entries()) {
      // 清理锁定已过期且超过锁定期的记录
      if (
        (record.lockedUntil && record.lockedUntil < now) ||
        now - record.firstAttemptAt > this.lockoutDurationMs * 2
      ) {
        this.loginAttempts.delete(email);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`清理了 ${cleaned} 条过期的登录记录`);
    }
  }
}
