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

  // 沙箱网关地址（新版）
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
    const params: Record<string, string> = {
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
    const sign = this.generateSign(params);
    params.sign = sign;

    // 构建完整 URL
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      urlParams.append(key, value);
    }

    return `${this.sandboxGateway}?${urlParams.toString()}`;
  }

  /**
   * 查询支付宝订单状态
   * 文档: https://opendocs.alipay.com/apis/api_1/alipay.trade.query
   */
  async queryTrade(orderNo: string): Promise<{
    success: boolean;
    code?: string;
    msg?: string;
    tradeStatus?: string;
    tradeNo?: string;
    totalAmount?: number;
    rawResponse?: unknown;
  }> {
    if (!this.isConfigured()) {
      return { success: false, msg: '支付宝配置不完整' };
    }

    try {
      // 构建请求参数
      const params: Record<string, string> = {
        app_id: this.appId,
        method: 'alipay.trade.query',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: this.formatTime(new Date()),
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: orderNo,
        }),
      };

      // 生成签名
      const sign = this.generateSign(params);
      params.sign = sign;

      // 记录请求参数（调试用）
      this.logger.debug(`支付宝查询请求参数: ${JSON.stringify(params, null, 2)}`);

      // 发送请求
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        formData.append(key, value);
      }

      const response = await fetch(this.sandboxGateway, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseText = await response.text();
      this.logger.log(`支付宝查询原始响应: ${responseText}`);

      // 解析响应
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(responseText);
      } catch {
        this.logger.error(`支付宝响应解析失败，非 JSON 格式: ${responseText}`);
        return { success: false, msg: '响应格式错误', rawResponse: responseText };
      }

      // 获取查询响应
      const queryResponse = result.alipay_trade_query_response as Record<string, unknown> | undefined;

      if (!queryResponse) {
        this.logger.error(`支付宝响应缺少 alipay_trade_query_response: ${JSON.stringify(result)}`);
        return { success: false, msg: '响应格式错误', rawResponse: result };
      }

      const code = queryResponse.code as string;
      const msg = queryResponse.msg as string;

      // 检查网关返回码
      if (code !== '10000') {
        this.logger.warn(`支付宝查询失败: code=${code}, msg=${msg}, sub_msg=${queryResponse.sub_msg}`);
        return {
          success: false,
          code,
          msg: (queryResponse.sub_msg as string) || msg || '查询失败',
          rawResponse: queryResponse,
        };
      }

      // 查询成功
      const tradeStatus = queryResponse.trade_status as string;
      const tradeNo = queryResponse.trade_no as string;
      const totalAmount = parseFloat(queryResponse.total_amount as string || '0');

      this.logger.log(
        `支付宝查询成功: orderNo=${orderNo}, tradeNo=${tradeNo}, status=${tradeStatus}, amount=${totalAmount}`,
      );

      return {
        success: true,
        code,
        msg,
        tradeStatus,
        tradeNo,
        totalAmount,
        rawResponse: queryResponse,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`支付宝查询异常: ${errorMessage}`);
      return { success: false, msg: errorMessage };
    }
  }

  /**
   * 获取支付宝网关地址
   */
  getGatewayUrl(): string {
    return this.sandboxGateway;
  }

  /**
   * 构建查询请求参数（保留兼容性）
   */
  buildQueryParams(orderNo: string): Record<string, string> {
    const params: Record<string, string> = {
      app_id: this.appId,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatTime(new Date()),
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: orderNo,
      }),
    };

    const sign = this.generateSign(params);
    params.sign = sign;

    return params;
  }

  /**
   * 验证支付宝回调签名
   */
  verifySign(params: Record<string, string>): boolean {
    try {
      const sign = params.sign;
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

      const publicKey = this.formatPublicKey(this.alipayPublicKey);
      return verify.verify(publicKey, sign, 'base64');
    } catch (error) {
      this.logger.error('签名验证失败', error);
      return false;
    }
  }

  /**
   * 生成签名
   * 文档: https://opendocs.alipay.com/common/02kf5q
   */
  private generateSign(params: Record<string, string>): string {
    // 排除 sign 字段，按字母排序
    const sortedKeys = Object.keys(params)
      .filter((key) => key !== 'sign' && params[key] !== undefined && params[key] !== '')
      .sort();

    // 拼接待签名字符串
    const signContent = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');

    this.logger.debug(`待签名内容: ${signContent.substring(0, 200)}...`);

    // 尝试多种私钥格式
    const privateKeysToTry = this.getPrivateKeyVariants(this.privateKey);

    for (const privateKeyPem of privateKeysToTry) {
      try {
        const privateKeyObj = crypto.createPrivateKey({
          key: privateKeyPem,
          format: 'pem',
        });

        const signature = crypto.sign('RSA-SHA256', Buffer.from(signContent), privateKeyObj);
        const sign = signature.toString('base64');

        this.logger.debug(`签名生成成功，长度: ${sign.length}`);
        return sign;
      } catch (error) {
        this.logger.debug(`私钥格式尝试失败: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }

    throw new Error('签名失败，请检查私钥格式');
  }

  /**
   * 获取私钥的各种可能格式变体
   */
  private getPrivateKeyVariants(key: string): string[] {
    const variants: string[] = [];
    const trimmedKey = key.trim();

    // 如果已经是 PEM 格式，直接使用
    if (trimmedKey.includes('-----BEGIN')) {
      variants.push(trimmedKey);
    }

    // 处理纯 base64 格式
    const cleanKey = trimmedKey.replace(/\s/g, '');
    if (!cleanKey.includes('-----BEGIN')) {
      const lines = cleanKey.match(/.{1,64}/g) || [];

      // PKCS#8 格式
      variants.push(`-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`);

      // PKCS#1 RSA 格式
      variants.push(`-----BEGIN RSA PRIVATE KEY-----\n${lines.join('\n')}\n-----END RSA PRIVATE KEY-----`);
    }

    return variants;
  }

  /**
   * 格式化公钥
   */
  private formatPublicKey(key: string): string {
    const trimmedKey = key.trim();

    if (trimmedKey.includes('-----BEGIN')) {
      return trimmedKey;
    }

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
