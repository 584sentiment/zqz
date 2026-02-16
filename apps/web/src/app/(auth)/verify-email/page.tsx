'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('验证链接无效，缺少验证令牌');
      return;
    }

    const verifyEmail = async () => {
      try {
        const result = await authApi.verifyEmail(token);
        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          // 更新用户状态
          if (result.user) {
            setUser({
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              emailVerified: true,
            });
          }
          // 3秒后跳转到仪表盘
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.message || '验证失败');
        }
      } catch (error: unknown) {
        setStatus('error');
        const errorMessage =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          '验证失败，请稍后重试';
        setMessage(errorMessage);
      }
    };

    verifyEmail();
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">正在验证邮箱...</h2>
              <p className="mt-2 text-sm text-gray-500">请稍候</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">验证成功！</h2>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <p className="mt-4 text-sm text-gray-400">即将跳转到仪表盘...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">验证失败</h2>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 text-center"
                >
                  返回仪表盘
                </Link>
                <Link
                  href="/login"
                  className="block w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
                >
                  返回登录
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
