import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { SkillDiscoveryService } from '@ai-job-assistant/ai';

@Injectable()
export class SkillsService {
  private skillDiscoveryAI: SkillDiscoveryService;

  constructor(private prisma: PrismaService) {
    this.skillDiscoveryAI = new SkillDiscoveryService();
  }

  /**
   * 创建新的技能发掘会话
   */
  async createSession(userId: string, jobId?: string) {
    return this.prisma.skillDiscoverySession.create({
      data: {
        userId,
        jobId,
        status: 'active',
        discoveredSkills: [],
        messagesCount: 0,
      },
    });
  }

  /**
   * 获取用户的技能发掘会话列表
   */
  async getSessions(userId: string, options?: { status?: string }) {
    return this.prisma.skillDiscoverySession.findMany({
      where: {
        userId,
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
   * 获取单个会话详情
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.skillDiscoverySession.findFirst({
      where: { id: sessionId, userId },
      include: {
        job: {
          select: { id: true, title: true, company: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return session;
  }

  /**
   * 更新会话
   */
  async updateSession(
    userId: string,
    sessionId: string,
    data: {
      discoveredSkills?: string[];
      messagesCount?: number;
      status?: string;
    },
  ) {
    // 先验证会话存在
    await this.getSession(userId, sessionId);

    return this.prisma.skillDiscoverySession.update({
      where: { id: sessionId },
      data,
    });
  }

  /**
   * 添加发现的技能
   */
  async addDiscoveredSkill(userId: string, sessionId: string, skill: string) {
    const session = await this.getSession(userId, sessionId);

    const currentSkills = session.discoveredSkills as string[];
    if (!currentSkills.includes(skill)) {
      return this.prisma.skillDiscoverySession.update({
        where: { id: sessionId },
        data: {
          discoveredSkills: [...currentSkills, skill],
        },
      });
    }

    return session;
  }

  /**
   * 完成会话
   */
  async completeSession(userId: string, sessionId: string) {
    return this.updateSession(userId, sessionId, { status: 'completed' });
  }

  /**
   * 删除会话
   */
  async deleteSession(userId: string, sessionId: string) {
    // 先验证会话存在
    await this.getSession(userId, sessionId);

    return this.prisma.skillDiscoverySession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * 增加消息计数
   */
  async incrementMessageCount(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);
    return this.updateSession(userId, sessionId, {
      messagesCount: session.messagesCount + 1,
    });
  }

  /**
   * 发送聊天消息并获取 AI 响应
   */
  async chat(
    userId: string,
    sessionId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ) {
    // 验证会话存在
    const session = await this.getSession(userId, sessionId);

    // 调用 AI 服务获取响应
    const aiResponse = await this.skillDiscoveryAI.chat(message, conversationHistory);

    // 更新消息计数
    await this.updateSession(userId, sessionId, {
      messagesCount: session.messagesCount + 1,
    });

    // 如果发现了新技能，添加到会话中
    if (aiResponse.discoveredSkills && aiResponse.discoveredSkills.length > 0) {
      const currentSkills = session.discoveredSkills as string[];
      const newSkills = aiResponse.discoveredSkills.filter(
        (skill: string) => !currentSkills.includes(skill)
      );

      if (newSkills.length > 0) {
        await this.prisma.skillDiscoverySession.update({
          where: { id: sessionId },
          data: {
            discoveredSkills: [...currentSkills, ...newSkills],
          },
        });
      }
    }

    return {
      response: aiResponse.response,
      discoveredSkills: aiResponse.discoveredSkills,
      isComplete: aiResponse.isComplete,
    };
  }
}
