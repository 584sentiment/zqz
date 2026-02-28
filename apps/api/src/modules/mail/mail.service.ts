import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// 尝试多个可能的 .env 文件路径
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`[MailService] 已加载 .env 文件: ${envPath}`);
    break;
  }
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    // 优先使用 process.env
    this.fromEmail = process.env.SMTP_FROM || this.configService.get<string>('SMTP_FROM') || 'noreply@example.com';

    // 使用 WEB_URL 作为前端 URL
    this.frontendUrl = process.env.WEB_URL || this.configService.get<string>('WEB_URL') || 'http://localhost:3000';

    this.logger.debug(`Frontend URL: ${this.frontendUrl}`);
    this.initTransporter();
  }

  private initTransporter() {
    // 优先使用 process.env
    const smtpHost = process.env.SMTP_HOST || this.configService.get<string>('SMTP_HOST');
    const smtpPortStr = process.env.SMTP_PORT || this.configService.get<string>('SMTP_PORT');
    const smtpUser = process.env.SMTP_USER || this.configService.get<string>('SMTP_USER');
    const smtpPass = process.env.SMTP_PASS || this.configService.get<string>('SMTP_PASS');

    // 转换端口号
    const smtpPort = smtpPortStr ? parseInt(smtpPortStr, 10) : undefined;

    this.logger.debug(`SMTP 配置: host=${smtpHost}, port=${smtpPort}, user=${smtpUser ? '已设置' : '未设置'}`);

    if (smtpHost && smtpPort) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      });
      this.logger.log(`SMTP 邮件服务已初始化 (${smtpHost}:${smtpPort})`);
    } else {
      this.logger.warn('SMTP 未配置，邮件将仅记录到日志');
      this.logger.debug(`SMTP_HOST: ${smtpHost}, SMTP_PORT: ${smtpPort}`);
    }
  }

  /**
   * 发送验证邮件
   */
  async sendVerificationEmail(email: string, token: string, userName?: string): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const subject = '验证您的邮箱 - AI 求职助手';
    const html = this.getVerificationEmailHtml(verifyUrl, userName);

    return this.sendMail(email, subject, html);
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(email: string, userName?: string): Promise<boolean> {
    const subject = '欢迎加入 AI 求职助手';
    const html = this.getWelcomeEmailHtml(userName);

    return this.sendMail(email, subject, html);
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string, token: string, userName?: string): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = '重置您的密码 - AI 求职助手';
    const html = this.getPasswordResetEmailHtml(resetUrl, userName);

    return this.sendMail(email, subject, html);
  }

  /**
   * 发送自定义邮件（用于通知等场景）
   */
  async sendCustomEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.sendMail(to, subject, html);
  }

  /**
   * 发送邮件
   */
  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const mailOptions = {
      from: `"AI 求职助手" <${this.fromEmail}>`,
      to,
      subject,
      html,
    };

    // 如果没有配置 SMTP，仅记录日志
    if (!this.transporter) {
      this.logger.log(`[模拟邮件] 发送至: ${to}`);
      this.logger.log(`主题: ${subject}`);
      this.logger.debug(`内容: ${html.substring(0, 200)}...`);
      return true;
    }

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`邮件已发送至: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`发送邮件失败: ${error}`);
      return false;
    }
  }

  private getVerificationEmailHtml(verifyUrl: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI 求职助手</div>
          </div>
          <div class="content">
            <h2>您好，${userName || '用户'}！</h2>
            <p>感谢您注册 AI 求职助手。请点击下方按钮验证您的邮箱地址：</p>
            <p style="text-align: center;">
              <a href="${verifyUrl}" class="button">验证邮箱</a>
            </p>
            <p>或复制以下链接到浏览器：</p>
            <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
            <p>此链接将在 24 小时后过期。如果您没有注册账号，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AI 求职助手. 保留所有权利.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailHtml(userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI 求职助手</div>
          </div>
          <div class="content">
            <h2>欢迎加入，${userName || '用户'}！</h2>
            <p>您的邮箱已验证成功，现在可以开始使用 AI 求职助手的全部功能了。</p>
            <p>您可以：</p>
            <ul>
              <li>导入心仪的岗位信息</li>
              <li>让 AI 帮您生成定制简历</li>
              <li>进行 AI 模拟面试</li>
              <li>发掘您的核心技能</li>
            </ul>
            <p>祝您求职顺利！</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AI 求职助手. 保留所有权利.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailHtml(resetUrl: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; }
          .warning { background: #FEF3C7; padding: 12px; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI 求职助手</div>
          </div>
          <div class="content">
            <h2>您好，${userName || '用户'}！</h2>
            <p>我们收到了重置您密码的请求。请点击下方按钮重置您的密码：</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">重置密码</a>
            </p>
            <p>或复制以下链接到浏览器：</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>此链接将在 1 小时后过期。</p>
            <div class="warning">
              <p style="margin: 0; font-size: 14px;">⚠️ 如果您没有请求重置密码，请忽略此邮件。您的密码不会被更改。</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AI 求职助手. 保留所有权利.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
