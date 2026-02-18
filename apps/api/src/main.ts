import * as dotenv from 'dotenv';
import * as path from 'path';

// 在所有其他导入之前加载根目录的 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 增加请求体大小限制（用于图片上传）
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS 配置
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || true,
    credentials: true,
  });

  // API 前缀
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API 服务已启动: http://localhost:${port}/api/v1`);
}

bootstrap();
