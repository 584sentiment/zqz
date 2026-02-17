'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/auth';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    description: '适合初次体验的用户',
    features: [
      '10 次 AI 对话',
      '3 份简历生成',
      '1 次模拟面试',
      '基础岗位解析',
    ],
    highlighted: false,
  },
  {
    id: 'basic',
    name: '基础版',
    price: 29,
    description: '适合求职中的用户',
    features: [
      '100 次 AI 对话',
      '20 份简历生成',
      '10 次模拟面试',
      '高级岗位解析',
      '简历模板选择',
    ],
    highlighted: true,
  },
  {
    id: 'pro',
    name: '专业版',
    price: 99,
    description: '适合全力求职的用户',
    features: [
      '无限 AI 对话',
      '无限简历生成',
      '无限模拟面试',
      '高级 AI 功能',
      '全部简历模板',
      '优先客服支持',
    ],
    highlighted: false,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      router.push('/dashboard/subscription');
      return;
    }

    setLoadingPlan(planId);
    try {
      // TODO: 集成支付
      toast({
        title: '功能开发中',
        description: '支付功能即将上线，敬请期待',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回会员中心
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">升级套餐</h1>
          <p className="text-gray-500 mt-1">选择最适合您的套餐，解锁全部功能</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 ${
                plan.highlighted
                  ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-medium rounded-full">
                    <Sparkles className="w-3 h-3" />
                    最受欢迎
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                    plan.highlighted ? 'bg-white/20' : 'bg-primary/10'
                  }`}
                >
                  {plan.id === 'pro' ? (
                    <Crown className={plan.highlighted ? 'text-white' : 'text-primary'} />
                  ) : plan.id === 'basic' ? (
                    <Zap className={plan.highlighted ? 'text-white' : 'text-primary'} />
                  ) : (
                    <Sparkles className={plan.highlighted ? 'text-white' : 'text-primary'} />
                  )}
                </div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p
                  className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold">¥{plan.price}</span>
                <span
                  className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}
                >
                  /月
                </span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 ${
                        plan.highlighted ? 'text-white' : 'text-green-500'
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.highlighted ? 'secondary' : 'default'}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : plan.id === 'free' ? (
                  '当前套餐'
                ) : (
                  '选择套餐'
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12 bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">常见问题</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900">可以随时取消吗？</h3>
              <p className="mt-1">是的，您可以随时取消订阅，取消后将在当前计费周期结束时生效。</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">支持哪些支付方式？</h3>
              <p className="mt-1">我们支持支付宝和微信支付。</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">配额如何计算？</h3>
              <p className="mt-1">配额按月重置，未使用的配额不会累积到下个月。</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
