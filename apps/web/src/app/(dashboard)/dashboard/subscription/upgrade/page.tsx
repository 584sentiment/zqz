'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/auth';
import { paymentsApi } from '@/lib/api/payments';
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
    id: 'basic',
    name: '基础版',
    price: 29,
    description: '适合求职中的用户',
    features: [
      '50 次 AI 对话',
      '10 份简历生成',
      '5 次模拟面试',
      '高级岗位解析',
      'AI 技能发掘',
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

const periodOptions = [
  { value: 1, label: '1 个月', discount: '' },
  { value: 3, label: '3 个月', discount: '省 ¥29' },
  { value: 6, label: '6 个月', discount: '省 ¥88' },
  { value: 12, label: '12 个月', discount: '省 ¥200' },
];

export default function UpgradePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await paymentsApi.createPayment(selectedPlan, selectedPeriod);

      // 跳转到支付宝支付页面
      window.location.href = result.paymentUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '支付创建失败，请稍后重试';
      toast({
        title: '支付失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return 0;
    return plan.price * selectedPeriod;
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

        {/* Plans Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative cursor-pointer rounded-2xl p-6 transition-all ${
                selectedPlan === plan.id
                  ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                  : 'bg-white border border-gray-200 hover:border-primary/50'
              }`}
            >
              {plan.highlighted && selectedPlan === plan.id && (
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
                    selectedPlan === plan.id ? 'bg-white/20' : 'bg-primary/10'
                  }`}
                >
                  {plan.id === 'pro' ? (
                    <Crown className={selectedPlan === plan.id ? 'text-white' : 'text-primary'} />
                  ) : (
                    <Zap className={selectedPlan === plan.id ? 'text-white' : 'text-primary'} />
                  )}
                </div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p
                  className={`text-sm ${selectedPlan === plan.id ? 'text-white/70' : 'text-gray-500'}`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold">¥{plan.price}</span>
                <span
                  className={`text-sm ${selectedPlan === plan.id ? 'text-white/70' : 'text-gray-500'}`}
                >
                  /月
                </span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 ${
                        selectedPlan === plan.id ? 'text-white' : 'text-green-500'
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto ${
                  selectedPlan === plan.id
                    ? 'border-white bg-white'
                    : 'border-gray-300'
                }`}
              >
                {selectedPlan === plan.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Period Selection */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择购买时长</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value)}
                className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                  selectedPeriod === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option.discount && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {option.discount}
                  </span>
                )}
                <div className="font-medium text-gray-900">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">套餐</span>
            <span className="font-medium text-gray-900">
              {plans.find((p) => p.id === selectedPlan)?.name} × {selectedPeriod} 个月
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">支付方式</span>
            <span className="font-medium text-gray-900">支付宝</span>
          </div>
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">应付金额</span>
            <span className="text-2xl font-bold text-primary">¥{calculateTotal()}</span>
          </div>
        </div>

        {/* Pay Button */}
        <Button
          size="lg"
          className="w-full text-lg py-6"
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              正在跳转到支付...
            </>
          ) : (
            `立即支付 ¥${calculateTotal()}`
          )}
        </Button>

        <p className="text-center text-sm text-gray-500 mt-4">
          点击支付即表示您同意我们的服务条款和隐私政策
        </p>

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
              <p className="mt-1">目前支持支付宝支付。</p>
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
