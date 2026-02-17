'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { paymentsApi, PaymentStatus } from '@/lib/api/payments';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNo = searchParams.get('orderNo');

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatus | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const checkPaymentStatus = useCallback(async () => {
    if (!orderNo) {
      setStatus('failed');
      return;
    }

    try {
      const result = await paymentsApi.getPaymentStatus(orderNo);
      setPaymentInfo(result);

      if (result.status === 'paid') {
        setStatus('success');
      } else if (result.status === 'closed') {
        setStatus('failed');
      } else if (pollCount < 10) {
        // 最多轮询 10 次（约 30 秒）
        setStatus('pending');
        setTimeout(() => {
          setPollCount((c) => c + 1);
        }, 3000);
      } else {
        setStatus('pending');
      }
    } catch {
      setStatus('failed');
    }
  }, [orderNo, pollCount]);

  useEffect(() => {
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      basic: '基础版',
      pro: '专业版',
    };
    return planNames[plan] || plan;
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-12">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">正在查询支付结果...</h1>
            <p className="text-gray-500">请稍候</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">等待支付确认</h1>
            <p className="text-gray-500 mb-6">
              支付可能需要几秒钟处理，您可以稍后刷新页面查看结果
            </p>
            <div className="space-y-3">
              <Button onClick={checkPaymentStatus} className="w-full">
                刷新状态
              </Button>
              <Link href="/dashboard/subscription">
                <Button variant="outline" className="w-full">
                  返回会员中心
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'success' && paymentInfo && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">支付成功</h1>
            <p className="text-gray-500 mb-8">恭喜您成功升级会员！</p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">订单号</span>
                  <span className="font-mono text-gray-900">{paymentInfo.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">套餐</span>
                  <span className="text-gray-900">{getPlanName(paymentInfo.plan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时长</span>
                  <span className="text-gray-900">{paymentInfo.period} 个月</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">金额</span>
                  <span className="text-lg font-bold text-primary">¥{paymentInfo.amount}</span>
                </div>
              </div>
            </div>

            <Link href="/dashboard/subscription">
              <Button size="lg" className="w-full">
                查看会员权益
              </Button>
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">支付失败</h1>
            <p className="text-gray-500 mb-8">
              {orderNo ? '订单未完成支付或已取消' : '订单信息不存在'}
            </p>

            <div className="space-y-3">
              <Link href="/dashboard/subscription/upgrade">
                <Button className="w-full">重新购买</Button>
              </Link>
              <Link href="/dashboard/subscription">
                <Button variant="outline" className="w-full">
                  返回会员中心
                </Button>
              </Link>
            </div>
          </div>
        )}

        <Link
          href="/dashboard/subscription"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mt-8"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回会员中心
        </Link>
      </div>
    </DashboardLayout>
  );
}
