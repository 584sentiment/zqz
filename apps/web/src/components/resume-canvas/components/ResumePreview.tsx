'use client';

import React, { useState, useCallback } from 'react';
import { ResumeCanvas } from './ResumeCanvas';
import { PDFExporter } from '../exporters/pdf-exporter';
import { getTemplate, type ResumeTemplate } from '../templates/template-registry';
import type { ResumeContent, LayoutResult } from '../types/resume-canvas.types';
import { A4_PAGE } from '../types/template.types';

interface ResumePreviewProps {
  /** 简历内容 */
  content: ResumeContent;
  /** 模板 ID */
  templateId?: string;
  /** 简历名称（用于下载文件名） */
  resumeName?: string;
  /** 显示工具栏 */
  showToolbar?: boolean;
  /** 显示缩放控制 */
  showZoomControl?: boolean;
  /** 显示页面导航 */
  showPageNav?: boolean;
}

/**
 * 简历预览组件
 * 带工具栏、缩放控制、PDF 导出功能
 */
export const ResumePreview: React.FC<ResumePreviewProps> = ({
  content,
  templateId = 'modern',
  resumeName = '简历',
  showToolbar = true,
  showZoomControl = true,
  showPageNav = true,
}) => {
  const [scale, setScale] = useState(0.8);
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 获取模板
  const template = getTemplate(templateId) || getTemplate('modern')!;

  // 处理布局完成
  const handleLayoutComplete = useCallback((result: LayoutResult) => {
    setLayoutResult(result);
  }, []);

  // 缩放控制
  const handleZoomIn = () => setScale((s) => Math.min(2, s + 0.1));
  const handleZoomOut = () => setScale((s) => Math.max(0.3, s - 0.1));
  const handleZoomReset = () => setScale(0.8);

  // 页面导航
  const handlePrevPage = () => {
    if (currentPage && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  const handleNextPage = () => {
    if (layoutResult && currentPage && currentPage < layoutResult.pages.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  // PDF 导出
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const exporter = new PDFExporter(template);
      const pdfBytes = await exporter.export(content, {
        filename: `${resumeName}.pdf`,
        metadata: {
          title: resumeName,
          author: content.name,
        },
      });
      PDFExporter.download(pdfBytes, `${resumeName}.pdf`);
    } catch (error) {
      console.error('PDF 导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="resume-preview flex flex-col h-full">
      {/* 工具栏 */}
      {showToolbar && (
        <div className="toolbar flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          {/* 左侧：模板信息 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{template.name}</span>
            {template.isPremium && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                高级
              </span>
            )}
          </div>

          {/* 中间：缩放控制 */}
          {showZoomControl && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                disabled={scale <= 0.3}
                title="缩小"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                disabled={scale >= 2}
                title="放大"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-500"
                title="重置"
              >
                重置
              </button>
            </div>
          )}

          {/* 右侧：导出按钮 */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出 PDF
              </>
            )}
          </button>
        </div>
      )}

      {/* 预览区域 */}
      <div
        className="preview-area flex-1 overflow-auto bg-gray-100"
        style={{ minHeight: 0 }}
      >
        <ResumeCanvas
          content={content}
          template={template}
          scale={scale}
          currentPage={currentPage}
          showShadow
          onLayoutComplete={handleLayoutComplete}
        />
      </div>

      {/* 页面导航 */}
      {showPageNav && layoutResult && layoutResult.pages.length > 1 && (
        <div className="page-nav flex items-center justify-center gap-4 py-2 bg-white border-t border-gray-200">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || !currentPage}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600">
            {currentPage || '全部'} / {layoutResult.pages.length} 页
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === layoutResult.pages.length || !currentPage}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentPage(undefined)}
            className="text-sm text-blue-600 hover:underline"
          >
            查看全部
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumePreview;
