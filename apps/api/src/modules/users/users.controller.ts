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
}
