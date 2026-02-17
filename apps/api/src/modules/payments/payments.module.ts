import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AlipayService } from './alipay.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, AlipayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
