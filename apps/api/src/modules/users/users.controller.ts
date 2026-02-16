import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@Request() req: { user: { id: string } }) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  async updateProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  // 教育经历
  @Get('me/educations')
  async getEducations(@Request() req: { user: { id: string } }) {
    return this.usersService.getEducations(req.user.id);
  }

  @Post('me/educations')
  async createEducation(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateEducationDto,
  ) {
    return this.usersService.createEducation(req.user.id, dto);
  }

  @Get('me/educations/:id')
  async getEducation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.getEducation(req.user.id, id);
  }

  @Patch('me/educations/:id')
  async updateEducation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.usersService.updateEducation(req.user.id, id, dto);
  }

  @Delete('me/educations/:id')
  async deleteEducation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.deleteEducation(req.user.id, id);
  }

  // 工作经历
  @Get('me/experiences')
  async getExperiences(@Request() req: { user: { id: string } }) {
    return this.usersService.getExperiences(req.user.id);
  }

  @Post('me/experiences')
  async createExperience(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateExperienceDto,
  ) {
    return this.usersService.createExperience(req.user.id, dto);
  }

  @Get('me/experiences/:id')
  async getExperience(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.getExperience(req.user.id, id);
  }

  @Patch('me/experiences/:id')
  async updateExperience(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.usersService.updateExperience(req.user.id, id, dto);
  }

  @Delete('me/experiences/:id')
  async deleteExperience(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.deleteExperience(req.user.id, id);
  }

  // 项目经历
  @Get('me/projects')
  async getProjects(@Request() req: { user: { id: string } }) {
    return this.usersService.getProjects(req.user.id);
  }

  @Post('me/projects')
  async createProject(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateProjectDto,
  ) {
    return this.usersService.createProject(req.user.id, dto);
  }

  @Get('me/projects/:id')
  async getProject(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.getProject(req.user.id, id);
  }

  @Patch('me/projects/:id')
  async updateProject(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.usersService.updateProject(req.user.id, id, dto);
  }

  @Delete('me/projects/:id')
  async deleteProject(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.deleteProject(req.user.id, id);
  }

  // 技能标签
  @Get('me/skills')
  async getSkills(@Request() req: { user: { id: string } }) {
    return this.usersService.getSkills(req.user.id);
  }

  @Post('me/skills')
  async createSkill(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateSkillDto,
  ) {
    return this.usersService.createSkill(req.user.id, dto);
  }

  @Get('me/skills/:id')
  async getSkill(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.getSkill(req.user.id, id);
  }

  @Patch('me/skills/:id')
  async updateSkill(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.usersService.updateSkill(req.user.id, id, dto);
  }

  @Delete('me/skills/:id')
  async deleteSkill(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.deleteSkill(req.user.id, id);
  }
}
