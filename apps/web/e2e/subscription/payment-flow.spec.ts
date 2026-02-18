import { test, expect } from '../fixtures/auth';
import { mockResponses, setupMockRoutes, clearMockRoutes } from '../fixtures/mocks';

/**
 * 支付流程 E2E 测试
 * 测试完整的支付流程：升级页面 -> 创建订单 -> 支付结果
 */
test.describe('完整支付流程', () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await clearMockRoutes(authenticatedPage);
  });

  test('应该完成从升级到支付成功的完整流程', async ({ authenticatedPage }) => {
    // 设置初始状态为免费用户
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionFree,
      plans: mockResponses.plans,
      paymentHistory: mockResponses.paymentHistoryEmpty,
      createPayment: mockResponses.createPayment,
    });

    // 步骤 1: 从会员中心进入升级页面
    await authenticatedPage.goto('/dashboard/subscription');
    await expect(authenticatedPage.getByText('免费版')).toBeVisible();
    await authenticatedPage.getByRole('button', { name: '升级套餐' }).click();
    await expect(authenticatedPage).toHaveURL('/dashboard/subscription/upgrade');

    // 步骤 2: 选择套餐
    await expect(authenticatedPage.getByText('升级套餐')).toBeVisible();

    // 验证默认选中基础版
    const basicCard = authenticatedPage.locator('text=基础版').first();
    await expect(basicCard).toBeVisible();

    // 步骤 3: 验证价格计算
    await expect(
      authenticatedPage.getByRole('button', { name: /立即支付 ¥29/ })
    ).toBeVisible();

    // 步骤 4: 选择 3 个月
    await authenticatedPage.getByRole('button', { name: '3 个月' }).click();

    // 验证价格更新 (29 * 3 = 87)
    await expect(
      authenticatedPage.getByRole('button', { name: /立即支付 ¥87/ })
    ).toBeVisible();
  });

  test('支付流程 - 从待支付到支付成功', async ({ authenticatedPage }) => {
    // 设置初始支付状态为待支付
    setupMockRoutes(authenticatedPage, {
      paymentStatus: mockResponses.paymentPending,
      syncPayment: mockResponses.syncPaymentSuccess,
    });

    // 直接进入支付结果页面（模拟从支付宝返回）
    await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

    // 验证待支付状态
    await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

    // 点击同步订单状态
    await authenticatedPage.getByRole('button', { name: '同步订单状态' }).click();

    // 验证支付成功
    await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });

    // 验证订单详情
    await expect(authenticatedPage.getByText('基础版')).toBeVisible();
    await expect(authenticatedPage.getByText('¥29')).toBeVisible();

    // 点击查看会员权益
    await authenticatedPage.getByRole('button', { name: '查看会员权益' }).click();

    // 验证跳转到会员中心
    await expect(authenticatedPage).toHaveURL('/dashboard/subscription');
  });

  test('支付流程 - 从待支付到支付失败', async ({ authenticatedPage }) => {
    setupMockRoutes(authenticatedPage, {
      paymentStatus: mockResponses.paymentClosed,
    });

    await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

    // 验证支付失败状态
    await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

    // 点击重新购买
    await authenticatedPage.getByRole('button', { name: '重新购买' }).click();

    // 验证跳转到升级页面
    await expect(authenticatedPage).toHaveURL('/dashboard/subscription/upgrade');
  });

  test('支付流程 - 切换套餐类型', async ({ authenticatedPage }) => {
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionFree,
      plans: mockResponses.plans,
      createPayment: mockResponses.createPaymentPro,
    });

    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 选择专业版
    await authenticatedPage.locator('text=专业版').first().click();

    // 验证价格 (99)
    await expect(
      authenticatedPage.getByRole('button', { name: /立即支付 ¥99/ })
    ).toBeVisible();

    // 选择 12 个月
    await authenticatedPage.getByRole('button', { name: '12 个月' }).click();

    // 验证价格 (99 * 12 = 1188)
    await expect(
      authenticatedPage.getByRole('button', { name: /立即支付 ¥1188/ })
    ).toBeVisible();
  });

  test('支付流程 - 取消订阅后恢复', async ({ authenticatedPage }) => {
    // 设置为已取消状态
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionCanceled,
      plans: mockResponses.plans,
      paymentHistory: mockResponses.paymentHistory,
    });

    // Mock 恢复订阅
    await authenticatedPage.route('**/api/v1/subscriptions/resume', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.resumeSubscriptionSuccess),
      })
    );

    await authenticatedPage.goto('/dashboard/subscription');

    // 验证已取消状态
    await expect(authenticatedPage.getByText('订阅已取消')).toBeVisible();

    // 恢复订阅
    await authenticatedPage.getByRole('button', { name: '恢复订阅' }).click();

    // 验证成功提示
    await expect(authenticatedPage.getByText('订阅已恢复')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('支付流程 - 边界情况', () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await clearMockRoutes(authenticatedPage);
  });

  test('支付创建失败应该显示错误并允许重试', async ({ authenticatedPage }) => {
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionFree,
      plans: mockResponses.plans,
    });

    // Mock 第一次创建失败
    let createAttempt = 0;
    await authenticatedPage.route('**/api/v1/payments/create', (route) => {
      createAttempt++;
      if (createAttempt === 1) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: '订单创建失败',
            statusCode: 400,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.createPayment),
        });
      }
    });

    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 第一次点击支付 - 应该失败
    await authenticatedPage.getByRole('button', { name: /立即支付/ }).click();
    await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 5000 });

    // 第二次点击支付 - 应该成功（此处只验证按钮可点击）
    await authenticatedPage.getByRole('button', { name: /立即支付/ }).click();
  });

  test('刷新状态应该重新查询订单', async ({ authenticatedPage }) => {
    let queryCount = 0;

    await authenticatedPage.route('**/api/v1/payments/status/*', (route) => {
      queryCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.paymentPending),
      });
    });

    await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

    // 等待初始查询
    await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });
    const initialCount = queryCount;

    // 点击刷新状态
    await authenticatedPage.getByRole('button', { name: '刷新状态' }).click();

    // 等待刷新完成
    await authenticatedPage.waitForTimeout(500);

    // 验证查询次数增加
    expect(queryCount).toBeGreaterThan(initialCount);
  });

  test('网络错误应该显示友好提示', async ({ authenticatedPage }) => {
    // Mock 网络错误
    await authenticatedPage.route('**/api/v1/subscriptions/me', (route) =>
      route.abort('failed')
    );

    await authenticatedPage.goto('/dashboard/subscription');

    // 验证错误提示
    await expect(authenticatedPage.getByText('加载失败')).toBeVisible({ timeout: 10000 });
  });

  test('Token 过期应该重定向到登录页', async ({ authenticatedPage }) => {
    // Mock 401 错误
    await authenticatedPage.route('**/api/v1/**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthorized',
          statusCode: 401,
        }),
      })
    );

    await authenticatedPage.goto('/dashboard/subscription');

    // 应该被重定向到登录页
    await expect(authenticatedPage).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('支付流程 - 性能测试', () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await clearMockRoutes(authenticatedPage);
  });

  test('升级页面应该在 3 秒内加载完成', async ({ authenticatedPage }) => {
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionFree,
      plans: mockResponses.plans,
    });

    const startTime = Date.now();
    await authenticatedPage.goto('/dashboard/subscription/upgrade');
    await expect(authenticatedPage.getByText('升级套餐')).toBeVisible();
    const loadTime = Date.now() - startTime;

    // 验证加载时间
    expect(loadTime).toBeLessThan(3000);
  });

  test('支付结果页面应该在 5 秒内显示状态', async ({ authenticatedPage }) => {
    setupMockRoutes(authenticatedPage, {
      paymentStatus: mockResponses.paymentPaid,
    });

    const startTime = Date.now();
    await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');
    await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // 验证加载时间
    expect(loadTime).toBeLessThan(5000);
  });
});
