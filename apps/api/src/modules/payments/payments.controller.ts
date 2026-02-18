import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 创建支付订单
   * POST /payments/create
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Req() req: { user: { id: string } },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(req.user.id, dto);
  }

  /**
   * 支付宝异步通知
   * POST /payments/callback/notify
   * 注意：此接口无需认证，由支付宝服务器调用
   */
  @Post('callback/notify')
  async handleNotify(@Req() req: Request) {
    // 获取表单数据
    const params = req.body as Record<string, string>;

    // 记录原始请求（调试用）
    this.logger.debug('收到支付宝回调', JSON.stringify(params));
    console.log(JSON.stringify(params), '支付寶回調');

    return this.paymentsService.handleNotify(params);
  }

  /**
   * 查询订单状态
   * GET /payments/status/:orderNo
   */
  @Get('status/:orderNo')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Req() req: { user: { id: string } },
    @Param('orderNo') orderNo: string,
  ) {
    return this.paymentsService.getPaymentStatus(req.user.id, orderNo);
  }

  /**
   * 同步订单状态（从支付宝查询）
   * POST /payments/sync/:orderNo
   */
  @Post('sync/:orderNo')
  @UseGuards(JwtAuthGuard)
  async syncPaymentStatus(
    @Req() req: { user: { id: string } },
    @Param('orderNo') orderNo: string,
  ) {
    return this.paymentsService.syncPaymentStatus(req.user.id, orderNo);
  }

  /**
   * 获取用户订单历史
   * GET /payments/history
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@Req() req: { user: { id: string } }) {
    return this.paymentsService.getPaymentHistory(req.user.id);
  }
}
