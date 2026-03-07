/**
 * AI 反馈覆盖层组件
 * 在 AI 操作过程中显示视觉反馈
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Check, AlertCircle, Info } from 'lucide-react';

interface AIFFeedbackOverlayProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 当前操作描述 */
  currentAction?: string;
  /** 进度 (0-100) */
  progress?: number;
  /** 错误信息 */
  error?: string;
  /** 关闭回调 */
  onClose: () => void;
}

