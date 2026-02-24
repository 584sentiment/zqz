'use client';

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, QrCode, RefreshCw, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';

// 类型定义
interface WechatQrResponse {
  qrUrl: string;
  state: string;
  expiresIn: number;
}

interface WechatStatusResponse {
  status: 'pending' | 'scanned' | 'confirmed' | 'expired';
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Dialog 状态管理 Context
interface DialogStateContextValue {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const DialogStateContext = createContext<DialogStateContextValue | undefined>(undefined);

export function useWechatDialog() {
  const context = useContext(DialogStateContext);
  if (!context) {
    throw new Error('useWechatDialog must be used within WechatQRModalProvider');
  }
  return context;
}

interface WechatQRModalProviderProps {
  children: React.ReactNode;
}

/**
 * 微信登录弹窗 Provider
 */
export function WechatQRModalProvider({ children }: WechatQRModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  return (
    <DialogStateContext.Provider value={{ isOpen, openDialog, closeDialog }}>
      {children}
      <WechatQRModal />
    </DialogStateContext.Provider>
  );
}

/**
 * 微信扫码登录弹窗组件
 */
function WechatQRModal() {
  const { isOpen, closeDialog } = useWechatDialog();
  const router = useRouter();
  const { toast } = useToast();
  const { setTokens, setUser } = useAuthStore();

  // 状态管理
  const [qrUrl, setQrUrl] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loginStatus, setLoginStatus] = useState<'pending' | 'scanned' | 'confirmed' | 'success'>('pending');
  const [error, setError] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMounted = useRef(false);

  // 获取二维码
  const fetchQRCode = useCallback(async () => {
    setLoading(true);
    setError('');
    setIsExpired(false);
    setLoginStatus('pending');

    try {
      const response = await apiClient.get<WechatQrResponse>('/auth/wechat/qr');
      setQrUrl(response.data.qrUrl);
      setState(response.data.state);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取二维码失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 开始轮询登录状态
  const startPolling = useCallback((stateValue: string) => {
    // 清除之前的轮询
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置 5 分钟超时
    timeoutRef.current = setTimeout(() => {
      setIsExpired(true);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }, 5 * 60 * 1000);

    // 每 2 秒轮询一次
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get<WechatStatusResponse>('/auth/wechat/status', {
          params: { state: stateValue },
        });
        const result = response.data;

        if (result.status === 'confirmed' && result.tokens && result.user) {
          // 登录成功
          setLoginStatus('success');
          setTokens(result.tokens.accessToken, result.tokens.refreshToken);
          setUser({
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            avatarUrl: result.user.avatarUrl,
            emailVerified: true,
          });

          // 清理轮询
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          toast({
            title: '登录成功',
            description: '欢迎回来！',
          });

          // 延迟关闭弹窗并跳转
          setTimeout(() => {
            closeDialog();
            router.push('/dashboard');
          }, 1000);
        } else if (result.status === 'scanned') {
          setLoginStatus('scanned');
        } else if (result.status === 'expired') {
          setIsExpired(true);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('轮询微信登录状态失败:', err);
      }
    }, 2000);
  }, [setTokens, setUser, closeDialog, router, toast]);

  // 弹窗打开时获取二维码
  useEffect(() => {
    if (isOpen && !hasMounted.current) {
      hasMounted.current = true;
      fetchQRCode();
    }
  }, [isOpen, fetchQRCode]);

  // 获取到 state 后开始轮询
  useEffect(() => {
    if (state && isOpen) {
      startPolling(state);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, isOpen, startPolling]);

  // 弹窗关闭时重置状态
  const handleClose = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setQrUrl('');
    setState('');
    setLoginStatus('pending');
    setError('');
    setIsExpired(false);
    hasMounted.current = false;

    closeDialog();
  }, [closeDialog]);

  // 状态对应的 UI
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
          <p className="text-sm text-gray-500">正在生成二维码...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError('');
              fetchQRCode();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <p className="text-sm text-gray-600 mb-2">二维码已过期</p>
          <p className="text-xs text-gray-500 mb-4">为了账户安全，请重新获取二维码</p>
          <button
            onClick={() => {
              setIsExpired(false);
              fetchQRCode();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新二维码
          </button>
        </div>
      );
    }

    if (loginStatus === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">登录成功</p>
          <p className="text-sm text-gray-500">正在跳转...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        {/* 二维码区域 */}
        <div className="relative mb-6">
          {qrUrl ? (
            <iframe
              src={qrUrl}
              className="w-64 h-64 border-0 rounded-lg"
              sandbox="allow-scripts allow-same-origin"
              title="微信登录二维码"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
              <QrCode className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* 状态遮罩 */}
          {loginStatus === 'scanned' && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <Smartphone className="w-8 h-8 text-green-600 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-600">已扫码，请在手机上确认</p>
              </div>
            </div>
          )}

          {loginStatus === 'confirmed' && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-600">正在登录...</p>
              </div>
            </div>
          )}
        </div>

        {/* 提示文字 */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-900">
            {loginStatus === 'pending' && '请使用微信扫描二维码登录'}
            {loginStatus === 'scanned' && '已扫码，请在手机上确认登录'}
            {loginStatus === 'confirmed' && '登录中，请稍候...'}
          </p>
          <p className="text-xs text-gray-500">
            打开微信扫一扫，扫描二维码快速登录
          </p>
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={() => {
            setQrUrl('');
            setState('');
            fetchQRCode();
          }}
          className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新二维码
        </button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
            </svg>
            微信登录
          </DialogTitle>
          <DialogDescription>
            扫描二维码快速登录，安全便捷
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

/**
 * 微信登录按钮组件
 */
export function WechatLoginButton({ disabled = false, className }: { disabled?: boolean; className?: string }) {
  const { openDialog } = useWechatDialog();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={openDialog}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
    >
      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
      </svg>
      <span className="text-sm font-medium text-gray-700">微信登录</span>
    </button>
  );
}
