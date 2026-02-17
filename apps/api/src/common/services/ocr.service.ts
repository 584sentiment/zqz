import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

// 腾讯云 OCR 客户端
const OcrClient = tencentcloud.ocr.v20181119.Client;

export interface OcrResult {
  text: string;
  confidence: number;
  rawResult?: unknown;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private client: InstanceType<typeof OcrClient> | null = null;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const secretId = process.env.TENCENT_SECRET_ID || this.configService.get<string>('TENCENT_SECRET_ID');
    const secretKey = process.env.TENCENT_SECRET_KEY || this.configService.get<string>('TENCENT_SECRET_KEY');

    this.enabled = !!(secretId && secretKey);

    if (this.enabled) {
      this.client = new OcrClient({
        credential: {
          secretId,
          secretKey,
        },
        region: 'ap-guangzhou', // 华南地区，可根据需要调整
        profile: {
          httpProfile: {
            endpoint: 'ocr.tencentcloudapi.com',
          },
        },
      });
      this.logger.log('腾讯云 OCR 服务已初始化');
    } else {
      this.logger.warn('腾讯云 OCR 未配置，图片解析功能将不可用。请配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY');
    }
  }

  /**
   * 检查 OCR 服务是否可用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 从 Base64 图片识别文字
   * @param imageBase64 图片的 Base64 编码（不含 data:image/xxx;base64, 前缀）
   * @returns OCR 识别结果
   */
  async recognizeFromBase64(imageBase64: string): Promise<OcrResult> {
    if (!this.client) {
      throw new Error('腾讯云 OCR 服务未配置');
    }

    try {
      this.logger.debug('开始 OCR 识别...');

      // 使用通用印刷体识别
      const response = await this.client.GeneralAccurateOCR({
        ImageBase64: imageBase64,
        // 是否开启 PDF 识别，默认不开启
        IsPdf: false,
      });

      this.logger.debug(`OCR 识别完成，检测到 ${response.TextDetections?.length || 0} 个文本区域`);

      // 提取所有文本
      const textDetections = response.TextDetections || [];
      const lines: string[] = [];
      let totalConfidence = 0;

      for (const detection of textDetections) {
        if (detection.DetectedText) {
          lines.push(detection.DetectedText);
          totalConfidence += detection.Confidence || 0;
        }
      }

      const avgConfidence = textDetections.length > 0 ? totalConfidence / textDetections.length / 100 : 0;

      return {
        text: lines.join('\n'),
        confidence: Math.min(avgConfidence, 1),
        rawResult: response,
      };
    } catch (error) {
      this.logger.error(`OCR 识别失败: ${error}`);
      throw new Error(`OCR 识别失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从图片 URL 识别文字
   * @param imageUrl 图片 URL
   * @returns OCR 识别结果
   */
  async recognizeFromUrl(imageUrl: string): Promise<OcrResult> {
    if (!this.client) {
      throw new Error('腾讯云 OCR 服务未配置');
    }

    try {
      this.logger.debug(`从 URL 开始 OCR 识别: ${imageUrl}`);

      const response = await this.client.GeneralAccurateOCR({
        ImageUrl: imageUrl,
      });

      const textDetections = response.TextDetections || [];
      const lines: string[] = [];
      let totalConfidence = 0;

      for (const detection of textDetections) {
        if (detection.DetectedText) {
          lines.push(detection.DetectedText);
          totalConfidence += detection.Confidence || 0;
        }
      }

      const avgConfidence = textDetections.length > 0 ? totalConfidence / textDetections.length / 100 : 0;

      return {
        text: lines.join('\n'),
        confidence: Math.min(avgConfidence, 1),
        rawResult: response,
      };
    } catch (error) {
      this.logger.error(`OCR 识别失败: ${error}`);
      throw new Error(`OCR 识别失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
