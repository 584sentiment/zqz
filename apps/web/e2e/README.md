# E2E 测试

本目录包含 AI 求职辅助平台的端到端 (E2E) 测试用例。

## 目录结构

```
e2e/
├── fixtures/              # 测试 Fixtures 和 Mock 数据
│   ├── auth.ts           # 认证相关 Fixtures
│   └── mocks.ts          # API Mock 响应数据
├── subscription/          # 订阅和支付相关测试
│   ├── upgrade.spec.ts   # 升级页面测试
│   ├── payment-result.spec.ts  # 支付结果页面测试
│   ├── membership.spec.ts      # 会员中心页面测试
│   ├── payment-flow.spec.ts    # 完整支付流程测试
│   └── index.ts          # 测试索引导出
└── README.md             # 本文档
```

## 运行测试

### 前提条件

1. 确保已安装依赖：
   ```bash
   npm install
   ```

2. 安装 Playwright 浏览器：
   ```bash
   npx playwright install
   ```

### 运行所有测试

```bash
# 在 apps/web 目录下
npm run test:e2e

# 或者使用 npx
npx playwright test
```

### 运行特定测试

```bash
# 运行单个测试文件
npx playwright test e2e/subscription/upgrade.spec.ts

# 运行特定测试用例
npx playwright test -g "应该显示升级页面"

# 运行 subscription 目录下所有测试
npx playwright test e2e/subscription/
```

### 调试测试

```bash
# 以 UI 模式运行（推荐）
npx playwright test --ui

# 以 headed 模式运行（可见浏览器）
npx playwright test --headed

# 使用调试模式
npx playwright test --debug
```

### 生成测试报告

```bash
# 运行测试后查看 HTML 报告
npx playwright show-report

# 生成 trace 文件（失败时自动生成）
npx playwright test --trace on
```

## 测试覆盖范围

### 1. 升级页面 (`/dashboard/subscription/upgrade`)

- 页面正确显示
- 套餐选择（基础版/专业版）
- 购买时长选择（1/3/6/12 个月）
- 价格计算验证
- 支付按钮状态
- 错误处理

### 2. 支付结果页面 (`/dashboard/subscription/payment/result`)

- 加载状态显示
- 支付成功状态
- 等待支付确认状态
- 支付失败状态
- 同步订单状态功能
- 刷新状态功能
- 缺少订单号处理

### 3. 会员中心 (`/dashboard/subscription`)

- 免费用户信息显示
- 付费用户信息显示
- 配额使用情况
- 自动续费设置
- 取消/恢复订阅
- 订单历史
- 套餐对比

### 4. 完整支付流程

- 从升级到支付成功的完整流程
- 从待支付到支付成功
- 从待支付到支付失败
- 切换套餐类型
- 取消订阅后恢复
- 边界情况和错误处理

## Mock 数据

测试使用 Mock API 响应来模拟后端行为，避免依赖真实的支付宝沙箱环境。

### 主要 Mock 响应

| Mock 名称 | 说明 |
|----------|------|
| `subscriptionFree` | 免费版用户订阅信息 |
| `subscriptionBasic` | 基础版用户订阅信息 |
| `subscriptionCanceled` | 已取消订阅的用户信息 |
| `plans` | 套餐列表 |
| `createPayment` | 创建支付订单响应 |
| `paymentPending` | 待支付订单状态 |
| `paymentPaid` | 已支付订单状态 |
| `paymentClosed` | 已关闭订单状态 |
| `syncPaymentSuccess` | 同步支付成功响应 |
| `paymentHistory` | 支付历史记录 |

### 自定义 Mock 数据

可以在测试中自定义 Mock 数据：

```typescript
import { setupMockRoutes, mockResponses } from '../fixtures/mocks';

test('自定义测试', async ({ authenticatedPage }) => {
  // 使用默认 Mock
  setupMockRoutes(authenticatedPage, {
    subscription: mockResponses.subscriptionFree,
  });

  // 或者使用自定义 Mock
  await authenticatedPage.route('**/api/v1/subscriptions/me', (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({ /* 自定义数据 */ }),
    })
  );
});
```

## 测试最佳实践

### 1. 使用 Page Object Model

对于复杂的页面，建议创建 Page Object：

```typescript
// e2e/pages/UpgradePage.ts
export class UpgradePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/subscription/upgrade');
  }

  async selectPlan(planId: string) {
    await this.page.locator(`text=${planId === 'pro' ? '专业版' : '基础版'}`).first().click();
  }

  async selectPeriod(months: number) {
    await this.page.getByRole('button', { name: `${months} 个月` }).click();
  }
}
```

### 2. 使用 data-testid

在组件中添加 `data-testid` 属性可以提高测试稳定性：

```tsx
<Button data-testid="pay-button">立即支付</Button>
```

```typescript
await page.getByTestId('pay-button').click();
```

### 3. 等待策略

- 优先使用 `expect().toBeVisible()` 而不是 `waitForTimeout`
- 对于 API 响应，使用 `waitForResponse`
- 对于页面导航，使用 `waitForURL`

### 4. 测试隔离

- 每个测试应该独立运行
- 使用 `beforeEach` 设置测试环境
- 使用 `afterEach` 清理测试数据

## CI/CD 集成

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 故障排查

### 常见问题

1. **测试超时**
   - 增加超时时间：`await expect(element).toBeVisible({ timeout: 10000 })`
   - 检查网络连接
   - 验证 Mock 响应是否正确

2. **元素未找到**
   - 使用 `--headed` 模式查看页面实际状态
   - 检查选择器是否正确
   - 添加 `data-testid` 属性

3. **认证失败**
   - 检查 Mock token 是否正确设置
   - 验证 localStorage 是否正确初始化

4. **Mock 不生效**
   - 确保在页面加载前设置 Mock
   - 检查 URL 匹配模式

### 调试技巧

```bash
# 查看浏览器控制台日志
npx playwright test --headed --console

# 生成 trace 文件
npx playwright test --trace on

# 慢速运行（每步暂停）
npx playwright test --slow-mo=1000
```

## 维护指南

### 添加新测试

1. 在适当的目录下创建测试文件
2. 导入必要的 fixtures 和工具
3. 使用 `test.describe` 组织测试用例
4. 在 `afterEach` 中清理 Mock

### 更新 Mock 数据

1. 修改 `e2e/fixtures/mocks.ts`
2. 确保 Mock 数据与 API 响应格式一致
3. 更新相关测试用例

### 定期维护

- 每周运行完整测试套件
- 检查并修复 flaky 测试
- 更新 Playwright 版本
- 审查测试覆盖率
