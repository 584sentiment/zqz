import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoginRateLimitGuard } from './login-rate-limit.guard';
import { SecurityService } from '../../security/security.service';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(
    private readonly rateLimitGuard: LoginRateLimitGuard,
    @Inject(forwardRef(() => SecurityService))
    private readonly securityService: SecurityService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 先检查速率限制
    await this.rateLimitGuard.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const email = request.body?.email;

    try {
      const result = (await super.canActivate(context)) as boolean;

      // 登录成功，清除失败记录
      if (email) {
        this.rateLimitGuard.clearFailedAttempts(email);
      }

      return result;
    } catch (error) {
      if (email && error instanceof UnauthorizedException) {
        // 记录登录失败
        const rateLimitResult = this.rateLimitGuard.recordFailedAttempt(email);

        // 记录失败登录到历史（这里我们不知道用户 ID，使用 'unknown'）
        await this.securityService.recordLogin('unknown', 'password', false, request);

        if (rateLimitResult.locked) {
          throw new HttpException(
            {
              statusCode: 429,
              message: '登录尝试次数过多，账户已暂时锁定 15 分钟，请稍后再试',
              error: 'Too Many Requests',
              data: {
                locked: true,
                remainingMinutes: rateLimitResult.remainingMinutes,
              },
            },
            429,
          );
        }

        // 在错误响应中添加剩余尝试次数
        throw new UnauthorizedException({
          statusCode: 401,
          message: '邮箱或密码错误',
          error: 'Unauthorized',
          data: {
            remainingAttempts: rateLimitResult.remainingAttempts,
          },
        });
      }

      throw error;
    }
  }
}
