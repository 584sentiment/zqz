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

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[A-Za-z]/, '密码必须包含字母')
    .regex(/[0-9]/, '密码必须包含数字'),
  confirmPassword: z.string(),
  name: z.string().min(2, '姓名至少2个字符').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser, setTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.register({
        email: data.email,
        password: data.password,
        name: data.name,
      });
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        emailVerified: response.user.emailVerified,
      });
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      toast({
        title: '注册成功',
        description: '欢迎加入智求职！',
      });
      router.push('/onboarding');
    } catch (error: unknown) {
      console.error('注册错误:', error);
      const axiosError = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
      let errorMessage = '注册失败，请稍后重试';

      if (axiosError.response) {
        // 服务器返回了错误响应
        if (axiosError.response.status === 409) {
          errorMessage = '该邮箱已被注册，请直接登录或使用其他邮箱';
        } else if (axiosError.response.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (axiosError.message === 'Network Error') {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else if (axiosError.message?.includes('timeout')) {
        errorMessage = '请求超时，请稍后重试';
      }

      toast({
        title: '注册失败',
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
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">创建新账户</h2>
          <p className="mt-2 text-sm text-gray-600">
            已有账户？{' '}
            <Link href="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">姓名（可选）</Label>
              <Input
                id="name"
                type="text"
                placeholder="您的姓名"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

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
              <p className="mt-1 text-xs text-gray-500">
                密码至少8个字符，需包含字母和数字
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="terms"
              className="rounded border-gray-300"
              required
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
              我已阅读并同意{' '}
              <span className="text-primary">服务条款</span>
              {' '}和{' '}
              <span className="text-primary">隐私政策</span>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '注册中...' : '注册'}
          </Button>
        </form>
      </div>
    </div>
  );
}
