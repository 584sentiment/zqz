import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill.dto';

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

  // 工作经历 CRUD
  async createExperience(userId: string, dto: CreateExperienceDto) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.experience.create({
      data: {
        profileId,
        company: dto.company,
        position: dto.position,
        location: dto.location,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        current: dto.current ?? false,
        description: dto.description,
        highlights: dto.highlights || [],
      },
    });
  }

  async getExperiences(userId: string) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.experience.findMany({
      where: { profileId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getExperience(userId: string, experienceId: string) {
    const profileId = await this.getProfileId(userId);
    const experience = await this.prisma.experience.findFirst({
      where: { id: experienceId, profileId },
    });
    if (!experience) {
      throw new NotFoundException('工作经历不存在');
    }
    return experience;
  }

  async updateExperience(userId: string, experienceId: string, dto: UpdateExperienceDto) {
    // 验证所有权
    await this.getExperience(userId, experienceId);

    return this.prisma.experience.update({
      where: { id: experienceId },
      data: {
        company: dto.company,
        position: dto.position,
        location: dto.location,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        current: dto.current,
        description: dto.description,
        highlights: dto.highlights,
      },
    });
  }

  async deleteExperience(userId: string, experienceId: string) {
    // 验证所有权
    await this.getExperience(userId, experienceId);

    return this.prisma.experience.delete({
      where: { id: experienceId },
    });
  }

  // 项目经历 CRUD
  async createProject(userId: string, dto: CreateProjectDto) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.project.create({
      data: {
        profileId,
        name: dto.name,
        role: dto.role,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        description: dto.description,
        techStack: dto.techStack || [],
        achievements: dto.achievements || [],
        link: dto.link,
      },
    });
  }

  async getProjects(userId: string) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.project.findMany({
      where: { profileId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getProject(userId: string, projectId: string) {
    const profileId = await this.getProfileId(userId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, profileId },
    });
    if (!project) {
      throw new NotFoundException('项目经历不存在');
    }
    return project;
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto) {
    // 验证所有权
    await this.getProject(userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        role: dto.role,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        description: dto.description,
        techStack: dto.techStack,
        achievements: dto.achievements,
        link: dto.link,
      },
    });
  }

  async deleteProject(userId: string, projectId: string) {
    // 验证所有权
    await this.getProject(userId, projectId);

    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  // 技能标签 CRUD
  async createSkill(userId: string, dto: CreateSkillDto) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.skill.create({
      data: {
        profileId,
        name: dto.name,
        category: dto.category,
        level: dto.level,
        evidence: dto.evidence,
        years: dto.years,
      },
    });
  }

  async getSkills(userId: string) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.skill.findMany({
      where: { profileId },
      orderBy: [{ category: 'asc' }, { level: 'desc' }],
    });
  }

  async getSkill(userId: string, skillId: string) {
    const profileId = await this.getProfileId(userId);
    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, profileId },
    });
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }
    return skill;
  }

  async updateSkill(userId: string, skillId: string, dto: UpdateSkillDto) {
    // 验证所有权
    await this.getSkill(userId, skillId);

    return this.prisma.skill.update({
      where: { id: skillId },
      data: {
        name: dto.name,
        category: dto.category,
        level: dto.level,
        evidence: dto.evidence,
        years: dto.years,
      },
    });
  }

  async deleteSkill(userId: string, skillId: string) {
    // 验证所有权
    await this.getSkill(userId, skillId);

    return this.prisma.skill.delete({
      where: { id: skillId },
    });
  }

  // AI 优化工作经历描述
  async optimizeExperience(
    userId: string,
    experienceId: string,
    targetType: 'description' | 'highlights' = 'description',
  ) {
    // 获取原始工作经历
    const experience = await this.getExperience(userId, experienceId);

    // 模拟 AI 优化（实际项目中应调用 AI 服务）
    const optimized = this.generateOptimizedContent(
      experience.company,
      experience.position,
      experience.description,
      experience.highlights,
      targetType,
    );

    return {
      original:
        targetType === 'description' ? experience.description : experience.highlights?.join('\n'),
      optimized: targetType === 'description' ? optimized.description : optimized.highlights,
      suggestions: optimized.suggestions,
    };
  }

  private generateOptimizedContent(
    company: string,
    position: string,
    description: string | null,
    highlights: string[],
    targetType: 'description' | 'highlights',
  ) {
    // 模拟 AI 优化逻辑
    const suggestions: string[] = [];

    if (targetType === 'description') {
      // 优化工作描述
      let optimizedDesc = description || '';

      // 添加建议
      if (!description || description.length < 50) {
        suggestions.push('建议补充更多工作职责细节，包括具体负责的业务领域');
      }
      if (description && !description.includes('负责')) {
        suggestions.push('建议使用"负责"、"主导"、"参与"等动词开头描述职责');
      }
      if (description && !/\d+/.test(description)) {
        suggestions.push('建议添加量化数据，如团队规模、项目数量、业绩指标等');
      }

      // 生成优化后的描述
      if (!description || description.length < 20) {
        optimizedDesc = `在${company}担任${position}期间，主要负责相关业务系统的开发与维护工作。参与多个核心项目的技术设计与实现，与团队协作确保项目按时高质量交付。`;
      } else {
        // 对已有描述进行简单优化（添加更专业的表述）
        optimizedDesc = this.enhanceDescription(description, position);
      }

      return {
        description: optimizedDesc,
        highlights: null,
        suggestions,
      };
    } else {
      // 优化主要成就
      let optimizedHighlights = [...highlights];

      if (highlights.length === 0) {
        suggestions.push('建议添加 3-5 条主要成就，突出工作成果');
        optimizedHighlights = [
          `主导完成${position}相关的核心模块开发，提升系统性能 30%`,
          '参与技术方案设计，解决关键技术难题',
          '与跨部门团队协作，确保项目按期交付',
        ];
      } else {
        // 优化现有成就描述
        optimizedHighlights = highlights.map((h, index) => {
          suggestions.push(`建议第 ${index + 1} 条添加量化数据或具体成果`);
          return this.enhanceHighlight(h);
        });
      }

      return {
        description: null,
        highlights: optimizedHighlights.join('\n'),
        suggestions,
      };
    }
  }

  private enhanceDescription(description: string, position: string): string {
    // 简单的描述增强逻辑
    let enhanced = description;

    // 确保以专业动词开头
    const professionalStarts = ['负责', '主导', '参与', '承担', '协助', '推动'];
    const startsWithProfessional = professionalStarts.some((start) =>
      enhanced.trim().startsWith(start),
    );

    if (!startsWithProfessional) {
      enhanced = `负责${enhanced}`;
    }

    return enhanced;
  }

  private enhanceHighlight(highlight: string): string {
    // 如果不包含数字，添加一些量化表述
    if (!/\d+%/.test(highlight) && !/\d+个/.test(highlight) && !/\d+万/.test(highlight)) {
      return `${highlight}，获得团队认可`;
    }
    return highlight;
  }
}
