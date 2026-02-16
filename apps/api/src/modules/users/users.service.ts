import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        profile: {
          include: {
            skills: true,
            experiences: true,
            projects: true,
            educations: true,
          },
        },
        subscription: true,
      },
    });
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    // 更新用户表
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.name,
        avatarUrl: data.avatarUrl,
      },
    });

    // 同步更新 Profile 表
    if (data.name) {
      await this.prisma.profile.update({
        where: { userId },
        data: { name: data.name },
      });
    }

    return user;
  }
}
