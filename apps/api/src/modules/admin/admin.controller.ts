import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AIPerformanceMonitor } from '@ai-job-assistant/ai';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  /**
   * 获取 AI 性能指标
   */
  @Get('ai-metrics')
  async getAIMetrics() {
    const metrics = AIPerformanceMonitor.getAverageMetrics();

    return {
      success: true,
      metrics: {
        avgFirstByteTime: Math.round(metrics.avgFirstByteTime),
        avgTotalTime: Math.round(metrics.avgTotalTime),
        successRate: Math.round(metrics.successRate * 100) / 100,
        p95TotalTime: Math.round(metrics.p95TotalTime),
        // 性能标准
        standards: {
          maxFirstByteTime: 3000, // 3 秒
          maxTotalTime: 30000,    // 30 秒
        },
        // 是否达标
        compliant: {
          firstByte: metrics.avgFirstByteTime <= 3000,
          totalTime: metrics.avgTotalTime <= 30000,
        },
      },
    };
  }

  /**
   * 清除 AI 性能指标
   */
  @Get('ai-metrics/clear')
  async clearAIMetrics() {
    AIPerformanceMonitor.clearMetrics();
    return { success: true, message: 'AI 性能指标已清除' };
  }
}
