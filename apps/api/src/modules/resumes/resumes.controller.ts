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
} from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private resumesService: ResumesService) {}

  /**
   * 获取简历列表
   */
  @Get()
  async getList(
    @Request() req: { user: { id: string } },
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
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
   * 创建简历
   */
  @Post()
  async create(
    @Request() req: { user: { id: string } },
    @Body() body: { name: string; jobId?: string; templateId?: string; language?: string },
  ) {
    return this.resumesService.create(req.user.id, body);
  }

  /**
   * 更新简历
   */
  @Put(':id')
  async update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
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
   * 导出 PDF
   */
  @Get(':id/export')
  async exportPdf(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.generatePdf(req.user.id, id);
  }

  /**
   * 删除简历
   */
  @Delete(':id')
  async delete(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.resumesService.delete(req.user.id, id);
  }
}
