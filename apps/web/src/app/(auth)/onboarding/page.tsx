'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/auth';
import { Check, ChevronRight, User, Target, MapPin, Rocket } from 'lucide-react';

const onboardingSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional().or(z.literal('')),
  targetRole: z.string().min(1, '请选择求职意向'),
  targetLocation: z.string().min(1, '请选择期望工作地点'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const steps = [
  { id: 1, title: '欢迎', icon: User, description: '基本信息' },
  { id: 2, title: '意向', icon: Target, description: '求职方向' },
  { id: 3, title: '地点', icon: MapPin, description: '工作地点' },
  { id: 4, title: '完成', icon: Rocket, description: '开始使用' },
];

const popularRoles = [
  '前端开发工程师',
  '后端开发工程师',
  '全栈开发工程师',
  '产品经理',
  'UI/UX 设计师',
  '数据分析师',
  '算法工程师',
  '测试工程师',
  '运维工程师',
  '项目经理',
];

const popularLocations = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '成都',
  '南京',
  '武汉',
  '西安',
  '远程',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setValue('targetRole', role);
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setValue('targetLocation', location);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true);
    try {
      // TODO: 调用 API 保存用户档案
      console.log('Onboarding data:', data);

      toast({
        title: '设置完成',
        description: '欢迎加入智求职！',
      });

      router.push('/dashboard');
    } catch (error) {
      toast({
        title: '保存失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎加入智求职</h2>
              <p className="text-gray-600">让我们开始设置您的个人资料</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">您的姓名</Label>
                <Input
                  id="name"
                  placeholder="请输入您的真实姓名"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">手机号码（可选）</Label>
                <Input
                  id="phone"
                  placeholder="请输入手机号码"
                  {...register('phone')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">您的求职意向</h2>
              <p className="text-gray-600">选择您想从事的岗位类型</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {popularRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedRole === role
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{role}</span>
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="customRole">其他岗位</Label>
              <Input
                id="customRole"
                placeholder="输入其他岗位名称"
                value={selectedRole}
                onChange={(e) => handleRoleSelect(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">期望工作地点</h2>
              <p className="text-gray-600">选择您期望工作的城市</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {popularLocations.map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedLocation === location
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{location}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 text-center">
            <div className="py-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-orange-100 rounded-full flex items-center justify-center">
                <Rocket className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">一切准备就绪！</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                智求职已为您准备好个性化的求职助手，现在就开始您的求职之旅吧！
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">配置摘要</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-gray-700">职业意向已建立</span>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已完成</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-gray-700">工作地点已设置</span>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已完成</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-primary flex items-center justify-center">
                      <span className="text-xs">!</span>
                    </div>
                    <span className="text-gray-700">简历档案</span>
                  </div>
                  <span className="text-xs text-primary bg-orange-50 px-2 py-1 rounded border border-orange-100">待完善</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
            智
          </div>
          <span className="text-lg font-semibold">智求职</span>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="relative flex justify-between items-center">
          {/* Progress Line */}
          <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full" />
          <div
            className="absolute top-4 left-0 h-1 bg-primary -z-0 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : isCurrent
                      ? 'bg-primary text-white scale-110 shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isCurrent ? 'text-primary' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex items-start justify-center px-4 pb-12">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-12">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && currentStep < 4 && (
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  上一步
                </Button>
              )}
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1"
                  disabled={
                    (currentStep === 2 && !selectedRole) ||
                    (currentStep === 3 && !selectedLocation)
                  }
                >
                  下一步
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <div className="flex gap-4 w-full">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? '处理中...' : '进入工作台'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/profile')}
                    className="flex-1"
                  >
                    完善档案
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-sm text-gray-500 border-t bg-white">
        <p>© 2024 智求职. 保留所有权利。</p>
      </footer>
    </div>
  );
}
