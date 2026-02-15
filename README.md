# AI 求职辅助平台

基于 AI 技术的智能求职辅助平台，提供岗位解析、技能挖掘、简历生成、面试准备等一站式求职服务。

## 技术栈

- **前端**: Next.js 14 + React 18 + TypeScript + TailwindCSS + shadcn/ui
- **后端**: NestJS + TypeScript + Prisma ORM
- **数据库**: PostgreSQL + Redis
- **AI**: LangChain.js + OpenAI/Claude

## 项目结构

```
├── apps/
│   ├── api/          # NestJS 后端 API
│   └── web/          # Next.js 前端应用
├── packages/
│   ├── ai/           # AI 服务封装
│   ├── database/     # Prisma 数据库层
│   └── shared/       # 共享类型和工具
├── docs/             # 设计文档
└── prototype/        # 原型设计
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写必要的配置：

```bash
cp .env.example .env
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 同步数据库结构
npm run db:push
```

### 4. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:web  # 前端 http://localhost:3000
npm run dev:api  # 后端 http://localhost:3001
```

## 功能模块

### 认证模块
- 邮箱密码注册/登录
- 第三方登录（微信、GitHub）
- 邮箱验证
- 密码重置

### 岗位模块
- 文本/截图/链接导入岗位
- AI 智能解析岗位信息
- 岗位管理和归档

### 技能发掘
- AI 引导式对话
- 自动提取技能标签
- 关联岗位推荐

### 简历模块
- AI 生成定制简历
- 多种模板选择
- PDF/Word 导出
- 岗位匹配度分析

### 面试模块
- AI 模拟面试（语音/文字）
- 面试准备计划
- 面试题库
- 详细评估报告

### 订阅模块
- 多种套餐选择
- 配额管理
- 支付集成

## 文档

- [产品需求文档](docs/PRD-AI-Job-Assistant-Platform.md)
- [架构设计](docs/architecture-design-ai-job-assistant.md)
- [API 设计](docs/api-design-ai-job-assistant.md)
- [数据库设计](docs/database-design-ai-job-assistant.md)
- [测试策略](docs/testing-strategy-ai-job-assistant.md)

## 开发命令

```bash
# 开发
npm run dev           # 启动开发服务器
npm run build         # 构建所有项目
npm run lint          # 代码检查
npm run format        # 代码格式化

# 测试
npm run test          # 运行测试
npm run test:e2e      # E2E 测试

# 数据库
npm run db:generate   # 生成 Prisma 客户端
npm run db:push       # 同步数据库结构
npm run db:migrate    # 运行迁移
npm run db:studio     # 打开 Prisma Studio
```

## 许可证

MIT
