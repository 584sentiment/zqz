import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';

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
            educations: {
              orderBy: { startDate: 'desc' },
            },
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

  // 获取用户 Profile ID
  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('用户档案不存在');
    }
    return profile.id;
  }

  // 教育经历 CRUD
  async createEducation(userId: string, dto: CreateEducationDto) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.education.create({
      data: {
        profileId,
        school: dto.school,
        degree: dto.degree,
        major: dto.major,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        description: dto.description,
      },
    });
  }

  async getEducations(userId: string) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.education.findMany({
      where: { profileId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getEducation(userId: string, educationId: string) {
    const profileId = await this.getProfileId(userId);
    const education = await this.prisma.education.findFirst({
      where: { id: educationId, profileId },
    });
    if (!education) {
      throw new NotFoundException('教育经历不存在');
    }
    return education;
  }

  async updateEducation(userId: string, educationId: string, dto: UpdateEducationDto) {
    // 验证所有权
    await this.getEducation(userId, educationId);

    return this.prisma.education.update({
      where: { id: educationId },
      data: {
        school: dto.school,
        degree: dto.degree,
        major: dto.major,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        description: dto.description,
      },
    });
  }

  async deleteEducation(userId: string, educationId: string) {
    // 验证所有权
    await this.getEducation(userId, educationId);

    return this.prisma.education.delete({
      where: { id: educationId },
    });
  }
}
