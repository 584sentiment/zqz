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
}
