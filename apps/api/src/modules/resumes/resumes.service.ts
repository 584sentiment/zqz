import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResumeGenerationService, AIServiceError } from '@ai-job-assistant/ai';

export interface MatchAnalysis {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  breakdown: {
    skills: { score: number; details: string };
    experience: { score: number; details: string };
    education: { score: number; details: string };
    overall: { score: number; details: string };
  };
}

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);
  private readonly resumeGenerationService: ResumeGenerationService;

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private notificationsService: NotificationsService,
  ) {
    this.resumeGenerationService = new ResumeGenerationService();
  }

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
    const resume = await this.getOne(userId, resumeId);

    // 如果更新了内容，创建版本快照
    if (data.content && resume.content) {
      // 获取当前最大版本号
      const latestVersion = await this.prisma.resumeVersion.findFirst({
        where: { resumeId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const nextVersion = (latestVersion?.version || 0) + 1;

      // 创建版本快照
      await this.prisma.resumeVersion.create({
        data: {
          resumeId,
          version: nextVersion,
          content: JSON.parse(JSON.stringify(resume.content)),
          changeNote: data.changeNote as string | undefined,
        },
      });
    }

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
   * 获取简历版本历史
   */
  async getVersionHistory(userId: string, resumeId: string) {
    // 先验证简历存在
    await this.getOne(userId, resumeId);

    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        changeNote: true,
        createdAt: true,
      },
    });

    return versions;
  }

  /**
   * 获取特定版本内容
   */
  async getVersion(userId: string, resumeId: string, versionId: string) {
    // 先验证简历存在
    await this.getOne(userId, resumeId);

    const version = await this.prisma.resumeVersion.findFirst({
      where: { id: versionId, resumeId },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    return version;
  }

  /**
   * 恢复到历史版本
   */
  async restoreVersion(userId: string, resumeId: string, versionId: string) {
    // 获取历史版本
    const version = await this.getVersion(userId, resumeId, versionId);

    // 先保存当前内容为新版本
    const resume = await this.getOne(userId, resumeId);
    if (resume.content) {
      const latestVersion = await this.prisma.resumeVersion.findFirst({
        where: { resumeId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      await this.prisma.resumeVersion.create({
        data: {
          resumeId,
          version: (latestVersion?.version || 0) + 1,
          content: JSON.parse(JSON.stringify(resume.content)),
          changeNote: '恢复前自动备份',
        },
      });
    }

    // 恢复历史版本内容
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        content: JSON.parse(JSON.stringify(version.content)),
        updatedAt: new Date(),
      },
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
        content: original.content ?? undefined,
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

  /**
   * 分析简历与岗位的匹配度
   */
  async analyzeMatch(userId: string, resumeId: string): Promise<MatchAnalysis> {
    const resume = await this.getOne(userId, resumeId);

    if (!resume.jobId || !resume.job) {
      throw new NotFoundException('该简历未关联岗位，无法分析匹配度');
    }

    const content = (resume.content as Record<string, unknown>) || {};
    const jobRequirements = (resume.job.requirements as Record<string, unknown>) || {};
    const jobDescription = resume.job.description || '';

    // 提取简历中的技能
    const resumeSkills = ((content.skills as string[]) || []).map((s) => s.toLowerCase());

    // 提取岗位要求的技能（从 requirements 或 description）
    const requiredSkills = this.extractSkillsFromJob(jobRequirements, jobDescription);

    // 计算技能匹配
    const matchedSkills = resumeSkills.filter((skill) =>
      requiredSkills.some((req) => req.includes(skill) || skill.includes(req))
    );
    const missingSkills = requiredSkills.filter(
      (req) => !resumeSkills.some((skill) => skill.includes(req) || req.includes(skill))
    );

    const skillsScore = requiredSkills.length > 0
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 70;

    // 分析工作经历匹配度
    const experiences = (content.experience as Array<Record<string, unknown>>) || [];
    const experienceScore = this.calculateExperienceScore(experiences, jobDescription);

    // 分析教育背景匹配度
    const education = (content.education as Array<Record<string, unknown>>) || [];
    const educationScore = this.calculateEducationScore(education, jobRequirements);

    // 计算总分
    const overallScore = Math.round(skillsScore * 0.5 + experienceScore * 0.35 + educationScore * 0.15);

    // 生成建议
    const recommendations = this.generateRecommendations(
      matchedSkills,
      missingSkills,
      skillsScore,
      experienceScore
    );

    // 更新简历的匹配分数
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { matchScore: overallScore / 100 },
    });

    return {
      score: overallScore,
      matchedSkills,
      missingSkills,
      recommendations,
      breakdown: {
        skills: {
          score: skillsScore,
          details: `匹配 ${matchedSkills.length}/${requiredSkills.length} 项技能要求`,
        },
        experience: {
          score: experienceScore,
          details: experiences.length > 0
            ? `${experiences.length} 段相关工作经历`
            : '建议添加工作经历',
        },
        education: {
          score: educationScore,
          details: education.length > 0
            ? '教育背景符合要求'
            : '建议完善教育经历',
        },
        overall: {
          score: overallScore,
          details: overallScore >= 80
            ? '简历与岗位高度匹配'
            : overallScore >= 60
            ? '简历与岗位基本匹配，建议优化'
            : '简历与岗位匹配度较低，建议大幅调整',
        },
      },
    };
  }

  /**
   * 从岗位信息中提取技能要求
   */
  private extractSkillsFromJob(
    requirements: Record<string, unknown>,
    description: string
  ): string[] {
    const skills: Set<string> = new Set();

    // 从 requirements.skills 提取
    const reqSkills = requirements.skills as string[] | undefined;
    if (reqSkills) {
      reqSkills.forEach((s) => skills.add(s.toLowerCase()));
    }

    // 从描述中提取常见技能关键词
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++',
      'react', 'vue', 'angular', 'nextjs', 'node.js', 'express',
      'postgresql', 'mysql', 'mongodb', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'git', 'linux', 'agile', 'scrum',
      'machine learning', 'ai', 'data analysis',
    ];

    const lowerDesc = description.toLowerCase();
    commonSkills.forEach((skill) => {
      if (lowerDesc.includes(skill)) {
        skills.add(skill);
      }
    });

    return Array.from(skills);
  }

  /**
   * 计算工作经历得分
   */
  private calculateExperienceScore(
    experiences: Array<Record<string, unknown>>,
    jobDescription: string
  ): number {
    if (experiences.length === 0) return 40;

    let score = 60; // 基础分

    // 根据经历数量加分
    if (experiences.length >= 3) score += 10;
    if (experiences.length >= 5) score += 5;

    // 检查是否有相关经历
    const jobKeywords = jobDescription.toLowerCase().split(/\s+/);
    experiences.forEach((exp) => {
      const highlights = (exp.highlights as string[]) || [];
      const position = (exp.position as string) || '';

      highlights.forEach((h) => {
        jobKeywords.forEach((keyword) => {
          if (h.toLowerCase().includes(keyword)) {
            score += 2;
          }
        });
      });

      if (jobDescription.toLowerCase().includes(position.toLowerCase())) {
        score += 5;
      }
    });

    return Math.min(100, score);
  }

  /**
   * 计算教育背景得分
   */
  private calculateEducationScore(
    education: Array<Record<string, unknown>>,
    requirements: Record<string, unknown>
  ): number {
    if (education.length === 0) return 50;

    let score = 70;

    const reqEducation = requirements.education as string | undefined;
    if (reqEducation) {
      education.forEach((edu) => {
        const degree = (edu.degree as string) || '';
        const major = (edu.major as string) || '';

        if (reqEducation.includes(degree) || reqEducation.includes(major)) {
          score += 10;
        }
      });
    }

    return Math.min(100, score);
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    matchedSkills: string[],
    missingSkills: string[],
    skillsScore: number,
    experienceScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (missingSkills.length > 0 && missingSkills.length <= 5) {
      recommendations.push(`建议补充以下技能相关经验：${missingSkills.join('、')}`);
    }

    if (skillsScore < 70) {
      recommendations.push('技能匹配度较低，建议根据岗位要求调整技能展示顺序');
    }

    if (experienceScore < 70) {
      recommendations.push('建议在工作经历中突出与岗位相关的项目成果');
    }

    if (matchedSkills.length > 0) {
      recommendations.push(`技能匹配良好，建议在简历中突出展示：${matchedSkills.slice(0, 5).join('、')}`);
    }

    recommendations.push('建议使用量化数据展示工作成果');

    return recommendations;
  }

  /**
   * 生成 PDF（返回 HTML 用于前端生成 PDF）
   */
  async generatePdf(userId: string, resumeId: string): Promise<{ html: string; filename: string }> {
    const resume = await this.getOne(userId, resumeId);

    if (resume.status !== 'completed') {
      throw new NotFoundException('简历尚未生成完成，无法导出');
    }

    const content = (resume.content as Record<string, unknown>) || {};
    const filename = `${resume.name.replace(/\s+/g, '_')}_简历.pdf`;

    // 生成简单的 HTML（前端可以使用 html2pdf 或类似库转换为 PDF）
    const html = this.generateResumeHtml(resume.name, content, resume.job);

    // 记录导出使用量
    await this.subscriptionsService.recordUsage(userId, 'resume_export', resumeId, {
      format: 'pdf',
      resumeName: resume.name,
    });

    return { html, filename };
  }

  /**
   * 生成 Word 文档（返回 Word 兼容的 HTML）
   */
  async generateWord(userId: string, resumeId: string): Promise<{ html: string; filename: string }> {
    const resume = await this.getOne(userId, resumeId);

    if (resume.status !== 'completed') {
      throw new NotFoundException('简历尚未生成完成，无法导出');
    }

    const content = (resume.content as Record<string, unknown>) || {};
    const filename = `${resume.name.replace(/\s+/g, '_')}_简历.doc`;

    // 生成 Word 兼容的 HTML
    const html = this.generateWordHtml(resume.name, content, resume.job);

    // 记录导出使用量
    await this.subscriptionsService.recordUsage(userId, 'resume_export', resumeId, {
      format: 'word',
      resumeName: resume.name,
    });

    return { html, filename };
  }

  /**
   * 生成 Word 兼容的 HTML 格式
   */
  private generateWordHtml(
    name: string,
    content: Record<string, unknown>,
    job?: { title?: string | null; company?: string | null } | null
  ): string {
    const summary = (content.summary as string) || '';
    const skills = (content.skills as string[]) || [];
    const experiences = (content.experience as Array<Record<string, unknown>>) || [];
    const education = (content.education as Array<Record<string, unknown>>) || [];

    // Word 兼容的 HTML 格式（使用 mso 命名空间的样式）
    return `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4;
      margin: 2.54cm;
    }
    body {
      font-family: "微软雅黑", "Microsoft YaHei", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333333;
    }
    h1 {
      font-size: 22pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 6pt;
      text-align: center;
    }
    .subtitle {
      font-size: 11pt;
      color: #666666;
      text-align: center;
      margin-bottom: 18pt;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      color: #2563eb;
      border-bottom: 1.5pt solid #2563eb;
      padding-bottom: 4pt;
      margin-top: 14pt;
      margin-bottom: 8pt;
    }
    .summary {
      color: #555555;
      margin-bottom: 10pt;
      text-align: justify;
    }
    .skills {
      margin-bottom: 10pt;
    }
    .skill {
      display: inline-block;
      background-color: #eff6ff;
      color: #2563eb;
      padding: 2pt 8pt;
      margin: 2pt;
      border-radius: 10pt;
      font-size: 10pt;
    }
    .experience-item, .education-item {
      margin-bottom: 12pt;
      padding-left: 10pt;
      border-left: 2pt solid #e5e7eb;
    }
    .experience-item h3, .education-item h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 2pt;
      color: #1a1a1a;
    }
    .meta {
      color: #666666;
      font-size: 10pt;
      margin-bottom: 4pt;
    }
    .highlights {
      margin-left: 15pt;
      margin-top: 4pt;
    }
    .highlights li {
      color: #555555;
      margin-bottom: 2pt;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <h1>${name}</h1>
  ${job?.title ? `<div class="subtitle">应聘：${job.title}${job.company ? ` @ ${job.company}` : ''}</div>` : ''}

  ${summary ? `<h2>个人简介</h2><p class="summary">${summary}</p>` : ''}

  ${skills.length > 0 ? `
  <h2>专业技能</h2>
  <div class="skills">
    ${skills.map((s) => `<span class="skill">${s}</span>`).join('')}
  </div>
  ` : ''}

  ${experiences.length > 0 ? `
  <h2>工作经历</h2>
  ${experiences.map((exp) => `
    <div class="experience-item">
      <h3>${exp.position as string}</h3>
      <div class="meta">${exp.company as string} | ${exp.period as string}</div>
      ${((exp.highlights as string[]) || []).length > 0 ? `
        <ul class="highlights">
          ${(exp.highlights as string[]).map((h) => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('')}
  ` : ''}

  ${education.length > 0 ? `
  <h2>教育经历</h2>
  ${education.map((edu) => `
    <div class="education-item">
      <h3>${edu.school as string}</h3>
      <div class="meta">${edu.major as string} · ${edu.degree as string} | ${edu.period as string}</div>
    </div>
  `).join('')}
  ` : ''}
</body>
</html>
    `.trim();
  }

  /**
   * 生成简历 HTML
   */
  private generateResumeHtml(
    name: string,
    content: Record<string, unknown>,
    job?: { title?: string | null; company?: string | null } | null
  ): string {
    const summary = (content.summary as string) || '';
    const skills = (content.skills as string[]) || [];
    const experiences = (content.experience as Array<Record<string, unknown>>) || [];
    const education = (content.education as Array<Record<string, unknown>>) || [];

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${name} - 简历</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a1a; }
    .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
    h2 {
      font-size: 16px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin: 24px 0 16px;
      color: #1a1a1a;
    }
    .summary { color: #555; margin-bottom: 16px; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .skill {
      background: #eff6ff;
      color: #2563eb;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
    }
    .experience-item, .education-item {
      margin-bottom: 16px;
      padding-left: 16px;
      border-left: 3px solid #e5e7eb;
    }
    .experience-item h3, .education-item h3 { font-size: 15px; margin-bottom: 4px; }
    .experience-item .meta, .education-item .meta {
      color: #666;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .highlights { padding-left: 20px; }
    .highlights li { color: #555; margin-bottom: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  ${job?.title ? `<div class="subtitle">应聘：${job.title}${job.company ? ` @ ${job.company}` : ''}</div>` : ''}

  ${summary ? `<h2>个人简介</h2><p class="summary">${summary}</p>` : ''}

  ${skills.length > 0 ? `
  <h2>专业技能</h2>
  <div class="skills">
    ${skills.map((s) => `<span class="skill">${s}</span>`).join('')}
  </div>
  ` : ''}

  ${experiences.length > 0 ? `
  <h2>工作经历</h2>
  ${experiences.map((exp) => `
    <div class="experience-item">
      <h3>${exp.position as string}</h3>
      <div class="meta">${exp.company as string} | ${exp.period as string}</div>
      ${((exp.highlights as string[]) || []).length > 0 ? `
        <ul class="highlights">
          ${(exp.highlights as string[]).map((h) => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('')}
  ` : ''}

  ${education.length > 0 ? `
  <h2>教育经历</h2>
  ${education.map((edu) => `
    <div class="education-item">
      <h3>${edu.school as string}</h3>
      <div class="meta">${edu.major as string} · ${edu.degree as string} | ${edu.period as string}</div>
    </div>
  `).join('')}
  ` : ''}
</body>
</html>
    `.trim();
  }

  /**
   * 使用 AI 生成简历内容
   */
  async generateResume(
    userId: string,
    resumeId: string,
  ): Promise<{
    success: boolean;
    content?: Record<string, unknown>;
    matchAnalysis?: Record<string, unknown>;
    sourceReferences?: Record<string, unknown>;
    error?: string;
  }> {
    // 获取简历和关联的岗位
    const resume = await this.getOne(userId, resumeId);

    if (!resume.jobId || !resume.job) {
      return {
        success: false,
        error: '请先关联目标岗位',
      };
    }

    // 获取用户完整档案
    const userProfile = await this.getUserProfileForResume(userId);

    // 构建岗位描述
    const jobDescription = this.buildJobDescription(resume.job);

    // 构建源数据引用（用于追溯）
    const sourceReferences = this.buildSourceReferences(userProfile, resume.job);

    // 调用 AI 生成
    try {
      this.logger.log(`开始为用户 ${userId} 生成简历，目标岗位: ${resume.job.title}`);

      const aiResult = await this.resumeGenerationService.generate(
        JSON.stringify(userProfile, null, 2),
        jobDescription,
      );

      // 提取匹配分析
      const matchAnalysis = aiResult.matchAnalysis as Record<string, unknown> | undefined;

      // 转换为简历内容格式，并添加 AI 生成标记
      const content: Record<string, unknown> = {
        // 元数据
        _meta: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'AI',
          aiModel: 'deepseek-chat',
          sourceProfileId: userProfile.profileId,
          sourceJobId: resume.jobId,
          isAIGenerated: true,
        },
        // 内容
        summary: {
          text: aiResult.summary,
          _source: 'ai_generated',
          _basedOn: ['profile.highlights', 'job.requirements'],
        },
        matchedSkills: aiResult.matchedSkills,
        skills: {
          list: aiResult.skills,
          _source: 'ai_curated',
          _basedOn: ['profile.skills', 'job.skills'],
        },
        experience: this.markExperienceSources(
          aiResult.experience as Array<unknown>,
          (userProfile.experiences as Array<{ id?: string; company?: string }>) || []
        ),
        projects: this.markProjectSources(
          aiResult.projects as Array<unknown>,
          (userProfile.projects as Array<{ id?: string; name?: string }>) || []
        ),
        education: {
          list: aiResult.education,
          _source: 'profile_original',
          _basedOn: ['profile.education'],
        },
      };

      // 更新简历状态和内容
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: 'completed',
          content: JSON.parse(JSON.stringify(content)),
          matchScore: (matchAnalysis?.score as number) || 0,
          updatedAt: new Date(),
        },
      });

      // 发送简历生成完成通知
      await this.notificationsService.notifyResumeCompleted(userId, resumeId, resume.name).catch((err) => {
        this.logger.warn(`发送简历完成通知失败: ${err.message}`);
      });

      // 记录使用量
      await this.subscriptionsService.recordUsage(userId, 'resume_generate', resumeId, {
        jobId: resume.jobId,
        matchScore: matchAnalysis?.score,
      });

      this.logger.log(`简历生成成功，匹配度: ${matchAnalysis?.score || 0}%`);

      return {
        success: true,
        content,
        matchAnalysis,
        sourceReferences,
      };
    } catch (error) {
      const errorMessage = error instanceof AIServiceError
        ? error.message
        : '简历生成失败，请稍后重试';

      this.logger.error(`简历生成失败: ${errorMessage}`, error);

      // 更新简历状态为失败
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: 'failed',
          updatedAt: new Date(),
        },
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 获取用户档案信息用于简历生成
   */
  private async getUserProfileForResume(userId: string): Promise<Record<string, unknown>> {
    // 获取用户基本信息和档案
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        nickname: true,
        email: true,
        phone: true,
        profile: {
          include: {
            skills: true,
            experiences: {
              orderBy: { startDate: 'desc' },
            },
            projects: {
              orderBy: { startDate: 'desc' },
            },
            educations: {
              orderBy: { startDate: 'desc' },
            },
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('用户档案不存在，请先完善个人资料');
    }

    const profile = user.profile;

    return {
      name: user.nickname || '未设置',
      email: user.email,
      // 基本信息
      phone: user.phone,
      location: profile.location,
      desiredPosition: profile.targetRoles,
      desiredLocation: profile.targetLocations,
      // 技能
      skills: profile.skills.map((s) => ({
        name: s.name,
        category: s.category,
        level: s.level,
        yearsOfExperience: s.years,
      })),
      // 工作经历
      experiences: profile.experiences.map((e) => ({
        company: e.company,
        position: e.position,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
        description: e.description,
        achievements: e.highlights,
      })),
      // 项目经历
      projects: profile.projects.map((p) => ({
        name: p.name,
        role: p.role,
        description: p.description,
        techStack: p.techStack,
        startDate: p.startDate,
        endDate: p.endDate,
        achievements: p.achievements,
      })),
      // 教育经历
      educations: profile.educations.map((e) => ({
        school: e.school,
        degree: e.degree,
        major: e.major,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
      })),
    };
  }

  /**
   * 构建岗位描述用于 AI 生成
   */
  private buildJobDescription(job: {
    title?: string | null;
    company?: string | null;
    description?: string | null;
    requirements?: unknown;
  }): string {
    const parts: string[] = [];

    if (job.title) {
      parts.push(`职位名称: ${job.title}`);
    }
    if (job.company) {
      parts.push(`公司: ${job.company}`);
    }
    if (job.description) {
      parts.push(`岗位描述:\n${job.description}`);
    }
    if (job.requirements) {
      parts.push(`岗位要求:\n${JSON.stringify(job.requirements, null, 2)}`);
    }

    return parts.join('\n\n');
  }

  /**
   * 构建源数据引用（用于内容追溯）
   */
  private buildSourceReferences(
    userProfile: Record<string, unknown>,
    job: { id: string; title?: string | null; company?: string | null }
  ): Record<string, unknown> {
    const experiences = userProfile.experiences as Array<{ id?: string; company?: string; position?: string }> || [];
    const projects = userProfile.projects as Array<{ id?: string; name?: string; role?: string }> || [];
    const skills = userProfile.skills as Array<{ id?: string; name?: string }> || [];
    const educations = userProfile.educations as Array<{ id?: string; school?: string; major?: string }> || [];

    return {
      generatedAt: new Date().toISOString(),
      sources: {
        profile: {
          id: userProfile.profileId as string,
          type: 'user_profile',
          name: userProfile.name as string,
          dataIncluded: ['基本信息', '工作经历', '项目经历', '技能', '教育经历'],
        },
        job: {
          id: job.id,
          type: 'job_posting',
          title: job.title,
          company: job.company,
        },
        experiences: experiences.map((exp) => ({
          id: exp.id,
          type: 'experience',
          company: exp.company,
          position: exp.position,
          source: 'user_input',
        })),
        projects: projects.map((proj) => ({
          id: proj.id,
          type: 'project',
          name: proj.name,
          role: proj.role,
          source: 'user_input',
        })),
        skills: skills.map((skill) => ({
          id: skill.id,
          type: 'skill',
          name: skill.name,
          source: 'user_input_or_ai_discovered',
        })),
        educations: educations.map((edu) => ({
          id: edu.id,
          type: 'education',
          school: edu.school,
          major: edu.major,
          source: 'user_input',
        })),
      },
      aiProcessing: {
        model: 'deepseek-chat',
        operations: [
          { type: 'summarization', description: '个人简介根据档案亮点和岗位要求生成' },
          { type: 'skill_matching', description: '技能根据岗位要求和用户技能匹配' },
          { type: 'experience_optimization', description: '工作经历描述根据岗位要求优化' },
          { type: 'content_generation', description: '简历内容基于用户真实数据生成，无虚假信息' },
        ],
      },
    };
  }

  /**
   * 标记工作经历的来源
   */
  private markExperienceSources(
    aiExperiences: Array<unknown>,
    originalExperiences: Array<{ id?: string; company?: string }>
  ): { list: Array<unknown>; _source: string; _basedOn: string[] } {
    if (!aiExperiences || !Array.isArray(aiExperiences)) {
      return { list: [], _source: 'none', _basedOn: [] };
    }

    const markedExperiences = aiExperiences.map((exp: Record<string, unknown>) => {
      // 尝试匹配原始工作经历
      const expCompany = exp.company as string;
      const originalExp = originalExperiences?.find(
        (oe) => oe.company === expCompany || (expCompany && oe.company?.includes(expCompany))
      );

      return {
        ...exp,
        _meta: {
          source: originalExp ? 'ai_optimized' : 'ai_generated',
          originalId: originalExp?.id || null,
          note: originalExp
            ? '此内容基于用户真实工作经历由 AI 优化'
            : '此内容由 AI 根据岗位要求生成建议',
        },
      };
    });

    return {
      list: markedExperiences,
      _source: 'ai_optimized',
      _basedOn: ['profile.experiences', 'job.requirements'],
    };
  }

  /**
   * 标记项目经历的来源
   */
  private markProjectSources(
    aiProjects: Array<unknown>,
    originalProjects: Array<{ id?: string; name?: string }>
  ): { list: Array<unknown>; _source: string; _basedOn: string[] } {
    if (!aiProjects || !Array.isArray(aiProjects)) {
      return { list: [], _source: 'none', _basedOn: [] };
    }

    const markedProjects = aiProjects.map((proj: Record<string, unknown>) => {
      // 尝试匹配原始项目
      const projName = proj.name as string;
      const originalProj = originalProjects?.find(
        (op) => op.name === projName || (projName && op.name?.includes(projName))
      );

      return {
        ...proj,
        _meta: {
          source: originalProj ? 'ai_optimized' : 'ai_generated',
          originalId: originalProj?.id || null,
          note: originalProj
            ? '此内容基于用户真实项目经历由 AI 优化'
            : '此内容由 AI 根据岗位要求生成建议',
        },
      };
    });

    return {
      list: markedProjects,
      _source: 'ai_optimized',
      _basedOn: ['profile.projects', 'job.requirements'],
    };
  }

  /**
   * 获取简历内容的来源追溯信息
   */
  async getContentSources(userId: string, resumeId: string): Promise<{
    resume: {
      id: string;
      name: string;
      generatedAt: string | null;
      aiModel: string | null;
    };
    sources: Record<string, unknown>;
    contentBreakdown: Array<{
      section: string;
      source: string;
      basedOn: string[];
      details: string;
    }>;
  }> {
    const resume = await this.getOne(userId, resumeId);

    const content = resume.content as Record<string, unknown> | null;
    const meta = content?._meta as Record<string, unknown> | undefined;

    // 构建内容分解
    const contentBreakdown = [
      {
        section: '个人简介',
        source: (content?.summary as Record<string, unknown>)?._source as string || 'ai_generated',
        basedOn: (content?.summary as Record<string, unknown>)?._basedOn as string[] || ['档案信息', '岗位要求'],
        details: '根据用户档案亮点和目标岗位要求，由 AI 生成个性化的个人简介',
      },
      {
        section: '技能列表',
        source: (content?.skills as Record<string, unknown>)?._source as string || 'ai_curated',
        basedOn: (content?.skills as Record<string, unknown>)?._basedOn as string[] || ['用户技能', '岗位技能要求'],
        details: '根据岗位要求从用户技能库中筛选和排序最相关的技能',
      },
      {
        section: '工作经历',
        source: (content?.experience as Record<string, unknown>)?._source as string || 'ai_optimized',
        basedOn: (content?.experience as Record<string, unknown>)?._basedOn as string[] || ['用户工作经历'],
        details: '基于用户真实工作经历，由 AI 优化描述以匹配目标岗位',
      },
      {
        section: '项目经历',
        source: (content?.projects as Record<string, unknown>)?._source as string || 'ai_optimized',
        basedOn: (content?.projects as Record<string, unknown>)?._basedOn as string[] || ['用户项目经历'],
        details: '基于用户真实项目经历，由 AI 优化描述以匹配目标岗位',
      },
      {
        section: '教育背景',
        source: (content?.education as Record<string, unknown>)?._source as string || 'profile_original',
        basedOn: (content?.education as Record<string, unknown>)?._basedOn as string[] || ['用户教育经历'],
        details: '直接使用用户填写的教育背景信息',
      },
    ];

    return {
      resume: {
        id: resume.id,
        name: resume.name,
        generatedAt: (meta?.generatedAt as string) || null,
        aiModel: (meta?.aiModel as string) || null,
      },
      sources: meta?.sourceReferences as Record<string, unknown> || {},
      contentBreakdown,
    };
  }
}
