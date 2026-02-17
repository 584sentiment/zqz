import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/database/prisma.service';
import { OcrService } from '@/common/services/ocr.service';
import { JobParsingService } from '@ai-job-assistant/ai';
import { CreateJobDto, ParseJobTextDto, UpdateJobDto, ParsedJobResult } from './dto/job.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly jobParsingService: JobParsingService;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private ocrService: OcrService,
  ) {
    this.jobParsingService = new JobParsingService();
  }

  async create(userId: string, dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        userId,
        title: dto.title,
        company: dto.company,
        location: dto.location,
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl,
        description: dto.description,
        requirements: dto.requirements,
      },
    });
  }

  async findAll(userId: string, options?: { status?: string; skip?: number; take?: number }) {
    const where = {
      userId,
      deletedAt: null,
      ...(options?.status && { status: options.status }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip ?? 0,
        take: options?.take ?? 20,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      pagination: {
        total,
        hasMore: (options?.skip ?? 0) + jobs.length < total,
      },
    };
  }

  async findOne(userId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        userId,
        deletedAt: null,
      },
      include: {
        resumes: true,
        skillSessions: true,
      },
    });

    if (!job) {
      throw new NotFoundException('岗位不存在');
    }

    return job;
  }

  async update(userId: string, jobId: string, dto: UpdateJobDto) {
    // 先检查岗位是否存在
    await this.findOne(userId, jobId);

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        title: dto.title,
        company: dto.company,
        location: dto.location,
        description: dto.description,
        requirements: dto.requirements,
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async remove(userId: string, jobId: string) {
    // 先检查岗位是否存在
    await this.findOne(userId, jobId);

    // 软删除
    return this.prisma.job.update({
      where: { id: jobId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 解析岗位文本（AI 增强版本，带回退）
   */
  async parseJobText(dto: ParseJobTextDto): Promise<ParsedJobResult> {
    const text = dto.text;

    // 首先尝试 AI 解析
    try {
      const aiResult = await this.parseWithAI(text);
      if (aiResult && aiResult.confidence >= 0.7) {
        this.logger.log('AI 岗位解析成功');
        return aiResult;
      }
    } catch (error) {
      this.logger.warn(`AI 解析失败，使用正则回退: ${error}`);
    }

    // 回退到正则解析
    return this.parseWithRegex(text);
  }

  /**
   * 使用 AI 解析岗位描述
   */
  private async parseWithAI(text: string): Promise<ParsedJobResult | null> {
    try {
      const aiResult = await this.jobParsingService.parse(text);

      if (!aiResult) {
        return null;
      }

      // 将 AI 结果映射到 ParsedJobResult 格式
      const result: ParsedJobResult = {
        title: this.validateField(aiResult.title as string) || '',
        company: this.validateField(aiResult.company as string) || '',
        location: this.validateField(aiResult.location as string) || '',
        salary: this.validateField(aiResult.salaryRange as string),
        experience: this.extractExperienceFromAI(aiResult),
        education: this.extractEducationFromAI(aiResult),
        description: this.validateField(aiResult.description as string),
        requirements: this.extractMustHaveFromAI(aiResult),
        niceToHave: this.extractNiceToHaveFromAI(aiResult),
        skills: this.extractSkillsFromAI(aiResult),
        confidence: this.calculateAIConfidence(aiResult),
      };

      return result;
    } catch (error) {
      this.logger.error(`AI 解析异常: ${error}`);
      return null;
    }
  }

  /**
   * 使用正则表达式解析（回退方案）
   */
  private parseWithRegex(text: string): ParsedJobResult {
    const result: ParsedJobResult = {
      title: this.extractField(text, ['职位名称', '岗位名称', '招聘职位', '职位']) || '',
      company: this.extractField(text, ['公司名称', '企业名称', '招聘企业', '公司']) || '',
      location: this.extractField(text, ['工作地点', '工作城市', '地点', '城市']) || '',
      salary: this.extractField(text, ['薪资', '薪酬', '工资', '待遇']),
      experience: this.extractField(text, ['经验', '工作年限', '年限']),
      education: this.extractField(text, ['学历', '教育背景']),
      requirements: [],
      niceToHave: [],
      skills: [],
      confidence: 0.7,
    };

    // 提取技能关键词
    result.skills = this.extractSkills(text);

    // 提取要求
    result.requirements = this.extractRequirements(text);

    return result;
  }

  /**
   * 验证字段值，确保不为空或无效
   */
  private validateField(value: string | undefined | null): string | undefined {
    if (!value || typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * 从 AI 结果中提取经验要求
   */
  private extractExperienceFromAI(aiResult: Record<string, unknown>): string | undefined {
    const requirements = aiResult.requirements as Record<string, unknown> | undefined;
    if (requirements?.experienceYears) {
      return requirements.experienceYears as string;
    }
    return undefined;
  }

  /**
   * 从 AI 结果中提取学历要求
   */
  private extractEducationFromAI(aiResult: Record<string, unknown>): string | undefined {
    const requirements = aiResult.requirements as Record<string, unknown> | undefined;
    if (requirements?.education) {
      return requirements.education as string;
    }
    return undefined;
  }

  /**
   * 从 AI 结果中提取必须具备的要求
   */
  private extractMustHaveFromAI(aiResult: Record<string, unknown>): string[] {
    const requirements = aiResult.requirements as Record<string, unknown> | undefined;
    if (requirements?.mustHave && Array.isArray(requirements.mustHave)) {
      return requirements.mustHave.filter((r): r is string => typeof r === 'string').slice(0, 10);
    }
    if (aiResult.requirements && Array.isArray(aiResult.requirements)) {
      return (aiResult.requirements as string[]).filter((r): r is string => typeof r === 'string').slice(0, 10);
    }
    return [];
  }

  /**
   * 从 AI 结果中提取加分项
   */
  private extractNiceToHaveFromAI(aiResult: Record<string, unknown>): string[] {
    const requirements = aiResult.requirements as Record<string, unknown> | undefined;
    if (requirements?.niceToHave && Array.isArray(requirements.niceToHave)) {
      return requirements.niceToHave.filter((r): r is string => typeof r === 'string').slice(0, 5);
    }
    return [];
  }

  /**
   * 从 AI 结果中提取技能
   */
  private extractSkillsFromAI(aiResult: Record<string, unknown>): string[] {
    const requirements = aiResult.requirements as Record<string, unknown> | undefined;
    if (requirements?.skills && Array.isArray(requirements.skills)) {
      return requirements.skills.filter((s): s is string => typeof s === 'string');
    }
    return [];
  }

  /**
   * 计算 AI 解析的置信度
   */
  private calculateAIConfidence(aiResult: Record<string, unknown>): number {
    let confidence = 0.5;

    // 根据提取到的关键字段调整置信度
    if (aiResult.title) confidence += 0.15;
    if (aiResult.company) confidence += 0.15;
    if (aiResult.location) confidence += 0.05;
    if (aiResult.salaryRange) confidence += 0.05;

    const requirements = aiResult.requirements as Record<string, unknown> | undefined;
    if (requirements?.skills && Array.isArray(requirements.skills) && requirements.skills.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  private extractField(text: string, keywords: string[]): string | undefined {
    for (const keyword of keywords) {
      const patterns = [
        // 【关键词】值 格式
        new RegExp(`【${keyword}】\\s*([^\\n【】]+)`, 'i'),
        // 关键词: 值 或 关键词：值 格式
        new RegExp(`${keyword}[:：]\\s*([^\\n]+)`, 'i'),
        // 关键词 值 格式
        new RegExp(`${keyword}\\s+([^\\n]+)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          // 确保返回值不为空
          if (value.length > 0) {
            return value;
          }
        }
      }
    }
    return undefined;
  }

  private extractSkills(text: string): string[] {
    // 常见技能关键词
    const skillPatterns = [
      /JavaScript|TypeScript|React|Vue|Angular|Node\.js|Python|Java|Go|Rust|PHP/gi,
      /MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch/gi,
      /Docker|Kubernetes|AWS|Azure|GCP|CI\/CD/gi,
      /Git|Linux|Nginx/gi,
      /Figma|Sketch|Photoshop|Illustrator/gi,
      /项目管理|产品经理|数据分析|用户体验|UI\/UX/gi,
      /敏捷|Scrum|Kanban|DevOps/gi,
    ];

    const skills = new Set<string>();
    for (const pattern of skillPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((m) => skills.add(m));
      }
    }

    return Array.from(skills);
  }

  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];

    // 查找要求部分
    const reqPatterns = [
      /(?:任职要求|职位要求|岗位要求|要求)[：:\s]*([\s\S]*?)(?=(?:职责|福利|待遇|薪资|联系方式|$))/gi,
      /(?:职责|工作内容|岗位职责)[：:\s]*([\s\S]*?)(?=(?:要求|福利|待遇|薪资|联系方式|$))/gi,
    ];

    for (const pattern of reqPatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        // 按行分割，过滤空行
        const lines = match[1]
          .split(/[\n•·\-•]/)
          .map((l) => l.trim())
          .filter((l) => l.length > 5);
        requirements.push(...lines.slice(0, 10));
      }
    }

    return requirements;
  }

  /**
   * 创建解析后的岗位
   */
  async createFromParsed(
    userId: string,
    parsed: ParsedJobResult,
    sourceText: string,
    sourceType?: string,
    sourceUrl?: string,
  ) {
    return this.prisma.job.create({
      data: {
        userId,
        title: parsed.title,
        company: parsed.company,
        location: parsed.location,
        sourceType: sourceType || 'text',
        sourceUrl: sourceUrl || null,
        description: sourceText,
        requirements: {
          mustHave: parsed.requirements,
          niceToHave: parsed.niceToHave,
          skills: parsed.skills,
          salary: parsed.salary,
          experience: parsed.experience,
          education: parsed.education,
        },
        matchScore: parsed.confidence,
        matchedSkills: parsed.skills,
      },
    });
  }

  /**
   * 从 URL 抓取岗位信息
   */
  async parseJobUrl(url: string): Promise<ParsedJobResult> {
    // 验证 URL
    try {
      new URL(url);
    } catch {
      throw new BadRequestException('无效的 URL');
    }

    // 检测已知的需要特殊处理的招聘网站
    const problematicSites = [
      'zhipin.com',      // Boss 直聘 - 需要登录 + JS 渲染
      'liepin.com',      // 猎聘 - 需要登录
      '51job.com',       // 前程无忧 - 反爬虫严格
      'zhaopin.com',     // 智联招聘 - 反爬虫严格
    ];

    const isProblematicSite = problematicSites.some((site) => url.includes(site));

    if (isProblematicSite) {
      throw new BadRequestException(
        '该招聘网站需要登录或使用动态加载，无法直接解析。请复制职位描述内容，使用"文本导入"功能。',
      );
    }

    // 抓取网页内容
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new BadRequestException(`无法访问该页面: HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('无法抓取该页面，请检查链接是否正确或尝试使用文本导入');
    }

    // 从 HTML 中提取文本内容
    const text = this.extractTextFromHtml(html);

    if (text.length < 100) {
      throw new BadRequestException(
        '页面内容太少，可能是该网站使用了动态加载。请复制职位描述内容，使用"文本导入"功能。',
      );
    }

    // 使用现有的文本解析方法
    const result = await this.parseJobText({ text });

    // 更新置信度（URL 解析置信度略低）
    result.confidence = Math.min(result.confidence, 0.8);

    return result;
  }

  /**
   * 从 HTML 中提取纯文本
   */
  private extractTextFromHtml(html: string): string {
    // 移除 script 和 style 标签
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

    // 将块级元素替换为换行
    text = text
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/dd>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n');

    // 移除所有 HTML 标签
    text = text.replace(/<[^>]+>/g, ' ');

    // 解码 HTML 实体
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 清理多余空白
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return text;
  }

  /**
   * 从图片解析岗位信息
   * 流程：OCR 识别文字 → DeepSeek 结构化解析
   */
  async parseJobImage(imageBase64: string): Promise<ParsedJobResult> {
    // 检查 OCR 服务是否可用
    if (!this.ocrService.isEnabled()) {
      throw new BadRequestException(
        '图片解析功能需要配置腾讯云 OCR。请在 .env 文件中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY，' +
        '或使用"文本导入"功能直接粘贴职位描述。',
      );
    }

    try {
      // 步骤 1: 使用 OCR 识别图片中的文字
      this.logger.log('开始 OCR 识别...');
      const ocrResult = await this.ocrService.recognizeFromBase64(imageBase64);

      if (!ocrResult.text || ocrResult.text.trim().length < 50) {
        throw new BadRequestException('图片中未检测到足够的文字内容，请确保图片包含清晰的职位描述');
      }

      this.logger.log(`OCR 识别完成，提取到 ${ocrResult.text.length} 个字符，置信度 ${((ocrResult.confidence || 0) * 100).toFixed(1)}%`);

      // 步骤 2: 使用 DeepSeek 对识别出的文字进行结构化解析
      this.logger.log('开始 AI 结构化解析...');
      const parsedResult = await this.parseTextWithAI(ocrResult.text);

      // 综合 OCR 置信度和 AI 置信度
      const ocrConfidence = ocrResult.confidence || 0.8;
      parsedResult.confidence = Math.min(parsedResult.confidence || 0.7, ocrConfidence);

      this.logger.log(`图片解析完成，职位: ${parsedResult.title || '未知'}`);
      return parsedResult;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`图片解析失败: ${error}`);
      throw new BadRequestException(
        `图片解析失败: ${error instanceof Error ? error.message : '未知错误'}。请确保图片清晰且包含职位信息。`,
      );
    }
  }

  /**
   * 使用 DeepSeek 对文本进行结构化解析
   */
  private async parseTextWithAI(text: string): Promise<ParsedJobResult> {
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY || this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!deepseekApiKey || deepseekApiKey === 'sk-your-deepseek-api-key') {
      // 如果没有配置 DeepSeek，使用本地正则解析
      this.logger.warn('DeepSeek API Key 未配置，使用本地正则解析');
      return this.parseJobText({ text });
    }

    const systemPrompt = `你是一个专业的招聘信息解析助手。请从给定的文本中提取招聘信息，并以JSON格式返回。
返回格式要求：
{
  "title": "职位名称",
  "company": "公司名称",
  "location": "工作地点",
  "salary": "薪资范围（如果有）",
  "experience": "经验要求（如果有）",
  "education": "学历要求（如果有）",
  "requirements": ["任职要求1", "任职要求2"],
  "niceToHave": ["加分项1"],
  "skills": ["技能1", "技能2"],
  "confidence": 0.8
}
confidence 是解析置信度，0-1之间。如果信息不完整或格式不标准，置信度应较低。
只返回 JSON，不要有其他文字。`;

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`DeepSeek API error: ${errorText}`);
        throw new Error(`DeepSeek API 调用失败 (${response.status})`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek 未返回有效响应');
      }

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error(`DeepSeek response: ${content}`);
        throw new Error('无法从 DeepSeek 响应中解析 JSON');
      }

      const result: ParsedJobResult = JSON.parse(jsonMatch[0]);

      // 验证必要字段
      if (!result.title) {
        result.title = '未知职位';
        result.confidence = Math.min(result.confidence || 0.5, 0.3);
      }

      return result;
    } catch (error) {
      this.logger.error(`AI 解析失败: ${error}`);
      // 降级到本地正则解析
      this.logger.warn('AI 解析失败，降级到本地正则解析');
      return this.parseJobText({ text });
    }
  }
}
