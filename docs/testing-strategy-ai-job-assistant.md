# AI 求职辅助平台测试策略文档

> **版本**: v1.0
> **创建日期**: 2026-02-15
> **测试负责人**: QA 团队

---

## 目录

- [1. 测试策略概述](#1-测试策略概述)
- [2. 单元测试规范](#2-单元测试规范)
- [3. 集成测试规范](#3-集成测试规范)
- [4. E2E 测试规范](#4-e2e-测试规范)
- [5. AI 功能测试](#5-ai-功能测试)
- [6. 性能测试](#6-性能测试)
- [7. 安全测试](#7-安全测试)
- [8. 测试数据管理](#8-测试数据管理)
- [9. CI/CD 集成](#9-cicd-集成)

---

## 1. 测试策略概述

### 1.1 测试金字塔

```
                    /\
                   /  \
                  / E2E \
                 /______\
                /        \
               / 集成测试  \
              /__________  \
             /            \ \
            /    单元测试    \ \
           /____________________\

           大量           中等        少量
           快速           中等        慢速
           便宜           中等        昂贵
```

### 1.2 测试类型与覆盖率目标

| 测试类型 | 覆盖率目标 | 负责人 | 频率 |
|---------|-----------|--------|------|
| 单元测试 | 80%+ | 开发者 | 每次 commit |
| 集成测试 | 70%+ | 开发者 | 每次 commit |
| E2E 测试 | 核心流程 100% | QA | 每天 |
| 性能测试 | 关键接口 | QA | 每周 |
| 安全测试 | - | 安全专家 | 每月 |

### 1.3 测试环境

| 环境 | 用途 | 数据 |
|------|------|------|
| **Local** | 开发调试 | Mock 数据 |
| **Dev** | 开发集成 | 测试数据 |
| **Staging** | 预发布 | 生产副本 |
| **Prod** | 生产环境 | 真实数据 |

---

## 2. 单元测试规范

### 2.1 后端单元测试 (NestJS + Jest)

#### 配置

```json
// package.json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

#### 服务测试示例

```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: Repository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return access token when credentials are valid', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'notfound@example.com',
        password: 'password123',
      };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

#### 控制器测试示例

```typescript
// auth.controller.spec.ts
describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return login response', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResponse = {
        accessToken: 'mock-token',
        user: mockUser,
      };

      jest.spyOn(service, 'login').mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });
});
```

### 2.2 前端单元测试 (Vitest + Testing Library)

#### 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
      ],
    },
  },
});
```

#### 组件测试示例

```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### Hook 测试示例

```typescript
// useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { authApi } from '@/lib/api/auth';

vi.mock('@/lib/api/auth');

describe('useAuth', () => {
  it('should login successfully', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token', refreshToken: 'refresh' },
    };

    vi.mocked(authApi.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
```

### 2.3 覆盖率要求

```bash
# 运行测试并生成覆盖率报告
npm run test:cov

# 覆盖率阈值要求
# - Statements: 80%
# - Branches: 75%
# - Functions: 80%
# - Lines: 80%
```

---

## 3. 集成测试规范

### 3.1 API 集成测试

#### Supertest 配置

```typescript
// test/setup.e2e.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

export async function createApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  await app.init();

  return app;
}

// auth.e2e-spec.ts
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('tokens');
        });
    });

    it('should fail with existing email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
        });
    });
  });
});
```

### 3.2 数据库集成测试 (Testcontainers)

#### 配置

```typescript
// test/database.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

export async function startDbContainer() {
  container = await new PostgreSqlContainer()
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
}

export async function stopDbContainer() {
  await container.stop();
}

// 在测试文件中使用
beforeAll(async () => {
  await startDbContainer();
  await runMigrations();
});

afterAll(async () => {
  await stopDbContainer();
});
```

### 3.3 服务间集成测试

```typescript
// ai.service.integration-spec.ts
describe('AI Service Integration', () => {
  let aiService: AIService;
  let mockOpenAI: OpenAI;

  beforeAll(async () => {
    // 使用真实的 AI 服务或高保真 mock
    mockOpenAI = new OpenAI({ apiKey: 'test-key' });
    aiService = new AIService(mockOpenAI);
  });

  describe('generateResume', () => {
    it('should generate resume with real LLM call (integration)', async () => {
      // 此测试会实际调用 LLM API
      // 仅在 CI/CD 环境或专门的测试环境中运行

      const result = await aiService.generateResume({
        userProfile: mockProfile,
        jobRequirement: mockJob,
      });

      expect(result.content).toBeDefined();
      expect(result.content.summary).toBeTruthy();
      expect(result.content.experience).toBeInstanceOf(Array);
    }, 30000); // 30秒超时
  });
});
```

---

## 4. E2E 测试规范

### 4.1 Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 核心用户流程测试

#### 注册登录流程

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow user to register and login', async ({ page }) => {
    // 注册
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="name"]', 'Test User');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=欢迎')).toBeVisible();

    // 登出
    await page.click('[aria-label="User menu"]');
    await page.click('text=登出');

    // 登录
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });
});
```

#### 简历生成流程

```typescript
// e2e/resume.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Resume Generation', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should generate resume from job description', async ({ page }) => {
    // 导入岗位
    await page.click('text=导入岗位');
    await page.click('text=粘贴文本');
    await page.fill('textarea', mockJobDescription);
    await page.click('button:has-text("解析")');

    await page.waitForSelector('text=解析完成');
    await expect(page.locator('text=高级前端工程师')).toBeVisible();

    // 生成简历
    await page.click('button:has-text("生成简历")');
    await page.selectOption('select[name="template"]', 'modern');
    await page.click('button:has-text("开始生成")');

    // 等待生成完成
    await page.waitForSelector('text=简历生成完成', { timeout: 30000 });
    await expect(page.locator('.resume-preview')).toBeVisible();

    // 导出 PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("导出 PDF")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
```

#### 模拟面试流程

```typescript
// e2e/interview.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mock Interview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should complete voice mock interview', async ({ page, context }) => {
    // 授予麦克风权限
    await context.grantPermissions(['microphone']);

    await page.goto('/interview/mock');
    await page.click('button:has-text("开始面试")');

    // 选择岗位和模式
    await page.selectOption('select[name="job"]', 'job-1');
    await page.click('label:has-text("语音模式")');
    await page.click('button:has-text("确认")');

    // 等待第一个问题
    await expect(page.locator('.question-content')).toBeVisible();
    await expect(page.locator('text=请介绍一下你自己')).toBeVisible();

    // 模拟回答
    await page.click('button[aria-label="开始录音"]');
    await page.waitForTimeout(3000);
    await page.click('button[aria-label="停止录音"]');

    // 查看反馈
    await page.waitForSelector('.feedback-panel');
    await expect(page.locator('.score-display')).toBeVisible();
  });
});
```

### 4.3 视觉回归测试

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('should match dashboard screenshot', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match resume template preview', async ({ page }) => {
    await page.goto('/resume/preview?template=modern');

    await expect(page.locator('.resume-preview')).toHaveScreenshot(
      'resume-modern.png'
    );
  });
});
```

---

## 5. AI 功能测试

### 5.1 LLM 输出验证

```typescript
// ai-output.validator.ts
export interface LLMOutputValidator {
  validateFormat(output: string): boolean;
  validateContent(output: string): ValidationResult;
  validateSafety(output: string): SafetyCheck;
}

export class ResumeGeneratorValidator implements LLMOutputValidator {
  validateFormat(output: string): boolean {
    // 验证 JSON 格式
    try {
      const parsed = JSON.parse(output);
      return (
        typeof parsed === 'object' &&
        'summary' in parsed &&
        'experience' in parsed &&
        'skills' in parsed
      );
    } catch {
      return false;
    }
  }

  validateContent(output: string): ValidationResult {
    const resume = JSON.parse(output);

    const issues: string[] = [];

    // 检查必填字段
    if (!resume.summary || resume.summary.length < 50) {
      issues.push('摘要过短，至少需要50个字符');
    }

    if (!resume.experience || resume.experience.length === 0) {
      issues.push('缺少工作经历');
    }

    // 检查敏感词
    const sensitiveWords = ['歧视', '偏见'];
    const content = JSON.stringify(resume).toLowerCase();
    const foundSensitive = sensitiveWords.filter(w => content.includes(w));

    return {
      valid: issues.length === 0 && foundSensitive.length === 0,
      issues,
      sensitiveWords: foundSensitive,
    };
  }

  validateSafety(output: string): SafetyCheck {
    // 检查 PII 信息
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b\d{3}-\d{3}-\d{4}\b/g;

    const emails = output.match(emailRegex) || [];
    const phones = output.match(phoneRegex) || [];

    return {
      hasPII: emails.length > 0 || phones.length > 0,
      detectedPII: [...emails, ...phones],
      safe: emails.length === 0 && phones.length === 0,
    };
  }
}

// 测试用例
describe('AI Resume Generation', () => {
  let validator: ResumeGeneratorValidator;

  beforeAll(() => {
    validator = new ResumeGeneratorValidator();
  });

  it('should validate output format', () => {
    const output = JSON.stringify(mockResumeOutput);
    expect(validator.validateFormat(output)).toBe(true);
  });

  it('should detect sensitive content', () => {
    const maliciousOutput = JSON.stringify({
      ...mockResumeOutput,
      summary: '这个候选人有性别歧视倾向',
    });

    const result = validator.validateContent(maliciousOutput);
    expect(result.valid).toBe(false);
    expect(result.sensitiveWords).toContain('歧视');
  });

  it('should detect PII information', () => {
    const outputWithPII = '联系电话: 123-456-7890';
    const check = validator.validateSafety(outputWithPII);

    expect(check.hasPII).toBe(true);
    expect(check.detectedPII).toContain('123-456-7890');
  });
});
```

### 5.2 Prompt 测试

```typescript
// prompt.test.ts
describe('Job Parsing Prompt', () => {
  it('should extract job title correctly', async () => {
    const jobText = `
      职位：高级前端工程师
      公司：某某科技有限公司
      ...
    `;

    const result = await aiService.parseJob(jobText);

    expect(result.title).toBe('高级前端工程师');
    expect(result.company).toBe('某某科技有限公司');
  });

  it('should handle malformed input gracefully', async () => {
    const malformedText = 'just some random text';

    const result = await aiService.parseJob(malformedText);

    expect(result).toBeDefined();
    expect(result.confidence).toBeLessThan(0.5);
  });
});
```

---

## 6. 性能测试

### 6.1 API 性能测试 (K6)

```javascript
// k6/tests/resume-generation.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // 10 users for 1 min
    { duration: '2m', target: 50 },   // Ramp up to 50
    { duration: '3m', target: 50 },   // Stay at 50
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% requests under 2s
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // 登录获取 token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const { accessToken } = loginRes.json('data.tokens');

  // 生成简历
  const generateRes = http.post(`${BASE_URL}/resumes/generate`, JSON.stringify({
    name: '测试简历',
    templateId: 'modern',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  check(generateRes, {
    'generation successful': (r) => r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

### 6.2 数据库性能测试

```sql
-- 查询性能分析
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM jobs
WHERE user_id = 'xxx'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- 索引效果测试
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'jobs'
ORDER BY idx_scan DESC;
```

---

## 7. 安全测试

### 7.1 OWASP ZAP 配置

```bash
# 使用 ZAP 进行自动化安全扫描
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html \
  --auth-disable \
  --alertLevel HIGH
```

### 7.2 安全测试用例

```typescript
// security.spec.ts
describe('Security Tests', () => {
  describe('SQL Injection', () => {
    it('should sanitize input in search', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const res = await request(app.getHttpServer())
        .get('/jobs')
        .query({ search: maliciousInput })
        .expect(200);

      // 应该正常返回，不报错
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in user input', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      await page.fill('textarea[name="bio"]', xssPayload);
      await page.click('button:has-text("保存")');

      const content = await page.locator('.bio-display').textContent();
      expect(content).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts', async () => {
      const requests = Array(6).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);

      // 前5次应该返回401，第6次应该返回429
      responses.slice(0, 5).forEach(res => {
        expect(res.status).toBe(401);
      });
      expect(responses[5].status).toBe(429);
    });
  });
});
```

---

## 8. 测试数据管理

### 8.1 Fixtures

```typescript
// test/fixtures/user.fixture.ts
export const userFixtures = {
  basic: {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
  },
  premium: {
    email: 'premium@example.com',
    password: 'Password123!',
    name: 'Premium User',
    subscription: {
      plan: 'pro',
      aiQuota: 1000,
    },
  },
};

// test/fixtures/job.fixture.ts
export const jobFixtures = {
  frontend: {
    title: '高级前端工程师',
    company: '某某科技',
    description: '...',
    requirements: ['React', 'TypeScript'],
  },
};

// 使用 fixture
import { userFixtures } from './test/fixtures/user.fixture';

describe('UserService', () => {
  it('should create user', async () => {
    const user = await userService.create(userFixtures.basic);
    expect(user.email).toBe('test@example.com');
  });
});
```

### 8.2 Factory Pattern

```typescript
// test/factories/user.factory.ts
import { Factory } from 'fishery';
import { User } from '@/entities/user.entity';

export const userFactory = Factory.define<User, ({ params }) => ({
  id: params.id || randomUUID(),
  email: params.email || 'test@example.com',
  passwordHash: params.passwordHash || await hash('password123'),
  nickname: params.nickname || 'Test User',
  emailVerified: params.emailVerified ?? true,
  createdAt: params.createdAt || new Date(),
  updatedAt: params.updatedAt || new Date(),
}));

// 使用 factory
import { userFactory } from './test/factories/user.factory';

const user = userFactory.build({
  email: 'custom@example.com',
});

const users = userFactory.buildList(5); // 创建5个用户
```

---

## 9. CI/CD 集成

### 9.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 9.2 测试报告

```yaml
# .github/workflows/report.yml
name: Test Report

on:
  workflow_run:
    workflows: ['Test Suite']
    types: [completed]

jobs:
  report:
    runs-on: ubuntu-latest
    if: success() || failure()

    steps:
      - uses: actions/download-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Publish Test Report
        uses: mikepenz/action-junit-report@v3
        with:
          report_paths: '**/test-results/junit.xml'
          check_name: Test Results
          detailed_summary: true
          include_passed: true
```

---

## 附录

### A. 测试命令速查

```bash
# 单元测试
npm run test              # 运行所有测试
npm run test:unit         # 只运行单元测试
npm run test:watch        # 监视模式
npm run test:cov          # 生成覆盖率报告

# 集成测试
npm run test:integration  # 运行集成测试

# E2E 测试
npm run test:e2e          # 运行 E2E 测试
npm run test:e2e:ui       # Playwright UI 模式

# 性能测试
npm run test:perf         # 运行 K6 性能测试

# 安全测试
npm run test:security     # 运行 ZAP 安全扫描
```

### B. 测试检查清单

- [ ] 所有新功能都有单元测试
- [ ] 覆盖率达到 80%+
- [ ] 关键流程有 E2E 测试
- [ ] 测试在 CI 中通过
- [ ] Mock 数据足够真实
- [ ] 测试文档完整

---

**文档版本**: v1.0
**最后更新**: 2026-02-15
**维护者**: QA 团队
