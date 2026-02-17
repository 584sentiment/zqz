import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 支付宝沙箱服务
 * 文档: https://opendocs.alipay.com/open/common/105193
 */
@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);

  // 沙箱网关地址
  private readonly sandboxGateway = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

  // 支付宝配置
  private appId: string;
  private privateKey: string;
  private alipayPublicKey: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('ALIPAY_SANDBOX_APP_ID', '');
    this.privateKey = this.configService.get<string>('ALIPAY_SANDBOX_PRIVATE_KEY', '');
    this.alipayPublicKey = this.configService.get<string>('ALIPAY_SANDBOX_PUBLIC_KEY', '');
  }

  /**
   * 检查支付宝配置是否完整
   */
  isConfigured(): boolean {
    return !!(this.appId && this.privateKey && this.alipayPublicKey);
  }

  /**
   * 生成订单号
   * 格式: 时间戳 + 随机数
   */
  generateOrderNo(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `PAY${timestamp}${random}`;
  }

  /**
   * 生成支付 URL
   * @param orderNo 订单号
   * @param amount 金额
   * @param subject 订单标题
   * @param returnUrl 同步跳转地址
   * @param notifyUrl 异步通知地址
   */
  createPaymentUrl(
    orderNo: string,
    amount: number,
    subject: string,
    returnUrl: string,
    notifyUrl: string,
  ): string {
    if (!this.isConfigured()) {
      throw new Error('支付宝配置不完整');
    }

    // 公共请求参数
    const commonParams = {
      app_id: this.appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      return_url: returnUrl,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatTime(new Date()),
      version: '1.0',
      notify_url: notifyUrl,
      biz_content: JSON.stringify({
        out_trade_no: orderNo,
        total_amount: amount.toFixed(2),
        subject: subject,
        product_code: 'FAST_INSTANT_TRADE_PAY',
      }),
    };

    // 生成签名
    const sign = this.generateSign(commonParams);

    // 构建完整 URL
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(commonParams)) {
      params.append(key, value as string);
    }
    params.append('sign', sign);

    return `${this.sandboxGateway}?${params.toString()}`;
  }

  /**
   * 验证支付宝回调签名
   * @param params 回调参数
   */
  verifySign(params: Record<string, string>): boolean {
    try {
      const sign = params.sign;
      const signType = params.sign_type || 'RSA2';

      if (!sign) {
        this.logger.error('签名不存在');
        return false;
      }

      // 获取需要签名的参数（排除 sign 和 sign_type）
      const signParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        if (key !== 'sign' && key !== 'sign_type' && value) {
          signParams[key] = value;
        }
      }

      // 按字母排序
      const sortedKeys = Object.keys(signParams).sort();
      const signContent = sortedKeys.map((key) => `${key}=${signParams[key]}`).join('&');

      // 验证签名
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signContent);

      // 格式化公钥
      const publicKey = this.formatPublicKey(this.alipayPublicKey);

      return verify.verify(publicKey, sign, 'base64');
    } catch (error) {
      this.logger.error('签名验证失败', error);
      return false;
    }
  }

  /**
   * 生成签名
   */
  private generateSign(params: Record<string, unknown>): string {
    // 排除 sign 字段，按字母排序
    const sortedKeys = Object.keys(params)
      .filter((key) => key !== 'sign' && params[key] !== undefined && params[key] !== '')
      .sort();

    // 拼接待签名字符串
    const signContent = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');

    // 格式化私钥，尝试多种格式
    const privateKeysToTry = this.getPrivateKeyVariants(this.privateKey);

    let lastError: Error | null = null;

    for (const privateKeyPem of privateKeysToTry) {
      try {
        // 使用 crypto.createPrivateKey 创建密钥对象
        const privateKeyObj = crypto.createPrivateKey({
          key: privateKeyPem,
          format: 'pem',
        });

        // RSA2 签名
        const signature = crypto.sign('RSA-SHA256', Buffer.from(signContent), privateKeyObj);
        return signature.toString('base64');
      } catch (error) {
        lastError = error as Error;
        // 继续尝试下一种格式
        continue;
      }
    }

    // 所有格式都失败
    this.logger.error('签名失败，尝试了多种私钥格式均失败', lastError);
    throw new Error(
      '签名失败，请检查私钥格式。确保使用 PKCS#8 格式的私钥（以 -----BEGIN PRIVATE KEY----- 开头）',
    );
  }

  /**
   * 获取私钥的各种可能格式变体
   * 返回多种格式的私钥，用于逐一尝试
   */
  private getPrivateKeyVariants(key: string): string[] {
    const variants: string[] = [];
    const trimmedKey = key.trim();
    const cleanKey = trimmedKey.replace(/\s/g, '');
    const lines = cleanKey.match(/.{1,64}/g) || [];

    // 1. 如果已经是 PEM 格式，直接使用
    if (trimmedKey.includes('-----BEGIN')) {
      variants.push(trimmedKey);
    }

    // 2. PKCS#8 格式（推荐）
    variants.push(`-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`);

    // 3. PKCS#1 RSA 格式（旧版支付宝可能使用）
    variants.push(`-----BEGIN RSA PRIVATE KEY-----\n${lines.join('\n')}\n-----END RSA PRIVATE KEY-----`);

    return variants;
  }

  /**
   * 格式化私钥（已弃用，使用 getPrivateKeyVariants 代替）
   * 支持原始 base64、PKCS#1 和 PKCS#8 格式
   * @deprecated
   */
  private formatPrivateKey(key: string): string {
    const trimmedKey = key.trim();

    // 如果已经是 PEM 格式（包含 BEGIN），直接返回
    if (trimmedKey.includes('-----BEGIN')) {
      return trimmedKey;
    }

    // 原始 base64 格式，需要添加 PEM 头尾
    // 先移除所有空白
    const cleanKey = trimmedKey.replace(/\s/g, '');

    // 格式化为 64 字符每行
    const lines = cleanKey.match(/.{1,64}/g) || [];

    // 尝试 PKCS#8 格式（支付宝推荐）
    return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  /**
   * 格式化公钥
   */
  private formatPublicKey(key: string): string {
    const trimmedKey = key.trim();

    // 如果已经是 PEM 格式
    if (trimmedKey.includes('-----BEGIN')) {
      return trimmedKey;
    }

    // 原始 base64 格式
    const cleanKey = trimmedKey.replace(/\s/g, '');
    const lines = cleanKey.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}
