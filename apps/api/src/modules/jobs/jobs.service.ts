import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { CreateJobDto, ParseJobTextDto, UpdateJobDto, ParsedJobResult } from './dto/job.dto';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

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
   * 解析岗位文本（简化版本，后续可接入 AI）
   */
  async parseJobText(dto: ParseJobTextDto): Promise<ParsedJobResult> {
    const text = dto.text;

    // 简单的正则提取（后续可替换为 AI 解析）
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

  private extractField(text: string, keywords: string[]): string | undefined {
    for (const keyword of keywords) {
      const patterns = [
        new RegExp(`${keyword}[:：]\\s*([^\\n]+)`, 'i'),
        new RegExp(`${keyword}\\s*[:：]?\\s*([^\\n]+)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
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
  async createFromParsed(userId: string, parsed: ParsedJobResult, sourceText: string) {
    return this.prisma.job.create({
      data: {
        userId,
        title: parsed.title,
        company: parsed.company,
        location: parsed.location,
        sourceType: 'text',
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

    // 抓取网页内容
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(`无法访问该页面: ${response.status}`);
      }

      html = await response.text();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('无法抓取该页面，请检查链接是否正确');
    }

    // 从 HTML 中提取文本内容
    const text = this.extractTextFromHtml(html);

    if (text.length < 50) {
      throw new BadRequestException('页面内容太少，无法解析');
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
}
