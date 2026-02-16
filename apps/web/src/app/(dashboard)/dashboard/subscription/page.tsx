'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { subscriptionsApi, SubscriptionInfo, PlanInfo } from '@/lib/api/subscriptions';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Sparkles,
  FileText,
  MessageSquare,
  Brain,
  Check,
  Zap,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subData, plansData] = await Promise.all([
        subscriptionsApi.getMySubscription(),
        subscriptionsApi.getPlans(),
      ]);
      setSubscription(subData);
      setPlans(plansData);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载订阅信息',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getQuotaPercentage = (quota: { total: number; used: number; unlimited: boolean }) => {
    if (quota.unlimited) return 100;
    if (quota.total === 0) return 0;
    return Math.round((quota.used / quota.total) * 100);
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">会员中心</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的订阅和配额</p>
        </div>

        {/* 当前套餐 */}
        {subscription && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${subscription.plan === 'pro' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : subscription.plan === 'basic' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Crown className={`w-6 h-6 ${subscription.plan === 'pro' ? 'text-white' : subscription.plan === 'basic' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{subscription.planName}</h2>
                  {subscription.endDate && (
                    <p className="text-sm text-gray-500">
                      有效期至 {new Date(subscription.endDate).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              </div>
              {subscription.plan !== 'pro' && (
                <Link href="/dashboard/subscription/upgrade">
                  <Button className="shadow-lg shadow-primary/20">
                    <Zap className="w-4 h-4 mr-2" />
                    升级套餐
                  </Button>
                </Link>
              )}
            </div>

            {/* 配额使用情况 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">本月配额使用</h3>

              {/* AI 对话 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">AI 对话</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getQuotaColor(getQuotaPercentage(subscription.quotas.ai))}`}
                      style={{ width: `${getQuotaPercentage(subscription.quotas.ai)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-24 text-right">
                  {subscription.quotas.ai.unlimited
                    ? '无限'
                    : `${subscription.quotas.ai.remaining}/${subscription.quotas.ai.total}`}
                </span>
              </div>

              {/* 简历生成 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">简历生成</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getQuotaColor(getQuotaPercentage(subscription.quotas.resume))}`}
                      style={{ width: `${getQuotaPercentage(subscription.quotas.resume)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-24 text-right">
                  {subscription.quotas.resume.unlimited
                    ? '无限'
                    : `${subscription.quotas.resume.remaining}/${subscription.quotas.resume.total}`}
                </span>
              </div>

              {/* 模拟面试 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <Brain className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">模拟面试</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getQuotaColor(getQuotaPercentage(subscription.quotas.interview))}`}
                      style={{ width: `${getQuotaPercentage(subscription.quotas.interview)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-24 text-right">
                  {subscription.quotas.interview.unlimited
                    ? '无限'
                    : `${subscription.quotas.interview.remaining}/${subscription.quotas.interview.total}`}
                </span>
              </div>
            </div>

            {/* 当前功能 */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">当前可用功能</h3>
              <div className="flex flex-wrap gap-2">
                {subscription.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                  >
                    <Check className="w-3 h-3" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 套餐对比 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">套餐对比</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  subscription?.plan === plan.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {subscription?.plan === plan.id && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
                    当前套餐
                  </div>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">¥{plan.price}</span>
                    <span className="text-gray-500">/月</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>AI 对话 {plan.aiQuota}次/月</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>简历生成 {plan.resumeQuota}份/月</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>模拟面试 {plan.interviewQuota}次/月</span>
                  </li>
                  {plan.features.slice(3).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {subscription?.plan !== plan.id && plan.id !== 'free' && (
                  <Link href="/dashboard/subscription/upgrade" className="block">
                    <Button
                      variant={plan.id === 'pro' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      {plan.id === 'pro' ? '立即升级' : '选择此套餐'}
                    </Button>
                  </Link>
                )}
                {subscription?.plan === plan.id && (
                  <Button variant="outline" className="w-full" disabled>
                    当前套餐
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 常见问题 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">常见问题</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2 text-gray-900 font-medium">
                配额什么时候重置？
                <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-gray-500 py-2 pl-4">
                配额会在每月1日自动重置。如果您升级了套餐，新配额会立即生效。
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2 text-gray-900 font-medium">
                可以取消订阅吗？
                <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-gray-500 py-2 pl-4">
                可以随时取消订阅。取消后，您的套餐会在当前计费周期结束后降级为免费版。
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2 text-gray-900 font-medium">
                支持哪些支付方式？
                <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-gray-500 py-2 pl-4">
                目前支持支付宝和微信支付。企业用户可联系我们开具发票。
              </p>
            </details>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
