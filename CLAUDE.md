# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI 求职辅助平台 - 基于 AI 技术的智能求职辅助系统，提供岗位解析、技能挖掘、简历生成、面试准备等一站式求职服务。

## 技术栈

- **前端**: Next.js 14 + React 18 + TypeScript + TailwindCSS + shadcn/ui + Zustand + TanStack Query
  - 画布编辑: Konva + react-konva
  - 富文本: TipTap
- **后端**: NestJS + TypeScript + Prisma ORM + Passport JWT + Socket.io
- **数据库**: PostgreSQL + Redis (ioredis)
- **AI**: LangChain.js + OpenAI
- **Monorepo**: npm workspaces + Turborepo

## 常用命令

```bash
# 开发
npm run dev              # 同时启动前端(3000)和后端(3001)
npm run dev:web          # 仅启动前端 http://localhost:3000
npm run dev:api          # 仅启动后端 http://localhost:3001

# 构建
npm run build            # 构建所有项目 (turbo)
npm run lint             # 代码检查 (turbo)
npm run format           # Prettier 格式化

# 测试
npm run test             # 运行所有测试
# 单独测试：
npm run test -w apps/api          # 后端单元测试
npm run test:e2e -w apps/api      # 后端 E2E 测试
npm run test -w apps/web          # 前端单元测试 (Vitest)
npm run test:e2e -w apps/web      # 前端 E2E 测试 (Playwright)

# 数据库
npm run db:generate      # 生成 Prisma 客户端
npm run db:push          # 同步数据库结构 (开发环境)
npm run db:migrate       # 创建并应用迁移
npm run db:studio        # 打开 Prisma Studio
```

## 项目结构

```
├── apps/
│   ├── api/                 # NestJS 后端 API
│   │   └── src/
│   │       ├── modules/     # 业务模块 (auth, users, jobs, resumes, interviews, skills, subscriptions, payments, admin, notifications)
│   │       ├── common/      # 公共组件 (guards, decorators, filters, interceptors)
│   │       └── app.module.ts
│   └── web/                 # Next.js 14 前端 (App Router)
│       └── src/
│           ├── app/         # 页面路由
│           ├── components/  # React 组件
│           ├── lib/         # 工具库
│           └── stores/      # Zustand 状态管理
├── packages/
│   ├── database/            # Prisma ORM 层
│   │   └── prisma/schema.prisma
│   ├── ai/                  # AI 服务封装 (LangChain)
│   │   └── src/
│   │       ├── providers/   # AI 提供商
│   │       ├── services/    # AI 服务
│   │       └── prompts/     # Prompt 模板
│   └── shared/              # 共享类型和工具
│       └── src/
│           ├── types/       # TypeScript 类型定义
│           └── utils/       # 工具函数
└── docs/                    # 设计文档
```

## 包依赖关系

```
apps/api  ──┬──> packages/database
            ├──> packages/ai
            └──> packages/shared

apps/web   ────> packages/shared
```

## API 模块架构

后端采用 NestJS 模块化架构，每个业务模块包含：
- `*.controller.ts` - 路由控制器
- `*.service.ts` - 业务逻辑
- `*.module.ts` - 模块定义
- `*.dto.ts` - 数据传输对象
- `*.entity.ts` - 实体定义 (可选，主要用 Prisma)

## 数据库模型

核心模型及其关系：
- **User** → Profile, Subscription, Jobs, Resumes, Interviews
- **Profile** → Skills, Experiences, Projects, Educations
- **Job** → Resumes, SkillDiscoverySessions
- **Resume** → ResumeTemplate (引用)
- **Interview** → 独立实体

## 认证与安全

### 认证方式
- **邮箱密码**: 注册/登录 + 邮箱验证 + 密码重置
- **OAuth**: GitHub、微信扫码登录
- **JWT**: 访问令牌 15 分钟过期，支持 Refresh Token

### 配额系统
使用 `@RequireQuota` 装饰器控制 AI 功能调用：
```typescript
@RequireQuota('ai')        // AI 对话配额
@RequireQuota('resume')    // 简历生成配额
@RequireQuota('interview') // 模拟面试配额
```

### 速率限制
全局配置：每分钟最多 100 次请求（ThrottlerGuard）

## 环境变量

必需的环境变量 (见 `.env.example`):
- `DATABASE_URL` / `DIRECT_URL` - PostgreSQL 连接
- `REDIS_URL` - Redis 连接
- `JWT_SECRET` / `JWT_EXPIRES_IN` - JWT 配置
- `OPENAI_API_KEY` - AI 服务
- `NEXT_PUBLIC_API_URL` - 前端 API 地址

## 开发约定

### Workspace 命令
使用 `-w` 参数指定工作区：
```bash
npm run <script> -w <workspace>
# 示例：
npm run build -w packages/database
npm run dev -w apps/web
```

### 包引用
内部包使用 `@ai-job-assistant/*` 前缀：
```typescript
import { prisma } from '@ai-job-assistant/database';
import { ResumeStatus } from '@ai-job-assistant/shared/types';
```

### TypeScript 配置
根目录 `tsconfig.json` 定义了严格的基础配置，各子项目可扩展。启用 `noUncheckedIndexedAccess`，访问数组/对象索引时需处理 undefined。

### 代码风格
项目使用 Prettier 格式化，配置见 `.prettierrc`：
- 单引号
- Tab 宽度: 2
- 尾随逗号: es5
- 打印宽度: 100

### 前端路由结构
使用 Next.js 路由组组织页面：
- `(auth)/` - 认证相关页面：login, register, forgot-password, verify-email
- `(dashboard)/dashboard/` - 主要功能：jobs, resumes, interviews, skills, profile, settings, subscription
- `(demo)/` - 演示页面

### 后端模块结构
每个业务模块遵循 NestJS 约定：
```
modules/<name>/
├── <name>.controller.ts   # 路由定义
├── <name>.service.ts      # 业务逻辑
├── <name>.module.ts       # 模块注册
├── dto/                   # 请求/响应 DTO
└── guards/                # 模块专属守卫
```

### 测试约定
- **前端单元测试**: Vitest (`npm run test -w apps/web`)
- **前端 E2E 测试**: Playwright (`npm run test:e2e -w apps/web`)，测试文件位于 `apps/web/e2e/`
- **后端单元测试**: Jest (`npm run test -w apps/api`)

## 设计文档

详细设计见 `docs/` 目录：
- PRD-AI-Job-Assistant-Platform.md - 产品需求
- architecture-design-ai-job-assistant.md - 架构设计
- api-design-ai-job-assistant.md - API 设计
- database-design-ai-job-assistant.md - 数据库设计
- testing-strategy-ai-job-assistant.md - 测试策略
