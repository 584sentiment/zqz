import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { Request } from 'express';
import * as crypto from 'crypto';

interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 解析 User-Agent 获取设备信息
   */
  parseUserAgent(userAgent: string | undefined): DeviceInfo {
    if (!userAgent) {
      return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
    }

    const ua = userAgent.toLowerCase();

    // 检测操作系统
    let os = 'Unknown';
    if (ua.includes('windows nt 10')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';

    // 检测浏览器
    let browser = 'Unknown';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome/')) browser = 'Chrome';
    else if (ua.includes('firefox/')) browser = 'Firefox';
    else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    // 检测设备类型
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    }

    return { device, browser, os };
  }

  /**
   * 记录登录历史
   */
  async recordLogin(
    userId: string,
    loginMethod: string,
    success: boolean,
    req: Request,
  ): Promise<void> {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = this.getClientIp(req);
      const deviceInfo = this.parseUserAgent(userAgent);

      await this.prisma.loginHistory.create({
        data: {
          userId,
          loginMethod,
          success,
          ipAddress,
          userAgent,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          location: null, // 需要 IP 地理位置服务
        },
      });

      this.logger.log(
        `记录登录: userId=${userId}, method=${loginMethod}, success=${success}, ip=${ipAddress}`,
      );
    } catch (error) {
      this.logger.error(`记录登录失败: ${error}`);
    }
  }

  /**
   * 获取客户端 IP 地址
   */
  private getClientIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.socket?.remoteAddress || null;
  }

  /**
   * 创建会话记录
   */
  async createSession(
    userId: string,
    refreshToken: string,
    req: Request,
  ): Promise<void> {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = this.getClientIp(req);
      const deviceInfo = this.parseUserAgent(userAgent);
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // 计算过期时间 (30天)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await this.prisma.userSession.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          deviceName: `${deviceInfo.browser} on ${deviceInfo.os}`,
          ipAddress,
          userAgent,
        },
      });

      this.logger.log(`创建会话: userId=${userId}, device=${deviceInfo.browser} on ${deviceInfo.os}`);
    } catch (error) {
      this.logger.error(`创建会话失败: ${error}`);
    }
  }

  /**
   * 更新会话最后活跃时间
   */
  async updateSessionActivity(refreshToken: string): Promise<void> {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await this.prisma.userSession.updateMany({
        where: { tokenHash },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`更新会话活跃时间失败: ${error}`);
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  /**
   * 删除其他所有会话
   */
  async deleteOtherSessions(userId: string, currentRefreshToken: string): Promise<number> {
    const tokenHash = crypto.createHash('sha256').update(currentRefreshToken).digest('hex');

    const result = await this.prisma.userSession.deleteMany({
      where: {
        userId,
        NOT: { tokenHash },
      },
    });

    return result.count;
  }

  /**
   * 清理过期会话
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`清理过期会话: ${result.count} 个`);
    }

    return result.count;
  }

  /**
   * 获取用户登录历史
   */
  async getLoginHistory(userId: string, limit: number = 20) {
    const histories = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
    });

    return histories.map((h) => ({
      id: h.id,
      loginAt: h.loginAt,
      loginMethod: h.loginMethod,
      success: h.success,
      ipAddress: h.ipAddress,
      device: h.device,
      browser: h.browser,
      os: h.os,
      location: h.location,
    }));
  }

  /**
   * 获取用户活跃会话
   */
  async getActiveSessions(userId: string, currentRefreshToken?: string) {
    const currentTokenHash = currentRefreshToken
      ? crypto.createHash('sha256').update(currentRefreshToken).digest('hex')
      : null;

    // 清理过期会话
    await this.cleanExpiredSessions();

    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: currentTokenHash === s.tokenHash,
    }));
  }

  /**
   * 获取安全概览
   */
  async getSecurityOverview(userId: string) {
    // 最近登录
    const recentLogins = await this.prisma.loginHistory.findMany({
      where: { userId, success: true },
      orderBy: { loginAt: 'desc' },
      take: 5,
    });

    // 活跃会话数
    const activeSessionsCount = await this.prisma.userSession.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    // 上次登录
    const lastLogin = recentLogins[0];

    // 检测异常登录（不同设备/位置）
    const suspiciousLogins = await this.detectSuspiciousLogins(userId);

    return {
      activeSessionsCount,
      lastLogin: lastLogin
        ? {
            loginAt: lastLogin.loginAt,
            device: lastLogin.device,
            browser: lastLogin.browser,
            os: lastLogin.os,
            ipAddress: lastLogin.ipAddress,
            location: lastLogin.location,
          }
        : null,
      recentLoginsCount: await this.prisma.loginHistory.count({
        where: { userId, success: true },
      }),
      suspiciousActivities: suspiciousLogins.length,
    };
  }

  /**
   * 检测可疑登录
   */
  private async detectSuspiciousLogins(userId: string) {
    // 获取最近7天的登录记录
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentLogins = await this.prisma.loginHistory.findMany({
      where: {
        userId,
        success: true,
        loginAt: { gt: sevenDaysAgo },
      },
      orderBy: { loginAt: 'desc' },
    });

    if (recentLogins.length < 2) return [];

    // 检测不同设备的登录
    const devices = new Set(recentLogins.map((l) => l.device));
    const suspicious: typeof recentLogins = [];

    // 如果最近有来自新设备的登录，标记为可疑
    const knownDevices = new Set(recentLogins.slice(1).map((l) => l.device));
    const latestLogin = recentLogins[0];

    if (!knownDevices.has(latestLogin.device) && knownDevices.size > 0) {
      suspicious.push(latestLogin);
    }

    return suspicious;
  }
}
