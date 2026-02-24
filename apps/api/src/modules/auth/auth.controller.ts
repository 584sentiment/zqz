import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Query, Delete, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { WechatService } from './wechat.service';
import { SecurityService } from '../security/security.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto, DeleteAccountDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private wechatService: WechatService,
    private securityService: SecurityService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Body() body: LoginDto,
  ) {
    // 类型断言获取用户信息
    const user = req.user as { id: string; email: string; nickname: string };

    // 用户已在 LocalAuthGuard 中验证，直接生成令牌
    const tokens = await this.authService.generateTokens(
      user.id,
      user.email,
      body.rememberMe,
    );

    // 记录成功登录
    await this.securityService.recordLogin(user.id, 'password', true, req);
    // 创建会话
    await this.securityService.createSession(user.id, tokens.refreshToken, req);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname,
      },
      tokens,
    };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    // TODO: 实现 logout 逻辑
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = req.user as { id: string };
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.authService.resendVerificationEmail(user.id);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @Req() req: Request,
    @Body() dto: DeleteAccountDto,
  ) {
    const user = req.user as { id: string };
    return this.authService.deleteAccount(user.id, dto.password);
  }

  // ============== GitHub OAuth ==============

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Passport 会自动重定向到 GitHub 授权页面
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.githubLogin(req.user as Parameters<AuthService['githubLogin']>[0]);

      // 记录 GitHub 登录
      await this.securityService.recordLogin(result.user.id, 'github', true, req);
      // 创建会话
      await this.securityService.createSession(result.user.id, result.tokens.refreshToken, req);

      // 将 token 传递给前端（通过 URL 参数或 cookie）
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?` +
        `accessToken=${result.tokens.accessToken}&` +
        `refreshToken=${result.tokens.refreshToken}&` +
        `user=${encodeURIComponent(JSON.stringify(result.user))}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error instanceof Error ? error.message : '登录失败';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  // ============== 微信 OAuth ==============

  /**
   * 获取微信登录二维码
   */
  @Get('wechat/qr')
  async getWechatQrCode() {
    return this.wechatService.getQrCode();
  }

  /**
   * 微信回调处理
   */
  @Get('wechat/callback')
  async wechatCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.wechatService.handleCallback(code, state);

      // 自动确认登录
      const result = await this.wechatService.confirmLogin(state, req);

      // 重定向到前端并携带 token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?` +
        `accessToken=${result.tokens?.accessToken}&` +
        `refreshToken=${result.tokens?.refreshToken}&` +
        `user=${encodeURIComponent(JSON.stringify(result.user))}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error instanceof Error ? error.message : '微信登录失败';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * 轮询微信登录状态
   */
  @Get('wechat/status')
  async getWechatStatus(@Query('state') state: string) {
    return this.wechatService.getStatus(state);
  }
}
