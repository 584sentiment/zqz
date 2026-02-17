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
import { InterviewsService, CreateInterviewDto, SubmitAnswerDto } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireQuota } from '@/common/decorators/quota.decorator';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  async getList(@Request() req: { user: { id: string } }, @Query() query: { status?: string; type?: string }) {
    return this.interviewsService.getList(req.user.id, query);
  }

  @Get('stats')
  async getStats(@Request() req: { user: { id: string } }) {
    return this.interviewsService.getStats(req.user.id);
  }

  @Get('categories')
  async getCategories() {
    return this.interviewsService.getQuestionCategories();
  }

  // 面试题库
  @Get('questions')
  async getQuestionBank(@Query() query: { category?: string; difficulty?: string; search?: string; limit?: string; offset?: string }) {
    return this.interviewsService.getQuestionBank({
      category: query.category,
      difficulty: query.difficulty,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
  }

  @Get('questions/:id')
  async getQuestionDetail(@Param('id') id: string) {
    return this.interviewsService.getQuestionDetail(id);
  }

  @Get(':id')
  async getOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.interviewsService.getOne(req.user.id, id);
  }

  @Get(':id/report')
  async getReport(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.interviewsService.getReport(req.user.id, id);
  }

  @Post()
  async create(@Request() req: { user: { id: string } }, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(req.user.id, dto);
  }

  @Post(':id/start')
  @RequireQuota('interview')
  async start(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.interviewsService.startInterview(req.user.id, id);
  }

  @Post(':id/answer')
  async submitAnswer(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: SubmitAnswerDto
  ) {
    return this.interviewsService.submitAnswer(req.user.id, id, dto);
  }

  @Put(':id/abort')
  async abort(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.interviewsService.abortInterview(req.user.id, id);
  }

  @Delete(':id')
  async delete(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.interviewsService.delete(req.user.id, id);
  }

  // ============== 面试准备计划 ==============

  @Get('preparations')
  async getPreparationPlans(@Request() req: { user: { id: string } }) {
    return this.interviewsService.getPreparationPlans(req.user.id);
  }

  @Get('preparations/:id')
  async getPreparationPlan(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.interviewsService.getPreparationPlan(req.user.id, id);
  }

  @Post('preparations')
  async createPreparationPlan(
    @Request() req: { user: { id: string } },
    @Body() body: { jobId?: string; days: number; focusAreas?: string[] },
  ) {
    return this.interviewsService.createPreparationPlan(req.user.id, body);
  }

  @Post('preparations/:id/complete')
  async completeTask(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { dayIndex: number; taskId: string },
  ) {
    return this.interviewsService.completeTask(req.user.id, id, body.dayIndex, body.taskId);
  }

  @Delete('preparations/:id')
  async deletePreparationPlan(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.interviewsService.deletePreparationPlan(req.user.id, id);
  }
}
