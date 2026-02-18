import { Page, Route, Request } from '@playwright/test';

/**
 * API Mock 响应数据
 */
export const mockResponses = {
  // 订阅信息 - 免费版用户
  subscriptionFree: {
    plan: 'free',
    planName: '免费版',
    status: 'active',
    startDate: null,
    endDate: null,
    canceledAt: null,
    autoRenew: false,
    quotaResetAt: new Date().toISOString(),
    quotas: {
      ai: { total: 10, used: 3, remaining: 7, unlimited: false },
      resume: { total: 3, used: 1, remaining: 2, unlimited: false },
      interview: { total: 2, used: 0, remaining: 2, unlimited: false },
    },
    features: ['基础 AI 对话', '岗位解析'],
  },

  // 订阅信息 - 基础版用户
  subscriptionBasic: {
    plan: 'basic',
    planName: '基础版',
    status: 'active',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2025-01-01T00:00:00.000Z',
    canceledAt: null,
    autoRenew: true,
    quotaResetAt: new Date().toISOString(),
    quotas: {
      ai: { total: 50, used: 20, remaining: 30, unlimited: false },
      resume: { total: 10, used: 5, remaining: 5, unlimited: false },
      interview: { total: 5, used: 2, remaining: 3, unlimited: false },
    },
    features: ['50 次 AI 对话', '10 份简历生成', '5 次模拟面试', '高级岗位解析', 'AI 技能发掘'],
  },

  // 订阅信息 - 已取消的用户
  subscriptionCanceled: {
    plan: 'basic',
    planName: '基础版',
    status: 'canceled',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2025-02-01T00:00:00.000Z',
    canceledAt: '2024-12-01T00:00:00.000Z',
    autoRenew: false,
    quotaResetAt: new Date().toISOString(),
    quotas: {
      ai: { total: 50, used: 30, remaining: 20, unlimited: false },
      resume: { total: 10, used: 8, remaining: 2, unlimited: false },
      interview: { total: 5, used: 4, remaining: 1, unlimited: false },
    },
    features: ['50 次 AI 对话', '10 份简历生成', '5 次模拟面试', '高级岗位解析', 'AI 技能发掘'],
  },

  // 套餐列表
  plans: [
    {
      id: 'free',
      name: '免费版',
      price: 0,
      aiQuota: 10,
      resumeQuota: 3,
      interviewQuota: 2,
      features: ['基础 AI 对话', '岗位解析'],
    },
    {
      id: 'basic',
      name: '基础版',
      price: 29,
      aiQuota: 50,
      resumeQuota: 10,
      interviewQuota: 5,
      features: ['50 次 AI 对话', '10 份简历生成', '5 次模拟面试', '高级岗位解析', 'AI 技能发掘'],
    },
    {
      id: 'pro',
      name: '专业版',
      price: 99,
      aiQuota: '无限',
      resumeQuota: '无限',
      interviewQuota: '无限',
      features: [
        '无限 AI 对话',
        '无限简历生成',
        '无限模拟面试',
        '高级 AI 功能',
        '全部简历模板',
        '优先客服支持',
      ],
    },
  ],

  // 创建支付订单响应
  createPayment: {
    orderNo: 'TEST-ORDER-001',
    amount: 29,
    subject: '基础版 x 1 个月',
    paymentUrl: 'https://openapi.alipay.com/gateway.do?mock=test',
    expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  },

  // 创建支付订单响应 - Pro 套餐
  createPaymentPro: {
    orderNo: 'TEST-ORDER-002',
    amount: 99,
    subject: '专业版 x 1 个月',
    paymentUrl: 'https://openapi.alipay.com/gateway.do?mock=test',
    expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  },

  // 创建支付订单响应 - 3 个月
  createPayment3Months: {
    orderNo: 'TEST-ORDER-003',
    amount: 87,
    subject: '基础版 x 3 个月',
    paymentUrl: 'https://openapi.alipay.com/gateway.do?mock=test',
    expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  },

  // 支付状态 - 待支付
  paymentPending: {
    orderNo: 'TEST-ORDER-001',
    plan: 'basic',
    period: 1,
    amount: 29,
    status: 'pending',
    subject: '基础版 x 1 个月',
    paidAt: null,
    createdAt: new Date().toISOString(),
  },

  // 支付状态 - 已支付
  paymentPaid: {
    orderNo: 'TEST-ORDER-001',
    plan: 'basic',
    period: 1,
    amount: 29,
    status: 'paid',
    subject: '基础版 x 1 个月',
    paidAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },

  // 支付状态 - 已关闭
  paymentClosed: {
    orderNo: 'TEST-ORDER-001',
    plan: 'basic',
    period: 1,
    amount: 29,
    status: 'closed',
    subject: '基础版 x 1 个月',
    paidAt: null,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },

  // 同步支付状态 - 成功
  syncPaymentSuccess: {
    orderNo: 'TEST-ORDER-001',
    plan: 'basic',
    period: 1,
    amount: 29,
    status: 'paid',
    subject: '基础版 x 1 个月',
    paidAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    synced: true,
    message: '订单已确认支付，订阅已升级',
  },

  // 同步支付状态 - 仍待支付
  syncPaymentPending: {
    orderNo: 'TEST-ORDER-001',
    plan: 'basic',
    period: 1,
    amount: 29,
    status: 'pending',
    subject: '基础版 x 1 个月',
    paidAt: null,
    createdAt: new Date().toISOString(),
    synced: true,
    message: '订单尚未支付',
  },

  // 支付历史
  paymentHistory: [
    {
      orderNo: 'PAY-20240101-001',
      plan: 'basic',
      period: 1,
      amount: 29,
      status: 'paid',
      subject: '基础版 x 1 个月',
      paidAt: '2024-01-01T10:30:00.000Z',
      createdAt: '2024-01-01T10:25:00.000Z',
    },
    {
      orderNo: 'PAY-20240201-001',
      plan: 'basic',
      period: 1,
      amount: 29,
      status: 'paid',
      subject: '基础版 x 1 个月',
      paidAt: '2024-02-01T14:20:00.000Z',
      createdAt: '2024-02-01T14:15:00.000Z',
    },
    {
      orderNo: 'PAY-20240301-001',
      plan: 'basic',
      period: 1,
      amount: 29,
      status: 'pending',
      subject: '基础版 x 1 个月',
      paidAt: null,
      createdAt: '2024-03-01T09:00:00.000Z',
    },
  ],

  // 空支付历史
  paymentHistoryEmpty: [],

  // 取消订阅成功
  cancelSubscriptionSuccess: {
    success: true,
    status: 'canceled',
    canceledAt: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    message: '订阅已取消，将在当前计费周期结束后降级为免费版',
  },

  // 恢复订阅成功
  resumeSubscriptionSuccess: {
    success: true,
    status: 'active',
    autoRenew: true,
    message: '订阅已恢复，将继续享受会员服务',
  },

  // 更新自动续费
  updateAutoRenew: {
    success: true,
    autoRenew: true,
  },
};

/**
 * Mock API 路由处理器类型
 */
type MockRouteHandler = (route: Route, request: Request) => Promise<void> | void;

/**
 * 创建 Mock API 路由
 */
export function setupMockRoutes(page: Page, options: {
  subscription?: typeof mockResponses.subscriptionFree;
  plans?: typeof mockResponses.plans;
  paymentHistory?: typeof mockResponses.paymentHistory;
  createPayment?: typeof mockResponses.createPayment;
  paymentStatus?: typeof mockResponses.paymentPending;
  syncPayment?: typeof mockResponses.syncPaymentSuccess;
}) {
  const apiBase = '/api/v1';

  // Mock 订阅信息
  if (options.subscription) {
    page.route(`${apiBase}/subscriptions/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.subscription),
      })
    );
  }

  // Mock 套餐列表
  if (options.plans) {
    page.route(`${apiBase}/subscriptions/plans`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.plans),
      })
    );
  }

  // Mock 支付历史
  if (options.paymentHistory !== undefined) {
    page.route(`${apiBase}/payments/history`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.paymentHistory),
      })
    );
  }

  // Mock 创建支付
  if (options.createPayment) {
    page.route(`${apiBase}/payments/create`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.createPayment),
      })
    );
  }

  // Mock 查询支付状态
  if (options.paymentStatus) {
    page.route(new RegExp(`${apiBase}/payments/status/.*`), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.paymentStatus),
      })
    );
  }

  // Mock 同步支付状态
  if (options.syncPayment) {
    page.route(new RegExp(`${apiBase}/payments/sync/.*`), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.syncPayment),
      })
    );
  }
}

/**
 * 清除所有 Mock 路由
 */
export async function clearMockRoutes(page: Page) {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
}
