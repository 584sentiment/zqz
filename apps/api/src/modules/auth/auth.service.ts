import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/common/database/prisma.service';
import { MailService } from '../mail/mail.service';
import { SecurityService } from '../security/security.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    @Inject(forwardRef(() => SecurityService))
    private securityService: SecurityService,
  ) {}

  async register(dto: RegisterDto) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('邮箱已被注册');
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 生成验证令牌
    const verifyToken = randomBytes(32).toString('hex');
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nickname: dto.name || dto.email.split('@')[0],
        verifyToken,
        verifyTokenExpiry,
      },
    });

    // 创建用户档案
    await this.prisma.profile.create({
      data: {
        userId: user.id,
        name: user.nickname || '',
      },
    });

    // 创建免费订阅
    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'free',
        aiQuota: 10,
        resumeQuota: 3,
        interviewQuota: 1,
      },
    });

    // 发送验证邮件
    await this.mailService.sendVerificationEmail(user.email, verifyToken, user.nickname || undefined);

    // 生成令牌
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async login(dto: LoginDto, req?: Request) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { subscription: true },
    });

    if (!user) {
      // 记录失败登录（未知用户）
      if (req) {
        await this.securityService.recordLogin('unknown', 'password', false, req);
      }
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // 记录失败登录
      if (req) {
        await this.securityService.recordLogin(user.id, 'password', false, req);
      }
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成令牌
    const tokens = await this.generateTokens(user.id, user.email, dto.rememberMe);

    // 记录成功登录
    if (req) {
      await this.securityService.recordLogin(user.id, 'password', true, req);
      // 创建会话记录
      await this.securityService.createSession(user.id, tokens.refreshToken, req);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname,
        emailVerified: user.emailVerified,
        subscription: {
          plan: user.subscription?.plan || 'free',
          expiresAt: user.subscription?.endDate,
        },
      },
      tokens,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });
  }

  /**
   * 验证用户凭证（用于 Local Strategy）
   * @returns 用户对象或 null
   */
  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    };
  }

  async generateTokens(userId: string, email: string, rememberMe = false) {
    const accessToken = this.jwtService.sign({
      sub: userId,
      email,
      type: 'access',
    });

    // 记住我：30天，否则 7 天
    const refreshExpiresIn = rememberMe ? '30d' : '7d';

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      { expiresIn: refreshExpiresIn },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 分钟
      refreshExpiresIn: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 秒
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // 验证 refresh token
      const payload = this.jwtService.verify(refreshToken);

      // 检查是否是 refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 验证用户是否存在
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 生成新的令牌
      const tokens = await this.generateTokens(user.id, user.email);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.nickname,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('当前密码错误');
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证');
    }

    // 生成新的验证令牌
    const verifyToken = randomBytes(32).toString('hex');
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 更新用户的验证令牌
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verifyToken,
        verifyTokenExpiry,
      },
    });

    // 发送验证邮件
    await this.mailService.sendVerificationEmail(user.email, verifyToken, user.nickname || undefined);

    return { success: true, message: '验证邮件已发送' };
  }

  /**
   * 通过邮件令牌验证邮箱
   */
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('验证链接无效或已过期');
    }

    // 更新用户验证状态
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verifyToken: null,
        verifyTokenExpiry: null,
      },
    });

    // 发送欢迎邮件
    await this.mailService.sendWelcomeEmail(user.email, user.nickname || undefined);

    return {
      success: true,
      message: '邮箱验证成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname,
      },
    };
  }

  /**
   * 发送密码重置邮件
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 为安全起见，不暴露用户是否存在
      return { success: true, message: '如果该邮箱已注册，您将收到重置密码邮件' };
    }

    // 生成重置令牌
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1小时后过期

    // 更新用户的重置令牌
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // 发送重置邮件
    await this.mailService.sendPasswordResetEmail(user.email, resetToken, user.nickname || undefined);

    return { success: true, message: '如果该邮箱已注册，您将收到重置密码邮件' };
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('重置链接无效或已过期');
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码并清除重置令牌
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      success: true,
      message: '密码重置成功',
    };
  }

  /**
   * 删除用户账户
   */
  async deleteAccount(userId: string, password: string) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 删除用户（级联删除相关数据）
    // 由于 Prisma schema 中设置了 onDelete: Cascade，相关数据会自动删除
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      success: true,
      message: '账户已删除',
    };
  }

  /**
   * GitHub OAuth 登录
   */
  async githubLogin(profile: {
    id: string;
    displayName: string;
    username: string;
    emails: Array<{ value: string; primary?: boolean; verified?: boolean }>;
    photos: Array<{ value: string }>;
  }) {
    // 获取主邮箱
    const primaryEmail = profile.emails.find((e) => e.primary)?.value ||
      profile.emails[0]?.value;

    if (!primaryEmail) {
      throw new BadRequestException('GitHub 账户没有可用的邮箱地址');
    }

    // 查找是否已有 GitHub 关联的用户或使用相同邮箱的用户
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { oauthProvider: 'github', oauthId: profile.id },
          { email: primaryEmail },
        ],
      },
      include: { subscription: true },
    });

    if (user) {
      // 用户已存在，更新 OAuth 信息（如果尚未关联）
      if (!user.oauthProvider) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: 'github',
            oauthId: profile.id,
            // 如果用户没有头像，使用 GitHub 头像
            avatarUrl: user.avatarUrl || profile.photos[0]?.value,
          },
          include: { subscription: true },
        });
      }
    } else {
      // 创建新用户
      user = await this.prisma.user.create({
        data: {
          email: primaryEmail,
          oauthProvider: 'github',
          oauthId: profile.id,
          passwordHash: '', // OAuth 用户不需要密码
          nickname: profile.displayName || profile.username,
          avatarUrl: profile.photos[0]?.value,
          emailVerified: true, // GitHub 邮箱已验证
          emailVerifiedAt: new Date(),
        },
        include: { subscription: true },
      });

      // 创建用户档案
      await this.prisma.profile.create({
        data: {
          userId: user.id,
          name: user.nickname || '',
        },
      });

      // 创建免费订阅
      await this.prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'free',
          aiQuota: 10,
          resumeQuota: 3,
          interviewQuota: 1,
        },
      });

      // 重新获取用户（包含订阅信息）
      user = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { subscription: true },
      });
    }

    // 生成令牌
    const tokens = await this.generateTokens(user!.id, user!.email);

    return {
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.nickname,
        avatarUrl: user!.avatarUrl,
        emailVerified: user!.emailVerified,
        subscription: {
          plan: user!.subscription?.plan || 'free',
          expiresAt: user!.subscription?.endDate,
        },
      },
      tokens,
    };
  }

  /**
   * 微信 OAuth 登录
   */
  async wechatLogin(userInfo: {
    openid: string;
    nickname: string;
    headimgurl: string;
    unionid?: string;
  }) {
    // 生成虚拟邮箱（微信用户可能没有邮箱）
    const virtualEmail = `wx_${userInfo.openid}@wechat.local`;

    // 查找是否已有微信关联的用户或使用相同虚拟邮箱的用户
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { oauthProvider: 'wechat', oauthId: userInfo.openid },
          { oauthProvider: 'wechat', oauthId: userInfo.unionid },
          { email: virtualEmail },
        ],
      },
      include: { subscription: true },
    });

    if (user) {
      // 用户已存在，更新 OAuth 信息（如果尚未关联）
      if (!user.oauthProvider) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: 'wechat',
            oauthId: userInfo.unionid || userInfo.openid,
            avatarUrl: user.avatarUrl || userInfo.headimgurl,
          },
          include: { subscription: true },
        });
      }
    } else {
      // 创建新用户
      user = await this.prisma.user.create({
        data: {
          email: virtualEmail,
          oauthProvider: 'wechat',
          oauthId: userInfo.unionid || userInfo.openid,
          passwordHash: '', // OAuth 用户不需要密码
          nickname: userInfo.nickname,
          avatarUrl: userInfo.headimgurl,
          emailVerified: true, // 微信用户已验证
          emailVerifiedAt: new Date(),
        },
        include: { subscription: true },
      });

      // 创建用户档案
      await this.prisma.profile.create({
        data: {
          userId: user.id,
          name: user.nickname || '',
        },
      });

      // 创建免费订阅
      await this.prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'free',
          aiQuota: 10,
          resumeQuota: 3,
          interviewQuota: 1,
        },
      });

      // 重新获取用户（包含订阅信息）
      user = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { subscription: true },
      });
    }

    // 生成令牌
    const tokens = await this.generateTokens(user!.id, user!.email);

    return {
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.nickname,
        avatarUrl: user!.avatarUrl,
        emailVerified: user!.emailVerified,
      },
      tokens,
    };
  }
}
