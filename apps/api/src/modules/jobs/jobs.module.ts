import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { OcrService } from '@/common/services/ocr.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, OcrService],
  exports: [JobsService],
})
export class JobsModule {}
