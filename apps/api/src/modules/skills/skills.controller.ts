import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  /**
   * 创建新的技能发掘会话
   */
  @Post('discovery/sessions')
  async createSession(
    @Request() req: { user: { id: string } },
    @Body() body: { jobId?: string },
  ) {
    return this.skillsService.createSession(req.user.id, body.jobId);
  }

  /**
   * 获取会话列表
   */
  @Get('discovery/sessions')
  async getSessions(
    @Request() req: { user: { id: string } },
    @Query('status') status?: string,
  ) {
    return this.skillsService.getSessions(req.user.id, status ? { status } : undefined);
  }

  /**
   * 获取单个会话
   */
  @Get('discovery/sessions/:id')
  async getSession(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.skillsService.getSession(req.user.id, id);
  }

  /**
   * 添加发现的技能
   */
  @Post('discovery/sessions/:id/skills')
  async addSkill(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { skill: string },
  ) {
    return this.skillsService.addDiscoveredSkill(req.user.id, id, body.skill);
  }

  /**
   * 更新消息计数
   */
  @Post('discovery/sessions/:id/message')
  async incrementMessage(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.skillsService.incrementMessageCount(req.user.id, id);
  }

  /**
   * 发送聊天消息并获取 AI 响应
   */
  @Post('discovery/sessions/:id/chat')
  async chat(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { message: string; conversationHistory?: Array<{ role: string; content: string }> },
  ) {
    return this.skillsService.chat(req.user.id, id, body.message, body.conversationHistory || []);
  }

  /**
   * 完成会话
   */
  @Post('discovery/sessions/:id/complete')
  async completeSession(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.skillsService.completeSession(req.user.id, id);
  }

  /**
   * 删除会话
   */
  @Delete('discovery/sessions/:id')
  async deleteSession(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.skillsService.deleteSession(req.user.id, id);
  }
}
