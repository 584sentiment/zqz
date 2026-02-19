import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    forwardRef(() => SecurityModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, GitHubStrategy, LoginRateLimitGuard, LocalAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
