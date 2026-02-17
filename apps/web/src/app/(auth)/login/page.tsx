'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser, setTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remainingAttempts?: number;
    locked?: boolean;
    remainingMinutes?: number;
  } | null>(null);

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
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-600">记住我</span>
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
            <Button variant="outline" type="button">
              微信登录
            </Button>
            <Button variant="outline" type="button">
              GitHub 登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
