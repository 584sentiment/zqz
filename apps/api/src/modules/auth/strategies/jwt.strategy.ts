import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

/**
 * 从请求中提取 JWT token
 * 优先从 Authorization header 提取，如果没有则从 URL 查询参数 token 提取
 * 这样可以支持 SSE 连接（EventSource 不支持自定义 headers）
 */
const extractJwtFromRequest = (req: Request): string | null => {
  // 首先尝试从 Authorization header 提取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 然后尝试从 URL 查询参数提取（用于 SSE 等不支持 header 的场景）
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
