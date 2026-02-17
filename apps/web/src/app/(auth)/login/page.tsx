'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';
import { AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8个字符'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setUser, setTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remainingAttempts?: number;
    locked?: boolean;
    remainingMinutes?: number;
  } | null>(null);

  // 检查是否是会话过期导致的重定向
  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        emailVerified: response.user.emailVerified,
      });
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      toast({
        title: '登录成功',
        description: '欢迎回来！',
      });
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('登录错误:', error);
      const axiosError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            data?: {
              remainingAttempts?: number;
              locked?: boolean;
              remainingMinutes?: number;
            };
          };
        };
        message?: string;
      };
      let errorMessage = '邮箱或密码错误，请重试';

      if (axiosError.response) {
        const { status, data } = axiosError.response;

        if (status === 429) {
          // 账户被锁定
          const remainingMinutes = data?.data?.remainingMinutes || 15;
          errorMessage = `登录尝试次数过多，账户已暂时锁定 ${remainingMinutes} 分钟，请稍后再试`;
          setRateLimitInfo({ locked: true, remainingMinutes });
        } else if (status === 401) {
          // 认证失败
          const remainingAttempts = data?.data?.remainingAttempts;
          if (remainingAttempts !== undefined && remainingAttempts > 0) {
            errorMessage = `邮箱或密码错误，还剩 ${remainingAttempts} 次尝试机会`;
            setRateLimitInfo({ remainingAttempts });
          } else {
            errorMessage = '邮箱或密码错误';
          }
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (axiosError.message === 'Network Error') {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else if (axiosError.message?.includes('timeout')) {
        errorMessage = '请求超时，请稍后重试';
      }

      toast({
        title: '登录失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">智求职</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">登录您的账户</h2>
          <p className="mt-2 text-sm text-gray-600">
            还没有账户？{' '}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* 会话过期提示 */}
          {sessionExpired && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">您的登录已过期，请重新登录</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                {...register('rememberMe')}
              />
              <span className="ml-2 text-sm text-gray-600">记住我（30天内免登录）</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              忘记密码？
            </Link>
          </div>

          {/* 速率限制提示 */}
          {rateLimitInfo && (
            <div
              className={`p-3 rounded-md text-sm ${
                rateLimitInfo.locked
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              }`}
            >
              {rateLimitInfo.locked ? (
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">账户已暂时锁定</p>
                    <p className="mt-1">
                      由于连续登录失败，您的账户已被锁定 {rateLimitInfo.remainingMinutes || 15} 分钟。
                      请稍后再试或
                      <Link href="/forgot-password" className="text-primary hover:underline ml-1">
                        重置密码
                      </Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>
                    还剩 <strong>{rateLimitInfo.remainingAttempts}</strong> 次尝试机会
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || rateLimitInfo?.locked}
          >
            {isLoading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">或使用以下方式登录</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" disabled title="微信登录暂未开放">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
              </svg>
              微信登录
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                // 跳转到后端 GitHub OAuth 端点
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
                window.location.href = `${apiUrl}/auth/github`;
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub 登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
