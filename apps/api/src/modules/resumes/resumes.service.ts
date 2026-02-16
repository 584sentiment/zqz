import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

@Injectable()
export class ResumesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户的简历列表
   */
  async getList(userId: string, options?: { jobId?: string; status?: string }) {
    return this.prisma.resume.findMany({
      where: {
        userId,
        ...(options?.jobId && { jobId: options.jobId }),
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: { id: true, title: true, company: true },
        },
      },
    });
  }

  /**
   * 获取单个简历详情
   */
  async getOne(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: {
        job: {
          select: { id: true, title: true, company: true, description: true, requirements: true },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    return resume;
  }

  /**
   * 创建简历
   */
  async create(
    userId: string,
    data: {
      name: string;
      jobId?: string;
      templateId?: string;
      language?: string;
    },
  ) {
    return this.prisma.resume.create({
      data: {
        userId,
        name: data.name,
        jobId: data.jobId,
        templateId: data.templateId || 'modern',
        language: data.language || 'zh',
        status: 'draft',
      },
    });
  }

  /**
   * 更新简历内容
   */
  async update(userId: string, resumeId: string, data: Record<string, unknown>) {
    // 先验证简历存在
    await this.getOne(userId, resumeId);

    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 更新简历状态
   */
  async updateStatus(userId: string, resumeId: string, status: string) {
    return this.update(userId, resumeId, { status });
  }

  /**
   * 删除简历
   */
  async delete(userId: string, resumeId: string) {
    // 先验证简历存在
    await this.getOne(userId, resumeId);

    return this.prisma.resume.delete({
      where: { id: resumeId },
    });
  }

  /**
   * 复制简历
   */
  async duplicate(userId: string, resumeId: string) {
    const original = await this.getOne(userId, resumeId);

    return this.prisma.resume.create({
      data: {
        userId,
        name: `${original.name} (副本)`,
        jobId: original.jobId,
        templateId: original.templateId,
        language: original.language,
        content: original.content,
        status: 'draft',
      },
    });
  }

  /**
   * 获取可用的简历模板
   */
  async getTemplates() {
    // 返回预设模板
    return [
      {
        id: 'modern',
        name: '现代简约',
        category: 'professional',
        thumbnail: '/templates/modern.png',
        isPremium: false,
      },
      {
        id: 'classic',
        name: '经典商务',
        category: 'professional',
        thumbnail: '/templates/classic.png',
        isPremium: false,
      },
      {
        id: 'creative',
        name: '创意设计',
        category: 'creative',
        thumbnail: '/templates/creative.png',
        isPremium: true,
      },
      {
        id: 'minimal',
        name: '极简风格',
        category: 'simple',
        thumbnail: '/templates/minimal.png',
        isPremium: false,
      },
      {
        id: 'executive',
        name: '高管专用',
        category: 'executive',
        thumbnail: '/templates/executive.png',
        isPremium: true,
      },
    ];
  }
}
