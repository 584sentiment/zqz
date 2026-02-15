import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { SkillsModule } from './modules/skills/skills.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Passport 认证模块
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),

    // 业务模块
    AuthModule,
    UsersModule,
    JobsModule,
    ResumesModule,
    InterviewsModule,
    SkillsModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
