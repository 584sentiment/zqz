# AI 求职辅助平台数据库设计文档

> **版本**: v1.0
> **创建日期**: 2026-02-15
> **数据库**: PostgreSQL 15+ with pgvector

---

## 目录

- [1. 数据库概述](#1-数据库概述)
- [2. 实体关系图](#2-实体关系图)
- [3. 核心表设计](#3-核心表设计)
- [4. 索引策略](#4-索引策略)
- [5. 分库分表策略](#5-分库分表策略)
- [6. 缓存设计](#6-缓存设计)
- [7. 向量数据库设计](#7-向量数据库设计)
- [8. 数据迁移](#8-数据迁移)

---

## 1. 数据库概述

### 1.1 选型理由

| 数据库 | 用途 | 理由 |
|--------|------|------|
| **PostgreSQL** | 主数据库 | • 关系型数据，事务支持<br>• JSON 字段灵活<br>• pgvector 向量检索<br>• 开源稳定 |
| **Redis** | 缓存/会话 | • 高性能读写<br>• 丰富数据结构<br>• 分布式锁 |
| **MongoDB** | 日志存储 | • 文档型，适合非结构化<br>• 海量数据存储<br>• 灵活查询 |

### 1.2 数据库架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ PostgreSQL │ │   Redis   │ │  MongoDB  │
│           │ │           │ │           │
│ 业务数据   │ │ 缓存      │ │ 日志      │
│ 向量检索   │ │ 会话      │ │ 聊天记录  │
└───────────┘ └───────────┘ └───────────┘
```

---

## 2. 实体关系图

```mermaid
erDiagram
    User ||--|| Profile : has
    User ||--o{ Job : creates
    User ||--o{ Resume : creates
    User ||--o{ Interview : creates
    User ||--|| Subscription : has

    Profile ||--o{ Skill : contains
    Profile ||--o{ Experience : contains
    Profile ||--o{ Project : contains
    Profile ||--o{ Education : contains

    Job ||--o{ Resume : targets
    Job }o--|| QuestionBank : references

    Interview ||--o{ InterviewQuestion : contains
    Interview ||--|| InterviewReport : has

    User ||--o{ UsageLog : generates
```

---

## 3. 核心表设计

### 3.1 用户相关表

#### 3.1.1 users (用户表)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(100),
    avatar_url      TEXT,

    -- 邮箱验证
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,

    -- OAuth
    oauth_provider VARCHAR(50),
    oauth_id       VARCHAR(255),

    -- 软删除
    deleted_at     TIMESTAMP,

    -- 时间戳
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- 触发器：更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### 3.1.2 profiles (用户档案表)

```sql
CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- 基本信息
    name            VARCHAR(100) NOT NULL,
    gender          VARCHAR(10),
    birth_date      DATE,
    location        VARCHAR(255),

    -- 求职意向
    education_level VARCHAR(50),
    work_years      INTEGER,
    self_intro      TEXT,
    career_goals    TEXT,

    -- 期望
    target_roles    JSONB DEFAULT '[]',
    target_locations JSONB DEFAULT '[]',
    expected_salary JSONB,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_target_roles ON profiles USING GIN(target_roles);
```

#### 3.1.3 skills (技能表)

```sql
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    name            VARCHAR(100) NOT NULL,
    category        VARCHAR(50) NOT NULL, -- technical, soft, language
    level           INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    verified        BOOLEAN NOT NULL DEFAULT FALSE,

    -- 证明/经历
    evidence        TEXT,
    years           INTEGER,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_profile_id ON skills(profile_id);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_name ON skills(name);
```

#### 3.1.4 experiences (工作经历表)

```sql
CREATE TABLE experiences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    company         VARCHAR(255) NOT NULL,
    position        VARCHAR(255) NOT NULL,
    location        VARCHAR(255),
    start_date      DATE NOT NULL,
    end_date        DATE,
    current         BOOLEAN NOT NULL DEFAULT FALSE,

    description     TEXT,
    highlights      TEXT[] DEFAULT '{}',

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_experiences_profile_id ON experiences(profile_id);
CREATE INDEX idx_experiences_company ON experiences(company);
CREATE INDEX idx_experiences_dates ON experiences(start_date DESC, end_date DESC);
```

#### 3.1.5 projects (项目经历表)

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(255) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,

    description     TEXT NOT NULL,
    tech_stack      TEXT[] NOT NULL,
    achievements    TEXT[] DEFAULT '{}',
    link            TEXT,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_profile_id ON projects(profile_id);
CREATE INDEX idx_projects_tech_stack ON projects USING GIN(tech_stack);
```

#### 3.1.6 educations (教育经历表)

```sql
CREATE TABLE educations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    school          VARCHAR(255) NOT NULL,
    degree          VARCHAR(100) NOT NULL,
    major           VARCHAR(255) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,

    gpa             DECIMAL(3,2),
    description     TEXT,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_educations_profile_id ON educations(profile_id);
```

### 3.2 岗位相关表

#### 3.2.1 jobs (岗位表)

```sql
CREATE TABLE jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title           VARCHAR(255),
    company         VARCHAR(255),
    location        VARCHAR(255),

    source_type     VARCHAR(20) NOT NULL, -- screenshot, link, text
    source_url      TEXT,
    source_file_key TEXT,

    description     TEXT,
    requirements    JSONB,

    match_score     DECIMAL(5,2),
    matched_skills  TEXT[] DEFAULT '{}',

    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, archived, applied
    notes           TEXT,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_requirements ON jobs USING GIN(requirements);
```

### 3.3 简历相关表

#### 3.3.1 resumes (简历表)

```sql
CREATE TABLE resumes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,

    name            VARCHAR(255) NOT NULL,
    template_id     VARCHAR(50) NOT NULL,
    language        VARCHAR(10) NOT NULL DEFAULT 'zh',

    content         JSONB,
    file_url        TEXT,

    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    match_score     DECIMAL(5,2),

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_job_id ON resumes(job_id);
CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resumes_content ON resumes USING GIN(content);
```

#### 3.3.2 resume_templates (简历模板表)

```sql
CREATE TABLE resume_templates (
    id              VARCHAR(50) PRIMARY KEY,

    name            VARCHAR(100) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    thumbnail       TEXT NOT NULL,
    preview         TEXT NOT NULL,
    description     TEXT,

    config          JSONB NOT NULL,
    is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resume_templates_category ON resume_templates(category);
CREATE INDEX idx_resume_templates_active ON resume_templates(is_active) WHERE is_active = TRUE;
```

### 3.4 面试相关表

#### 3.4.1 interviews (面试表)

```sql
CREATE TABLE interviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type            VARCHAR(20) NOT NULL, -- mock, preparation
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',

    job_context     JSONB,
    questions       JSONB NOT NULL,

    -- 模拟面试相关
    transcript      JSONB,
    report          JSONB,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_type_status ON interviews(type, status);
```

#### 3.4.2 question_banks (题库表)

```sql
CREATE TABLE question_banks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category        VARCHAR(50) NOT NULL,
    position        VARCHAR(50),
    difficulty      VARCHAR(20) NOT NULL,

    question        TEXT NOT NULL,
    keypoints       TEXT[] NOT NULL,

    usage_count     INTEGER NOT NULL DEFAULT 0,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_question_banks_category ON question_banks(category);
CREATE INDEX idx_question_banks_position ON question_banks(position);
CREATE INDEX idx_question_banks_difficulty ON question_banks(difficulty);
CREATE INDEX idx_question_banks_usage ON question_banks(usage_count DESC);
```

### 3.5 订阅相关表

#### 3.5.1 subscriptions (订阅表)

```sql
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    plan            VARCHAR(20) NOT NULL DEFAULT 'free',

    -- 配额
    ai_quota        INTEGER NOT NULL DEFAULT 10,
    resume_quota    INTEGER NOT NULL DEFAULT 3,
    interview_quota INTEGER NOT NULL DEFAULT 1,

    -- 周期
    start_date      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date        TIMESTAMP,

    auto_renew      BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
```

### 3.6 系统相关表

#### 3.6.1 usage_logs (使用日志表)

```sql
CREATE TABLE usage_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    action          VARCHAR(50) NOT NULL,
    resource        VARCHAR(50),

    cost_tokens     INTEGER,
    cost_cny        DECIMAL(10,4),

    metadata        JSONB,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_action ON usage_logs(action);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- 分区表（按月分区）
CREATE TABLE usage_logs_partitioned (
    LIKE usage_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE usage_logs_2025_01 PARTITION OF usage_logs_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3.7 技能发掘会话表

#### 3.7.1 skill_discovery_sessions

```sql
CREATE TABLE skill_discovery_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,

    status          VARCHAR(20) NOT NULL DEFAULT 'active',

    discovered_skills TEXT[] DEFAULT '{}',
    messages_count  INTEGER NOT NULL DEFAULT 0,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skill_discovery_user_id ON skill_discovery_sessions(user_id);
CREATE INDEX idx_skill_discovery_status ON skill_discovery_sessions(status);
```

#### 3.7.2 skill_discovery_messages

```sql
CREATE TABLE skill_discovery_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES skill_discovery_sessions(id) ON DELETE CASCADE,

    role            VARCHAR(20) NOT NULL, -- user, assistant
    content         TEXT NOT NULL,

    suggested_skills TEXT[] DEFAULT '{}',

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skill_discovery_messages_session_id ON skill_discovery_messages(session_id);
CREATE INDEX idx_skill_discovery_messages_created_at ON skill_discovery_messages(created_at ASC);
```

---

## 4. 索引策略

### 4.1 索引设计原则

| 原则 | 说明 |
|------|------|
| 查询驱动 | 根据实际查询模式创建索引 |
| 复合索引顺序 | 高选择性列在前 |
| 部分索引 | 对特定条件的行建索引 |
| 覆盖索引 | 索引包含查询所需所有字段 |

### 4.2 核心索引汇总

```sql
-- 用户相关
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_profiles_target_roles_gin ON profiles USING GIN(target_roles);

-- 岗位相关
CREATE INDEX CONCURRENTLY idx_jobs_user_status_created ON jobs(user_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_jobs_requirements_gin ON jobs USING GIN(requirements);

-- 简历相关
CREATE INDEX CONCURRENTLY idx_resumes_user_status ON resumes(user_id, status);
CREATE INDEX CONCURRENTLY idx_resumes_content_gin ON resumes USING GIN(content);

-- 技能发掘
CREATE INDEX CONCURRENTLY idx_skill_sessions_user_status ON skill_discovery_sessions(user_id, status);
```

### 4.3 全文搜索

```sql
-- 为岗位描述创建全文搜索
ALTER TABLE jobs ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.company, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_search_vector_update
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION jobs_search_vector_update();

CREATE INDEX idx_jobs_search ON jobs USING GIN(search_vector);
```

---

## 5. 分库分表策略

### 5.1 当前阶段

**单库单表**，使用 PostgreSQL 的分区能力应对数据增长。

### 5.2 分区策略

```sql
-- usage_logs 按月分区
CREATE TABLE usage_logs (
    -- 表结构
) PARTITION BY RANGE (created_at);

-- 自动创建分区
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

### 5.3 未来扩展

当单表数据量 > 1亿 时，考虑按 user_id 进行水平分片。

---

## 6. 缓存设计

### 6.1 Redis 数据结构

| 数据类型 | Key 模式 | TTL | 用途 |
|---------|---------|-----|------|
| String | `user:{id}` | 1h | 用户信息缓存 |
| String | `session:{id}` | 7d | 会话存储 |
| List | `chat:{session_id}` | 24h | AI 对话历史 |
| Hash | `job:parse:{id}` | 7d | 岗位解析结果 |
| Hash | `quota:{user_id}:{month}` | 31d | 配额使用记录 |
| String | `rate_limit:{user_id}:{action}` | 60s | 速率限制 |

### 6.2 缓存更新策略

```typescript
// Cache-Aside 模式
async getUser(userId: string): Promise<User> {
  // 1. 尝试从缓存获取
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // 2. 从数据库获取
  const user = await db.user.findUnique({ where: { id: userId } });

  // 3. 写入缓存
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));

  return user;
}

// Write-Through 模式（更新时同步更新缓存）
async updateUser(userId: string, data: UpdateUserDto) {
  const user = await db.user.update({ where: { id: userId }, data });
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}
```

---

## 7. 向量数据库设计

### 7.1 pgvector 扩展

```sql
-- 安装 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 向量表（用于 RAG 检索）
CREATE TABLE document_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content         TEXT NOT NULL,
    embedding       vector(1536), -- OpenAI embedding 维度
    metadata        JSONB,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 向量相似度索引
CREATE INDEX idx_document_embeddings_vector
    ON document_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

### 7.2 RAG 检索

```sql
-- 相似度搜索
SELECT id, content, metadata,
       1 - (embedding <=> $1) as similarity
FROM document_embeddings
WHERE user_id = $2
ORDER BY embedding <=> $1
LIMIT 5;
```

---

## 8. 数据迁移

### 8.1 Prisma 迁移

```bash
# 创建迁移
npx prisma migrate dev --name add_user_avatar

# 重置数据库（开发环境）
npx prisma migrate reset

# 部署迁移（生产环境）
npx prisma migrate deploy
```

### 8.2 迁移文件示例

```prisma
-- migrate_20250215_init.sql

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

### 8.3 数据回滚策略

1. **迁移前备份**
   ```bash
   pg_dump -U user -d database > backup_$(date +%Y%m%d).sql
   ```

2. **版本化迁移**
   - 每个迁移文件都有对应的 down migration
   - 支持回滚到任意版本

3. **蓝绿部署**
   - 新版本先在备用环境运行
   - 验证通过后切换流量

---

## 附录

### A. 数据库连接配置

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

REDIS_URL="redis://localhost:6379"
MONGODB_URI="mongodb://localhost:27017/dbname"
```

### B. 性能优化参数

```conf
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
max_parallel_maintenance_workers = 2
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-15
**维护者**: 数据库团队
