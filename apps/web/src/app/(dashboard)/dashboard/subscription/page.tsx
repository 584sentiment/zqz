'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { subscriptionsApi, SubscriptionInfo, PlanInfo } from '@/lib/api/subscriptions';
import { paymentsApi, PaymentHistory } from '@/lib/api/payments';
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
  RefreshCw,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAutoRenew, setIsUpdatingAutoRenew] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subData, plansData, historyData] = await Promise.all([
        subscriptionsApi.getMySubscription(),
        subscriptionsApi.getPlans(),
        paymentsApi.getPaymentHistory(),
      ]);
      setSubscription(subData);
      setPlans(plansData);
      setPaymentHistory(historyData);
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

  const handleToggleAutoRenew = async () => {
    if (!subscription || subscription.plan === 'free') return;

    setIsUpdatingAutoRenew(true);
    try {
      const newAutoRenew = !subscription.autoRenew;
      await subscriptionsApi.updateAutoRenew(newAutoRenew);
      setSubscription({ ...subscription, autoRenew: newAutoRenew });
      toast({
        title: newAutoRenew ? '已开启自动续费' : '已关闭自动续费',
        description: newAutoRenew
          ? '套餐到期后将自动续费'
          : '套餐到期后将降级为免费版',
      });
    } catch (error) {
      toast({
        title: '设置失败',
        description: '无法更新自动续费设置',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingAutoRenew(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setIsCancelling(true);
    try {
      const result = await subscriptionsApi.cancelSubscription();
      setSubscription({ ...subscription, status: 'canceled', autoRenew: false });
      toast({
        title: '订阅已取消',
        description: result.message,
      });
      setShowCancelConfirm(false);
    } catch (error) {
      toast({
        title: '取消失败',
        description: '无法取消订阅，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;

    setIsResuming(true);
    try {
      const result = await subscriptionsApi.resumeSubscription();
      setSubscription({ ...subscription, status: 'active', autoRenew: result.autoRenew });
      toast({
        title: '订阅已恢复',
        description: result.message,
      });
    } catch (error) {
      toast({
        title: '恢复失败',
        description: '无法恢复订阅，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsResuming(false);
    }
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

            {/* 订阅状态与设置 - 仅付费用户显示 */}
            {subscription.plan !== 'free' && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                {/* 订阅状态提示 */}
                {subscription.status === 'canceled' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">订阅已取消</p>
                      <p className="text-xs text-amber-600">
                        {subscription.endDate
                          ? `将在 ${new Date(subscription.endDate).toLocaleDateString('zh-CN')} 到期后降级为免费版`
                          : '已降级为免费版'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 自动续费设置 */}
                {subscription.status !== 'canceled' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">自动续费</h3>
                        <p className="text-xs text-gray-500">
                          {subscription.autoRenew
                            ? '套餐到期后将自动续费'
                            : '套餐到期后将降级为免费版'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleAutoRenew}
                      disabled={isUpdatingAutoRenew}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        subscription.autoRenew ? 'bg-primary' : 'bg-gray-200'
                      } ${isUpdatingAutoRenew ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {isUpdatingAutoRenew ? (
                        <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 -translate-x-1/2 text-white" />
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            subscription.autoRenew ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                )}

                {/* 取消/恢复订阅按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  {subscription.status === 'canceled' ? (
                    <Button
                      variant="outline"
                      onClick={handleResumeSubscription}
                      disabled={isResuming}
                      className="text-primary border-primary hover:bg-primary/10"
                    >
                      {isResuming ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      恢复订阅
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      取消订阅
                    </Button>
                  )}
                </div>

                {/* 取消确认对话框 */}
                {showCancelConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">确认取消订阅？</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        取消后，您的套餐将在当前计费周期结束后降级为免费版。在此期间您仍可享受付费功能。
                      </p>
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={isCancelling}
                        >
                          再想想
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleCancelSubscription}
                          disabled={isCancelling}
                        >
                          {isCancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          确认取消
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 订单记录 */}
        {paymentHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Receipt className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">订单记录</h2>
            </div>
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.orderNo}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      payment.status === 'paid' ? 'bg-green-100' :
                      payment.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      {payment.status === 'paid' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : payment.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.subject}</p>
                      <p className="text-sm text-gray-500">
                        订单号: {payment.orderNo}
                        {payment.paidAt && (
                          <span className="ml-4">
                            支付时间: {new Date(payment.paidAt).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">¥{payment.amount}</p>
                    <p className={`text-xs ${
                      payment.status === 'paid' ? 'text-green-600' :
                      payment.status === 'pending' ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      {payment.status === 'paid' ? '已支付' :
                       payment.status === 'pending' ? '待支付' : '已关闭'}
                    </p>
                  </div>
                </div>
              ))}
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
