import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: { user: { id: string; email: string } }) {
    return this.authService.login({
      email: req.user.email,
      password: '', // 密码已在 guard 中验证
    });
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    // TODO: 实现 refresh token 逻辑
    return { message: 'Not implemented yet' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    // TODO: 实现 logout 逻辑
  }
}
