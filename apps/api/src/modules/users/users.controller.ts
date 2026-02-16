import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
}
