import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/database/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nickname: dto.name || dto.email.split('@')[0],
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
}
