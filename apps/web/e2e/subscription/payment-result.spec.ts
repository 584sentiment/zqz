import { test, expect } from '../fixtures/auth';
import { mockResponses, setupMockRoutes, clearMockRoutes } from '../fixtures/mocks';

/**
 * 支付结果页面 E2E 测试
 * 测试路径: /dashboard/subscription/payment/result
 */
test.describe('支付结果页面', () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await clearMockRoutes(authenticatedPage);
  });

  test.describe('加载状态', () => {
    test('应该显示加载状态', async ({ authenticatedPage }) => {
      // 延迟响应以测试加载状态
      await authenticatedPage.route('**/api/v1/payments/status/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.paymentPending),
        });
      });

      // 导航到支付结果页面
      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 验证加载状态
      await expect(authenticatedPage.getByText('正在查询支付结果')).toBeVisible();
      await expect(authenticatedPage.getByText('请稍候')).toBeVisible();
    });
  });

  test.describe('支付成功', () => {
    test('应该显示支付成功状态', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPaid,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待状态加载完成
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });

      // 验证成功图标
      await expect(authenticatedPage.locator('.bg-green-100')).toBeVisible();

      // 验证成功消息
      await expect(authenticatedPage.getByText('恭喜您成功升级会员')).toBeVisible();
    });

    test('应该显示订单详情', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPaid,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });

      // 验证订单信息
      await expect(authenticatedPage.getByText('订单号')).toBeVisible();
      await expect(authenticatedPage.getByText('TEST-ORDER-001')).toBeVisible();

      // 验证套餐信息
      await expect(authenticatedPage.getByText('套餐')).toBeVisible();
      await expect(authenticatedPage.getByText('基础版')).toBeVisible();

      // 验证时长
      await expect(authenticatedPage.getByText('时长')).toBeVisible();
      await expect(authenticatedPage.getByText('1 个月')).toBeVisible();

      // 验证金额
      await expect(authenticatedPage.getByText('金额')).toBeVisible();
      await expect(authenticatedPage.getByText('¥29')).toBeVisible();
    });

    test('点击查看会员权益应该跳转到会员中心', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPaid,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });

      // 点击查看会员权益按钮
      await authenticatedPage.getByRole('button', { name: '查看会员权益' }).click();

      // 验证导航到会员中心
      await expect(authenticatedPage).toHaveURL('/dashboard/subscription');
    });
  });

  test.describe('等待支付确认', () => {
    test('应该显示等待支付状态', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPending,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

      // 验证等待图标
      await expect(authenticatedPage.locator('.text-yellow-500')).toBeVisible();

      // 验证提示信息
      await expect(
        authenticatedPage.getByText('支付可能需要几秒钟处理')
      ).toBeVisible();
    });

    test('应该显示同步订单状态按钮', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPending,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

      // 验证同步按钮
      await expect(
        authenticatedPage.getByRole('button', { name: '同步订单状态' })
      ).toBeVisible();

      // 验证刷新按钮
      await expect(
        authenticatedPage.getByRole('button', { name: '刷新状态' })
      ).toBeVisible();
    });

    test('点击同步订单状态应该调用同步 API', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPending,
        syncPayment: mockResponses.syncPaymentSuccess,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

      // 点击同步按钮
      await authenticatedPage.getByRole('button', { name: '同步订单状态' }).click();

      // 验证同步成功后的状态变化
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });
    });

    test('同步成功应该显示成功提示', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPending,
        syncPayment: mockResponses.syncPaymentSuccess,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

      // 点击同步按钮
      await authenticatedPage.getByRole('button', { name: '同步订单状态' }).click();

      // 验证成功提示
      await expect(authenticatedPage.getByText('同步成功')).toBeVisible({ timeout: 5000 });
    });

    test('同步按钮应该显示加载状态', async ({ authenticatedPage }) => {
      // 延迟同步响应
      await authenticatedPage.route('**/api/v1/payments/sync/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.syncPaymentSuccess),
        });
      });

      await authenticatedPage.route('**/api/v1/payments/status/*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.paymentPending),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

      // 点击同步按钮
      const syncButton = authenticatedPage.getByRole('button', { name: '同步订单状态' });
      await syncButton.click();

      // 验证按钮显示加载状态
      await expect(syncButton).toContainText('正在同步');
      await expect(syncButton).toBeDisabled();
    });

    test('同步失败应该显示错误提示', async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/v1/payments/status/*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.paymentPending),
        })
      );

      // Mock 同步失败
      await authenticatedPage.route('**/api/v1/payments/sync/*', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: '同步失败',
            statusCode: 500,
          }),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('等待支付确认')).toBeVisible({ timeout: 10000 });

      // 点击同步按钮
      await authenticatedPage.getByRole('button', { name: '同步订单状态' }).click();

      // 验证错误提示
      await expect(authenticatedPage.getByText('同步失败')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('支付失败', () => {
    test('应该显示支付失败状态', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentClosed,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 验证失败图标
      await expect(authenticatedPage.locator('.bg-red-100')).toBeVisible();

      // 验证失败消息
      await expect(
        authenticatedPage.getByText('订单未完成支付或已取消')
      ).toBeVisible();
    });

    test('应该显示重新购买按钮', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentClosed,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 验证重新购买按钮
      await expect(
        authenticatedPage.getByRole('button', { name: '重新购买' })
      ).toBeVisible();
    });

    test('点击重新购买应该跳转到升级页面', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentClosed,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 点击重新购买
      await authenticatedPage.getByRole('button', { name: '重新购买' }).click();

      // 验证跳转到升级页面
      await expect(authenticatedPage).toHaveURL('/dashboard/subscription/upgrade');
    });

    test('失败页面应该显示同步按钮（已支付？点击同步）', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentClosed,
        syncPayment: mockResponses.syncPaymentSuccess,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 验证同步按钮
      await expect(
        authenticatedPage.getByRole('button', { name: /已支付.*点击同步/ })
      ).toBeVisible();
    });

    test('从失败页面同步成功应该变为成功状态', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentClosed,
        syncPayment: mockResponses.syncPaymentSuccess,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 点击同步按钮
      await authenticatedPage.getByRole('button', { name: /已支付.*点击同步/ }).click();

      // 验证状态变为成功
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('缺少订单号', () => {
    test('没有订单号应该显示失败状态', async ({ authenticatedPage }) => {
      // 不提供 orderNo 参数
      await authenticatedPage.goto('/dashboard/subscription/payment/result');

      // 验证显示失败状态
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 验证错误消息
      await expect(
        authenticatedPage.getByText('订单信息不存在')
      ).toBeVisible();
    });

    test('没有订单号不应该显示同步按钮', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/subscription/payment/result');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 10000 });

      // 验证没有同步按钮
      await expect(
        authenticatedPage.getByRole('button', { name: /同步/ })
      ).not.toBeVisible();
    });
  });

  test.describe('返回会员中心', () => {
    test('应该显示返回会员中心链接', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPaid,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });

      // 验证返回链接
      const returnLink = authenticatedPage.getByRole('link', { name: '返回会员中心' });
      await expect(returnLink).toBeVisible();
    });

    test('点击返回会员中心应该跳转', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        paymentStatus: mockResponses.paymentPaid,
      });

      await authenticatedPage.goto('/dashboard/subscription/payment/result?orderNo=TEST-ORDER-001');

      // 等待加载完成
      await expect(authenticatedPage.getByText('支付成功')).toBeVisible({ timeout: 10000 });

      // 点击返回会员中心
      await authenticatedPage.getByRole('link', { name: '返回会员中心' }).click();

      // 验证跳转
      await expect(authenticatedPage).toHaveURL('/dashboard/subscription');
    });
  });
});
