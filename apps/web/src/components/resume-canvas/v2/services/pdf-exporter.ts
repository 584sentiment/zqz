/**
 * V2 PDF 导出器
 * 直接从 Canvas 生成 PDF
 */

import { PDFDocument } from 'pdf-lib';
import type { RenderPlan, StylePreset, PageCommand } from '../types';
import { createRenderEngine } from './render-engine';

export interface PDFExportOptions {
  /** 文件名 */
  filename?: string;
  /** PDF 元数据 */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * 将 Canvas 导出为 PDF
 */
export async function exportToPDF(
  renderPlan: RenderPlan,
  preset: StylePreset,
  options: PDFExportOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // 设置元数据
  if (options.metadata) {
    if (options.metadata.title) {
      pdfDoc.setTitle(options.metadata.title);
    }
    if (options.metadata.author) {
      pdfDoc.setAuthor(options.metadata.author);
    }
    if (options.metadata.subject) {
      pdfDoc.setSubject(options.metadata.subject);
    }
  }

  // 创建离屏 Canvas
  const engine = createRenderEngine(preset);

  // 渲染每一页
  for (const page of renderPlan.pages) {
    await renderPageToPDF(pdfDoc, page, engine);
  }

  // 保存 PDF
  return pdfDoc.save();
}

/**
 * 渲染单页到 PDF
 */
async function renderPageToPDF(
  pdfDoc: PDFDocument,
  page: PageCommand,
  engine: ReturnType<typeof createRenderEngine>
): Promise<void> {
  // 创建离屏 Canvas（1:1 比例，高清）
  const canvas = document.createElement('canvas');
  const dpr = 2; // 使用 2x 分辨率
  canvas.width = page.size.width * dpr;
  canvas.height = page.size.height * dpr;
  canvas.style.width = `${page.size.width}px`;
  canvas.style.height = `${page.size.height}px`;

  // 渲染到 Canvas
  engine.renderPage(page, canvas, dpr);

  // 将 Canvas 转换为 PNG
  const dataUrl = canvas.toDataURL('image/png');
  const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());

  // 嵌入图片
  const image = await pdfDoc.embedPng(imageBytes);

  // 添加页面
  const pdfPage = pdfDoc.addPage([page.size.width, page.size.height]);

  // 绘制图片（填满整个页面）
  pdfPage.drawImage(image, {
    x: 0,
    y: 0,
    width: page.size.width,
    height: page.size.height,
  });
}

/**
 * 下载 PDF
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 创建 V2 PDF 导出器
 */
export function createPDFExporter(renderPlan: RenderPlan, preset: StylePreset) {
  return {
    export: (options?: PDFExportOptions) => exportToPDF(renderPlan, preset, options),
    download: async (filename: string, options?: PDFExportOptions) => {
      const pdfBytes = await exportToPDF(renderPlan, preset, options);
      downloadPDF(pdfBytes, filename);
    },
  };
}
