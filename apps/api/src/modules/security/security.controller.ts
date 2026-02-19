import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  /**
   * 获取安全概览
   * GET /security/overview
   */
  @Get('overview')
  async getSecurityOverview(@Req() req: Request & { user: { id: string } }) {
    return this.securityService.getSecurityOverview(req.user.id);
  }

  /**
   * 获取登录历史
   * GET /security/login-history
   */
  @Get('login-history')
  async getLoginHistory(
    @Req() req: Request & { user: { id: string } },
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.securityService.getLoginHistory(req.user.id, limitNum);
  }

  /**
   * 获取活跃会话
   * GET /security/sessions
   */
  @Get('sessions')
  async getActiveSessions(@Req() req: Request & { user: { id: string } }) {
    // 从请求中获取 refresh token (如果有的话)
    const refreshToken = req.headers['x-refresh-token'] as string | undefined;
    return this.securityService.getActiveSessions(req.user.id, refreshToken);
  }

  /**
   * 注销指定会话
   * DELETE /security/sessions/:sessionId
   */
  @Delete('sessions/:sessionId')
  async deleteSession(
    @Req() req: Request & { user: { id: string } },
    @Param('sessionId') sessionId: string,
  ) {
    await this.securityService.deleteSession(req.user.id, sessionId);
    return { success: true, message: '会话已注销' };
  }

  /**
   * 注销其他所有会话
   * DELETE /security/sessions/others
   */
  @Delete('sessions/others/all')
  async deleteOtherSessions(@Req() req: Request & { user: { id: string } }) {
    const refreshToken = req.headers['x-refresh-token'] as string;
    const count = await this.securityService.deleteOtherSessions(
      req.user.id,
      refreshToken,
    );
    return {
      success: true,
      message: `已注销 ${count} 个其他会话`,
      count,
    };
  }
}
