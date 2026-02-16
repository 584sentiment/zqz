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

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  async getList(@Request() req: { user: { userId: string } }, @Query() query: { status?: string; type?: string }) {
    return this.interviewsService.getList(req.user.userId, query);
  }

  @Get('stats')
  async getStats(@Request() req: { user: { userId: string } }) {
    return this.interviewsService.getStats(req.user.userId);
  }

  @Get('categories')
  async getCategories() {
    return this.interviewsService.getQuestionCategories();
  }

  @Get(':id')
  async getOne(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.interviewsService.getOne(req.user.userId, id);
  }

  @Get(':id/report')
  async getReport(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.interviewsService.getReport(req.user.userId, id);
  }

  @Post()
  async create(@Request() req: { user: { userId: string } }, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(req.user.userId, dto);
  }

  @Post(':id/start')
  async start(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.interviewsService.startInterview(req.user.userId, id);
  }

  @Post(':id/answer')
  async submitAnswer(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: SubmitAnswerDto
  ) {
    return this.interviewsService.submitAnswer(req.user.userId, id, dto);
  }

  @Put(':id/abort')
  async abort(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.interviewsService.abortInterview(req.user.userId, id);
  }

  @Delete(':id')
  async delete(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.interviewsService.delete(req.user.userId, id);
  }

  // ============== 面试准备计划 ==============

  @Get('preparations')
  async getPreparationPlans(@Request() req: { user: { userId: string } }) {
    return this.interviewsService.getPreparationPlans(req.user.userId);
  }

  @Get('preparations/:id')
  async getPreparationPlan(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.interviewsService.getPreparationPlan(req.user.userId, id);
  }

  @Post('preparations')
  async createPreparationPlan(
    @Request() req: { user: { userId: string } },
    @Body() body: { jobId?: string; days: number; focusAreas?: string[] },
  ) {
    return this.interviewsService.createPreparationPlan(req.user.userId, body);
  }

  @Post('preparations/:id/complete')
  async completeTask(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { dayIndex: number; taskId: string },
  ) {
    return this.interviewsService.completeTask(req.user.userId, id, body.dayIndex, body.taskId);
  }

  @Delete('preparations/:id')
  async deletePreparationPlan(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.interviewsService.deletePreparationPlan(req.user.userId, id);
  }
}
