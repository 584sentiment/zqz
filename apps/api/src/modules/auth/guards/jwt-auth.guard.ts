import { Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Injectable()
export class JwtAuthGuard extends JwtAuthGuard {
  // 继承自 passport-jwt 策略
}
