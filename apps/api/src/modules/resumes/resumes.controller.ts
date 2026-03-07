import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RequireQuota } from '@/common/decorators/quota.decorator';
import { ContentSafetyGuard } from '@/common/guards/content-safety.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

// 高级模板 ID 列表
const PREMIUM_TEMPLATES = ['creative', 'executive'];

// DTO 定义
class GetSuggestionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sections?: string[];
}

class OptimizeSectionDto {
  @IsString()
  sectionType!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(['professional', 'concise', 'detailed'])
  style?: 'professional' | 'concise' | 'detailed';
}

class AnalyzeLayoutDto {
  @IsArray()
  shapes!: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    bounds?: { x: number; y: number; w: number; h: number };
    props?: Record<string, unknown>;
  }>;

  @IsOptional()
  @IsArray()
  textContent?: Array<{ id: string; text: string; type: string }>;
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(
    private resumesService: ResumesService,
    private subscriptionsService: SubscriptionsService
  ) {}

  /**
   * 获取简历列表
   */
  @Get()
  async getList(
    @Request() req: { user: { id: string } },
    @Query('jobId') jobId?: string,
    @Query('status') status?: string
  ) {
    return this.resumesService.getList(req.user.id, { jobId, status });
  }

  /**
   * 获取可用模板
   */
  @Get('templates')
  async getTemplates() {
    return this.resumesService.getTemplates();
  }

  /**
   * 获取单个简历
   */
  @Get(':id')
  async getOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.getOne(req.user.id, id);
  }

  /**
   * 获取简历内容来源追溯信息
   */
  @Get(':id/sources')
  async getContentSources(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.getContentSources(req.user.id, id);
  }

  /**
   * 获取简历版本历史
   */
  @Get(':id/versions')
  async getVersionHistory(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.getVersionHistory(req.user.id, id);
  }

  /**
   * 获取特定版本内容
   */
  @Get(':id/versions/:versionId')
  async getVersion(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Param('versionId') versionId: string
  ) {
    return this.resumesService.getVersion(req.user.id, id, versionId);
  }

  /**
   * 恢复到历史版本
   */
  @Post(':id/versions/:versionId/restore')
  async restoreVersion(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Param('versionId') versionId: string
  ) {
    return this.resumesService.restoreVersion(req.user.id, id, versionId);
  }

  /**
   * 创建简历（需要简历配额）
   */
  @Post()
  @RequireQuota('resume')
  async create(
    @Request() req: { user: { id: string } },
    @Body() body: { name: string; jobId?: string; templateId?: string; language?: string }
  ) {
    // 检查高级模板权限
    if (body.templateId && PREMIUM_TEMPLATES.includes(body.templateId)) {
      const subscription = await this.subscriptionsService.getSubscription(req.user.id);
      if (subscription.plan === 'free') {
        throw new ForbiddenException({
          statusCode: 403,
          message: '高级模板仅限付费用户使用',
          error: 'Premium Template Required',
          data: {
            templateId: body.templateId,
            upgradeRequired: true,
            currentPlan: subscription.plan,
          },
        });
      }
    }

    return this.resumesService.create(req.user.id, body);
  }

  /**
   * 更新简历（如果更新为 generating 状态需要检查配额）
   */
  @Put(':id')
  @UseGuards(ContentSafetyGuard)
  async update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.resumesService.update(req.user.id, id, body);
  }

  /**
   * 复制简历
   */
  @Post(':id/duplicate')
  async duplicate(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.duplicate(req.user.id, id);
  }

  /**
   * 分析匹配度
   */
  @Get(':id/match')
  async analyzeMatch(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.analyzeMatch(req.user.id, id);
  }

  /**
   * AI 生成简历内容
   */
  @Post(':id/generate')
  async generateResume(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.generateResume(req.user.id, id);
  }

  /**
   * 获取简历优化建议
   */
  @Post(':id/suggestions')
  @RequireQuota('ai')
  async getSuggestions(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: GetSuggestionsDto
  ) {
    return this.resumesService.getSuggestions(req.user.id, id, body.sections);
  }

  /**
   * 一键润色/重写区块
   */
  @Post(':id/optimize-section')
  @RequireQuota('ai')
  async optimizeSection(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: OptimizeSectionDto
  ) {
    return this.resumesService.optimizeSection(
      req.user.id,
      id,
      body.sectionType,
      body.content,
      body.style
    );
  }

  /**
   * 获取岗位关键词
   */
  @Get(':id/job-keywords')
  async getJobKeywords(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.getJobKeywords(req.user.id, id);
  }

  /**
   * 导出 PDF（需要简历配额）
   */
  @Get(':id/export')
  @RequireQuota('resume')
  async exportPdf(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.generatePdf(req.user.id, id);
  }

  /**
   * 导出 Word（需要简历配额）
   */
  @Get(':id/export-word')
  @RequireQuota('resume')
  async exportWord(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.generateWord(req.user.id, id);
  }

  /**
   * 删除简历
   */
  @Delete(':id')
  async delete(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.delete(req.user.id, id);
  }

  /**
   * AI 布局分析
   */
  @Post(':id/analyze-layout')
  @RequireQuota('ai')
  async analyzeLayout(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: AnalyzeLayoutDto
  ) {
    try {
      const result = await this.resumesService.analyzeLayout(
        req.user.id,
        id,
        body.shapes,
        body.textContent
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '布局分析失败',
      };
    }
  }
}
