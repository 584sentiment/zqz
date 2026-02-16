import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/common/database/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
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

  async login(dto: LoginDto) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { subscription: true },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成令牌
    const tokens = await this.generateTokens(user.id, user.email);

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

  async generateTokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign({
      sub: userId,
      email,
      type: 'access',
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      { expiresIn: '7d' },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 分钟
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
}
