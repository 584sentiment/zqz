import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { SecurityService } from '../security/security.service';
import { Request } from 'express';
import {
  WechatUserInfo,
  WechatAccessTokenResponse,
  WechatLoginState,
  WechatQrResponse,
  WechatLoginStatusResponse,
  WechatConfirmResponse,
} from './dto/wechat.dto';

/**
 * 微信扫码登录服务
 *
 * 实现微信开放平台 OAuth 2.0 授权登录流程
 * 文档: https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  // 登录状态存储（生产环境应使用 Redis）
  private readonly loginStates = new Map<string, WechatLoginState>();

  // 配置常量
  private readonly STATE_EXPIRY_MS = 5 * 60 * 1000; // 5 分钟
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // 1 分钟清理一次
  private readonly WECHAT_AUTH_URL = 'https://open.weixin.qq.com/connect/qrconnect';
  private readonly WECHAT_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
  private readonly WECHAT_USER_INFO_URL = 'https://api.weixin.qq.com/sns/userinfo';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
    private readonly securityService: SecurityService,
  ) {
    // 启动定时清理过期状态
    setInterval(() => this.cleanupExpiredStates(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * 生成微信授权 URL（二维码链接）
   * @returns 二维码 URL 和 state
   */
  getQrCode(): WechatQrResponse {
    const appId = this.configService.get<string>('WECHAT_APPID');
    const redirectUri = this.configService.get<string>('WECHAT_REDIRECT_URI');

    if (!appId || !redirectUri) {
      throw new BadRequestException('微信配置未完成，请联系管理员');
    }

    // 生成随机 state 用于防止 CSRF 攻击
    const state = this.generateState();

    // 存储初始状态
    const now = Date.now();
    this.loginStates.set(state, {
      status: 'pending',
      expiresAt: now + this.STATE_EXPIRY_MS,
      createdAt: now,
    });

    // 构建微信授权 URL
    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state: state,
    });

    const qrUrl = `${this.WECHAT_AUTH_URL}?${params.toString()}#wechat_redirect`;

    this.logger.log(`生成微信登录二维码: state=${state}`);

    return {
      qrUrl,
      state,
      expiresIn: Math.floor(this.STATE_EXPIRY_MS / 1000),
    };
  }

  /**
   * 处理微信回调
   * 微信回调后，用户已扫码，但尚未确认登录
   */
  async handleCallback(code: string, state: string): Promise<void> {
    const loginState = this.loginStates.get(state);

    // 验证 state
    if (!loginState) {
      throw new BadRequestException('无效的登录状态，请重新扫码');
    }

    // 检查是否已过期
    if (Date.now() > loginState.expiresAt) {
      this.loginStates.delete(state);
      throw new BadRequestException('登录已过期，请重新扫码');
    }

    // 如果已经处理过，直接返回
    if (loginState.status !== 'pending') {
      this.logger.warn(`重复回调: state=${state}, currentStatus=${loginState.status}`);
      return;
    }

    try {
      // 获取 access_token
      const tokenResponse = await this.getAccessToken(code);

      if (tokenResponse.errcode) {
        throw new BadRequestException(`微信授权失败: ${tokenResponse.errmsg}`);
      }

      // 获取用户信息
      const userInfo = await this.getUserInfo(
        tokenResponse.access_token,
        tokenResponse.openid,
      );

      // 更新状态为已扫码
      this.loginStates.set(state, {
        ...loginState,
        status: 'scanned',
        userInfo,
      });

      this.logger.log(`微信扫码成功: state=${state}, openid=${userInfo.openid}, nickname=${userInfo.nickname}`);
    } catch (error) {
      this.logger.error(`处理微信回调失败: ${error}`);
      this.loginStates.delete(state);
      throw error;
    }
  }

  /**
   * 获取登录状态（轮询接口）
   */
  getStatus(state: string): WechatLoginStatusResponse {
    const loginState = this.loginStates.get(state);

    if (!loginState) {
      return { status: 'expired' };
    }

    // 检查是否过期
    if (Date.now() > loginState.expiresAt) {
      this.loginStates.delete(state);
      return { status: 'expired' };
    }

    const response: WechatLoginStatusResponse = {
      status: loginState.status,
    };

    // 如果已确认登录，返回用户和 token 信息
    if (loginState.status === 'confirmed') {
      response.user = loginState.user;
      response.tokens = loginState.tokens;
    }

    return response;
  }

  /**
   * 确认登录（用户扫码后自动触发或手动确认）
   */
  async confirmLogin(state: string, req: Request): Promise<WechatConfirmResponse> {
    const loginState = this.loginStates.get(state);

    // 验证状态
    if (!loginState) {
      throw new BadRequestException('无效的登录状态，请重新扫码');
    }

    if (loginState.status === 'expired' || Date.now() > loginState.expiresAt) {
      this.loginStates.delete(state);
      throw new BadRequestException('登录已过期，请重新扫码');
    }

    if (loginState.status !== 'scanned') {
      throw new BadRequestException('请先扫描二维码');
    }

    if (!loginState.userInfo) {
      throw new BadRequestException('用户信息获取失败，请重新扫码');
    }

    try {
      // 调用 AuthService 完成登录
      const result = await this.authService.wechatLogin(loginState.userInfo);

      // 记录登录历史
      await this.securityService.recordLogin(result.user.id, 'wechat', true, req);

      // 创建会话
      await this.securityService.createSession(result.user.id, result.tokens.refreshToken, req);

      // 构建用户信息
      const userResponse = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || '',
        avatarUrl: result.user.avatarUrl || '',
        emailVerified: result.user.emailVerified,
      };

      // 更新状态
      const confirmedState: WechatLoginState = {
        ...loginState,
        status: 'confirmed',
        user: userResponse,
        tokens: result.tokens,
      };
      this.loginStates.set(state, confirmedState);

      this.logger.log(`微信登录成功: userId=${result.user.id}, state=${state}`);

      // 延迟删除状态（给前端时间获取）
      setTimeout(() => {
        this.loginStates.delete(state);
      }, 30000); // 30 秒后删除

      return {
        success: true,
        user: userResponse,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
        },
      };
    } catch (error) {
      this.logger.error(`确认微信登录失败: ${error}`);
      throw new BadRequestException('登录失败，请重试');
    }
  }

  /**
   * 用授权码换取 access_token
   */
  private async getAccessToken(code: string): Promise<WechatAccessTokenResponse> {
    const appId = this.configService.get<string>('WECHAT_APPID');
    const appSecret = this.configService.get<string>('WECHAT_SECRET');

    if (!appId || !appSecret) {
      throw new BadRequestException('微信配置未完成');
    }

    const params = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      code: code,
      grant_type: 'authorization_code',
    });

    const url = `${this.WECHAT_ACCESS_TOKEN_URL}?${params.toString()}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<WechatAccessTokenResponse>(url),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`获取微信 access_token 失败: ${error}`);
      throw new BadRequestException('微信授权失败');
    }
  }

  /**
   * 获取用户信息
   */
  private async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid: openid,
    });

    const url = `${this.WECHAT_USER_INFO_URL}?${params.toString()}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<WechatUserInfo>(url),
      );

      // 检查错误
      const data = response.data as unknown as { errcode?: number; errmsg?: string };
      if (data.errcode) {
        throw new BadRequestException(`获取用户信息失败: ${data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`获取微信用户信息失败: ${error}`);
      throw new BadRequestException('获取用户信息失败');
    }
  }

  /**
   * 生成随机 state
   */
  private generateState(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * 清理过期的登录状态
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [state, loginState] of this.loginStates.entries()) {
      if (now > loginState.expiresAt) {
        // 将状态标记为过期而不是立即删除
        if (loginState.status !== 'expired') {
          this.loginStates.set(state, { ...loginState, status: 'expired' });
        }
        cleaned++;
      }
    }

    // 删除超过过期时间 5 分钟的状态
    for (const [state, loginState] of this.loginStates.entries()) {
      if (loginState.status === 'expired' && now > loginState.expiresAt + 5 * 60 * 1000) {
        this.loginStates.delete(state);
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`清理了 ${cleaned} 个过期的微信登录状态`);
    }
  }
}
