import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/database/prisma.service';
import { AlipayService } from './alipay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PLAN_CONFIGS } from '../subscriptions/subscriptions.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private alipayService: AlipayService,
    private configService: ConfigService,
  ) {}

  /**
   * 创建支付订单
   */
  async createPayment(userId: string, dto: CreatePaymentDto) {
    const { plan, period = 1 } = dto;

    // 验证套餐
    const planConfig = PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS];
    if (!planConfig || plan === 'free') {
      throw new BadRequestException('无效的套餐');
    }

    // 检查支付宝配置
    if (!this.alipayService.isConfigured()) {
      throw new BadRequestException('支付功能暂未配置，请联系管理员');
    }

    // 计算金额
    const amount = planConfig.price * period;

    // 生成订单号
    const orderNo = this.alipayService.generateOrderNo();

    // 订单标题
    const periodText = period === 1 ? '' : `${period}个月`;
    const subject = `AI求职助手 - ${planConfig.name}${periodText}订阅`;

    // 计算过期时间（30分钟后）
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

    // 创建订单
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        orderNo,
        plan,
        period,
        amount: new Decimal(amount),
        status: 'pending',
        paymentMethod: 'alipay',
        subject,
        expiredAt,
      },
    });

    // 生成支付 URL
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3001/api/v1');

    const returnUrl = `${webUrl}/dashboard/subscription/payment/result?orderNo=${orderNo}`;
    const notifyUrl = `${apiUrl}/payments/callback/notify`;

    const paymentUrl = this.alipayService.createPaymentUrl(
      orderNo,
      amount,
      subject,
      returnUrl,
      notifyUrl,
    );

    this.logger.log(`创建支付订单: userId=${userId}, orderNo=${orderNo}, plan=${plan}, amount=${amount}`);

    return {
      orderNo: payment.orderNo,
      amount: Number(payment.amount),
      subject: payment.subject,
      paymentUrl,
      expiredAt: payment.expiredAt,
    };
  }

  /**
   * 处理支付宝异步通知
   */
  async handleNotify(params: Record<string, string>): Promise<string> {
    this.logger.log('收到支付宝异步通知', JSON.stringify(params));

    // 验证签名
    if (!this.alipayService.verifySign(params)) {
      this.logger.error('支付宝签名验证失败');
      return 'failure';
    }

    const orderNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;

    // 查找订单
    const payment = await this.prisma.payment.findUnique({
      where: { orderNo },
    });

    if (!payment) {
      this.logger.error(`订单不存在: ${orderNo}`);
      return 'failure';
    }

    // 已经处理过的订单
    if (payment.status === 'paid') {
      this.logger.log(`订单已处理: ${orderNo}`);
      return 'success';
    }

    // 订单已关闭
    if (payment.status === 'closed') {
      this.logger.log(`订单已关闭: ${orderNo}`);
      return 'success';
    }

    // 支付成功
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      // 验证金额
      const paidAmount = parseFloat(params.total_amount);
      const orderAmount = Number(payment.amount);

      if (Math.abs(paidAmount - orderAmount) > 0.01) {
        this.logger.error(`金额不匹配: 订单=${orderAmount}, 支付=${paidAmount}`);
        return 'failure';
      }

      // 更新订单状态
      await this.prisma.payment.update({
        where: { orderNo },
        data: {
          status: 'paid',
          outTradeNo: tradeNo,
          paidAt: new Date(),
          notifyData: JSON.parse(JSON.stringify(params)),
        },
      });

      // 升级用户订阅
      await this.upgradeSubscription(payment.userId, payment.plan, payment.period);

      this.logger.log(`支付成功: orderNo=${orderNo}, tradeNo=${tradeNo}`);
      return 'success';
    }

    // 交易关闭
    if (tradeStatus === 'TRADE_CLOSED') {
      await this.prisma.payment.update({
        where: { orderNo },
        data: {
          status: 'closed',
          notifyData: JSON.parse(JSON.stringify(params)),
        },
      });

      this.logger.log(`交易关闭: ${orderNo}`);
      return 'success';
    }

    return 'success';
  }

  /**
   * 查询订单状态
   */
  async getPaymentStatus(userId: string, orderNo: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderNo, userId },
    });

    if (!payment) {
      throw new NotFoundException('订单不存在');
    }

    return {
      orderNo: payment.orderNo,
      plan: payment.plan,
      period: payment.period,
      amount: Number(payment.amount),
      status: payment.status,
      subject: payment.subject,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  /**
   * 获取用户订单历史
   */
  async getPaymentHistory(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return payments.map((p) => ({
      orderNo: p.orderNo,
      plan: p.plan,
      period: p.period,
      amount: Number(p.amount),
      status: p.status,
      subject: p.subject,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));
  }

  /**
   * 升级用户订阅
   */
  private async upgradeSubscription(userId: string, plan: string, period: number) {
    const planConfig = PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS];

    // 计算订阅结束时间
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + period);

    // 更新或创建订阅
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: 'active',
        aiQuota: planConfig.aiQuota,
        resumeQuota: planConfig.resumeQuota,
        interviewQuota: planConfig.interviewQuota,
        startDate: now,
        endDate,
        quotaResetAt: now,
        autoRenew: false,
      },
      update: {
        plan,
        status: 'active',
        aiQuota: planConfig.aiQuota,
        resumeQuota: planConfig.resumeQuota,
        interviewQuota: planConfig.interviewQuota,
        startDate: now,
        endDate,
        quotaResetAt: now,
        canceledAt: null, // 清除取消时间
      },
    });

    this.logger.log(`订阅升级成功: userId=${userId}, plan=${plan}, period=${period}个月`);
  }

  /**
   * 关闭过期订单（定时任务可调用）
   */
  async closeExpiredPayments() {
    const now = new Date();

    const result = await this.prisma.payment.updateMany({
      where: {
        status: 'pending',
        expiredAt: { lt: now },
      },
      data: {
        status: 'closed',
      },
    });

    if (result.count > 0) {
      this.logger.log(`关闭过期订单: ${result.count} 个`);
    }

    return { closed: result.count };
  }
}
