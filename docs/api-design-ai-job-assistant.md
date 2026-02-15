# AI 求职辅助平台 API 接口规范文档

> 版本：v1.0.0
> 更新时间：2025-02-15
> 基础路径：`https://api.example.com/api/v1`

---

## 目录

- [1. API 设计规范](#1-api-设计规范)
- [2. 认证授权接口](#2-认证授权接口)
- [3. 用户模块接口](#3-用户模块接口)
- [4. 岗位模块接口](#4-岗位模块接口)
- [5. 技能发掘接口](#5-技能发掘接口)
- [6. 经历管理接口](#6-经历管理接口)
- [7. 简历模块接口](#7-简历模块接口)
- [8. 面试模块接口](#8-面试模块接口)
- [9. 订阅模块接口](#9-订阅模块接口)
- [10. WebSocket 协议](#10-websocket-协议)
- [11. 数据模型](#11-数据模型)

---

## 1. API 设计规范

### 1.1 URL 命名规范

#### 基本原则
- 使用小写字母
- 单词之间用连字符（`-`）分隔
- 使用复数形式表示资源集合
- 使用名词而非动词
- 路径层级不超过 3 层

#### 命名模式

```typescript
// 资源集合
GET    /api/v1/jobs              // 获取岗位列表
POST   /api/v1/jobs              // 创建岗位

// 单个资源
GET    /api/v1/jobs/:id          // 获取岗位详情
PATCH  /api/v1/jobs/:id          // 更新岗位
DELETE /api/v1/jobs/:id          // 删除岗位

// 子资源
GET    /api/v1/jobs/:id/skills   // 获取岗位技能
POST   /api/v1/users/:userId/resumes  // 创建用户简历

// 特殊操作（使用动词）
POST   /api/v1/jobs/:id/parse    // 解析岗位
POST   /api/v1/resumes/:id/export  // 导出简历
POST   /api/v1/auth/refresh      // 刷新令牌
POST   /api/v1/auth/logout       // 登出
```

### 1.2 HTTP 方法规范

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 查询资源（幂等） | `GET /jobs` |
| POST | 创建资源 | `POST /jobs` |
| PATCH | 部分更新资源（幂等） | `PATCH /jobs/:id` |
| PUT | 完整更新资源（幂等） | `PUT /jobs/:id` |
| DELETE | 删除资源（幂等） | `DELETE /jobs/:id` |

### 1.3 请求格式

#### Content-Type
```json
// 标准 JSON 请求
Content-Type: application/json

// 文件上传
Content-Type: multipart/form-data

// 流式请求
Content-Type: text/event-stream
```

#### 请求头规范
```http
// 标准请求头
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>
X-Client-Version: 1.0.0

// 追踪请求头（用于分布式追踪）
X-Trace-ID: <trace_id>
X-Span-ID: <span_id>
```

#### 分页参数
```typescript
// 统一使用 cursor-based 分页
interface PaginationParams {
  limit?: number;      // 每页数量，默认 20，最大 100
  cursor?: string;     // 游标，用于获取下一页
  sort?: string;       // 排序字段，如 createdAt:desc
}

// 响应格式
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;  // 可选总数
  };
}
```

### 1.4 响应格式

#### 成功响应
```typescript
// 单个资源
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

// 资源集合
interface CollectionResponse<T> {
  success: true;
  data: T[];
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

// 无数据响应（如 DELETE）
interface NoContentResponse {
  success: true;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
```

#### 错误响应
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // 错误码，如 VALIDATION_ERROR
    message: string;        // 用户友好的错误信息
    details?: unknown;      // 详细错误信息
    stack?: string;         // 堆栈信息（仅开发环境）
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
```

### 1.5 HTTP 状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 OK | 成功 | GET、PATCH 成功 |
| 201 Created | 已创建 | POST 创建资源成功 |
| 204 No Content | 无内容 | DELETE 成功 |
| 400 Bad Request | 错误请求 | 请求参数验证失败 |
| 401 Unauthorized | 未授权 | Token 无效或过期 |
| 403 Forbidden | 禁止访问 | 权限不足 |
| 404 Not Found | 未找到 | 资源不存在 |
| 409 Conflict | 冲突 | 资源冲突（如邮箱已存在） |
| 422 Unprocessable Entity | 无法处理 | 业务逻辑验证失败 |
| 429 Too Many Requests | 请求过多 | 超过速率限制 |
| 500 Internal Server Error | 服务器错误 | 服务器内部错误 |
| 503 Service Unavailable | 服务不可用 | 服务维护中 |

### 1.6 错误码定义

```typescript
enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 认证授权错误 (2xxx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 用户相关错误 (3xxx)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // 订阅配额错误 (4xxx)
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_INACTIVE = 'SUBSCRIPTION_INACTIVE',

  // AI 服务错误 (5xxx)
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_STREAM_INTERRUPTED = 'AI_STREAM_INTERRUPTED',
  AI_CONTENT_FILTERED = 'AI_CONTENT_FILTERED',

  // 文件处理错误 (6xxx)
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',

  // 支付错误 (7xxx)
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
}
```

### 1.7 版本管理策略

#### URL 版本控制
```http
// 主版本（不兼容的更改）
/api/v1/jobs
/api/v2/jobs

// 向后兼容的更改不增加版本号
```

#### 版本兼容性规则
- **MAJOR**：不兼容的 API 更改
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的问题修复

#### 弃用策略
```http
// 响应头标记弃用
Deprecation: true
Sunset: Sat, 01 Apr 2025 00:00:00 GMT
Link: </api/v2/jobs>; rel="successor-version"
Warning: 299 - "API endpoint is deprecated, use /api/v2/jobs instead"
```

---

## 2. 认证授权接口

### 2.1 用户注册

```http
POST /api/v1/auth/register
```

**请求体：**
```typescript
interface RegisterRequest {
  email: string;        // 邮箱，需验证格式
  password: string;     // 密码，最少 8 位，需包含字母和数字
  name?: string;        // 用户名（可选）
  referralCode?: string; // 推荐码（可选）
}
```

**响应：201 Created**
```typescript
interface RegisterResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
      emailVerified: boolean;
      createdAt: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;  // access_token 过期时间（秒）
    };
  };
}
```

### 2.2 用户登录

```http
POST /api/v1/auth/login
```

**请求体：**
```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;  // 记住我，延长 refresh_token 有效期
}
```

**响应：200 OK**
```typescript
interface LoginResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
      emailVerified: boolean;
      subscription: {
        plan: 'free' | 'pro' | 'enterprise';
        expiresAt: string | null;
      };
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}
```

### 2.3 Token 刷新

```http
POST /api/v1/auth/refresh
```

**请求体：**
```typescript
interface RefreshTokenRequest {
  refreshToken: string;
}
```

**响应：200 OK**
```typescript
interface RefreshTokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

### 2.4 用户登出

```http
POST /api/v1/auth/logout
```

**请求头：**
```http
Authorization: Bearer <access_token>
```

**响应：204 No Content**

### 2.5 发送验证邮件

```http
POST /api/v1/auth/send-verification
```

**请求体：**
```typescript
interface SendVerificationRequest {
  email: string;
}
```

**响应：200 OK**
```typescript
interface SendVerificationResponse {
  success: true;
  data: {
    message: '验证邮件已发送';
    expiresAt: string;  // 验证链接过期时间
  };
}
```

### 2.6 验证邮箱

```http
POST /api/v1/auth/verify-email
```

**请求体：**
```typescript
interface VerifyEmailRequest {
  token: string;  // 邮件中的验证令牌
}
```

**响应：200 OK**
```typescript
interface VerifyEmailResponse {
  success: true;
  data: {
    message: '邮箱验证成功';
  };
}
```

### 2.7 发送密码重置邮件

```http
POST /api/v1/auth/forgot-password
```

**请求体：**
```typescript
interface ForgotPasswordRequest {
  email: string;
}
```

**响应：200 OK**
```typescript
interface ForgotPasswordResponse {
  success: true;
  data: {
    message: '重置邮件已发送';
  };
}
```

### 2.8 重置密码

```http
POST /api/v1/auth/reset-password
```

**请求体：**
```typescript
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

**响应：200 OK**
```typescript
interface ResetPasswordResponse {
  success: true;
  data: {
    message: '密码重置成功';
  };
}
```

### 2.9 第三方登录

```http
POST /api/v1/auth/oauth/:provider
```

**路径参数：**
- `provider`: `google` | `github` | `linkedin`

**请求体：**
```typescript
interface OAuthRequest {
  code: string;        // OAuth 授权码
  redirectUri: string; // 回调地址
}
```

**响应：200 OK**
```typescript
interface OAuthResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      avatar?: string;
      emailVerified: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    isNewUser: boolean;  // 是否为新用户
  };
}
```

---

## 3. 用户模块接口

### 3.1 获取当前用户信息

```http
GET /api/v1/users/me
```

**响应：200 OK**
```typescript
interface CurrentUserResponse {
  success: true;
  data: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    emailVerified: boolean;
    subscription: {
      plan: 'free' | 'pro' | 'enterprise';
      expiresAt: string | null;
      quotas: {
        resumesPerMonth: number;
        aiChatsPerMonth: number;
        mockInterviewsPerMonth: number;
      };
      usage: {
        resumesThisMonth: number;
        aiChatsThisMonth: number;
        mockInterviewsThisMonth: number;
      };
    };
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3.2 更新用户信息

```http
PATCH /api/v1/users/me
```

**请求体：**
```typescript
interface UpdateUserRequest {
  name?: string;
  avatar?: string;  // 头像 URL
}
```

**响应：200 OK**
```typescript
interface UpdateUserResponse {
  success: true;
  data: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    updatedAt: string;
  };
}
```

### 3.3 修改密码

```http
POST /api/v1/users/me/change-password
```

**请求体：**
```typescript
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

**响应：200 OK**
```typescript
interface ChangePasswordResponse {
  success: true;
  data: {
    message: '密码修改成功';
  };
}
```

### 3.4 删除账户

```http
DELETE /api/v1/users/me
```

**请求体：**
```typescript
interface DeleteAccountRequest {
  password: string;  // 确认密码
  feedback?: string; // 删除原因（可选）
}
```

**响应：204 No Content**

### 3.5 获取用户档案

```http
GET /api/v1/users/me/profile
```

**响应：200 OK**
```typescript
interface UserProfileResponse {
  success: true;
  data: {
    id: string;
    userId: string;
    phone: string | null;
    location: string | null;
    bio: string | null;
    educations: Education[];
    workExperiences: WorkExperience[];
    projects: Project[];
    skills: string[];
    languages: Language[];
    socialLinks: SocialLink[];
    targetRoles: string[];      // 期望岗位
    targetLocations: string[];  // 期望地点
    expectedSalary: {
      min?: number;
      max?: number;
      currency: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3.6 更新用户档案

```http
PATCH /api/v1/users/me/profile
```

**请求体：**
```typescript
interface UpdateProfileRequest {
  phone?: string;
  location?: string;
  bio?: string;
  targetRoles?: string[];
  targetLocations?: string[];
  expectedSalary?: {
    min?: number;
    max?: number;
    currency: string;
  };
}
```

**响应：200 OK**
```typescript
interface UpdateProfileResponse {
  success: true;
  data: {
    // 更新后的完整档案
  };
}
```

---

## 4. 岗位模块接口

### 4.1 导入岗位（截图）

```http
POST /api/v1/jobs/import/screenshot
```

**请求类型：** `multipart/form-data`

**请求参数：**
```
file: File (image/*)
```

**响应：201 Created**
```typescript
interface ImportJobResponse {
  success: true;
  data: {
    id: string;
    status: 'pending' | 'parsing' | 'completed' | 'failed';
    sourceType: 'screenshot';
    createdAt: string;
  };
}
```

### 4.2 导入岗位（链接）

```http
POST /api/v1/jobs/import/link
```

**请求体：**
```typescript
interface ImportJobFromLinkRequest {
  url: string;  // 岗位链接 URL
}
```

**响应：201 Created**
```typescript
interface ImportJobFromLinkResponse {
  success: true;
  data: {
    id: string;
    status: 'pending' | 'parsing' | 'completed' | 'failed';
    sourceType: 'link';
    sourceUrl: string;
    createdAt: string;
  };
}
```

### 4.3 导入岗位（文本）

```http
POST /api/v1/jobs/import/text
```

**请求体：**
```typescript
interface ImportJobFromTextRequest {
  content: string;  // 岗位描述文本
  source?: string;  // 来源标注（可选）
}
```

**响应：201 Created**
```typescript
interface ImportJobFromTextResponse {
  success: true;
  data: {
    id: string;
    status: 'pending' | 'parsing' | 'completed' | 'failed';
    sourceType: 'text';
    createdAt: string;
  };
}
```

### 4.4 查询岗位解析状态

```http
GET /api/v1/jobs/:id/status
```

**响应：200 OK**
```typescript
interface JobStatusResponse {
  success: true;
  data: {
    id: string;
    status: 'pending' | 'parsing' | 'completed' | 'failed';
    progress: number;  // 0-100
    error?: string;    // 失败时的错误信息
    parsedData?: {
      // 解析完成时返回的岗位数据
      title: string;
      company: string;
      location: string;
      description: string;
      requirements: string[];
      responsibilities: string[];
      benefits: string[];
      salaryRange: string;
    };
  };
}
```

### 4.3 获取岗位列表

```http
GET /api/v1/jobs
```

**查询参数：**
```typescript
interface GetJobsQuery {
  limit?: number;
  cursor?: string;
  status?: 'all' | 'archived';
  search?: string;  // 搜索关键词
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'title:asc';
}
```

**响应：200 OK**
```typescript
interface GetJobsResponse {
  success: true;
  data: {
    id: string;
    title: string | null;
    company: string | null;
    location: string | null;
    status: 'active' | 'archived';
    sourceType: 'screenshot' | 'link' | 'text';
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
```

### 4.4 获取岗位详情

```http
GET /api/v1/jobs/:id
```

**响应：200 OK**
```typescript
interface JobDetailResponse {
  success: true;
  data: {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    salaryRange: string;
    requiredSkills: string[];
    niceToHaveSkills: string[];
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
    employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
    sourceType: 'screenshot' | 'link' | 'text';
    sourceUrl: string | null;
    status: 'active' | 'archived';
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 4.5 更新岗位信息

```http
PATCH /api/v1/jobs/:id
```

**请求体：**
```typescript
interface UpdateJobRequest {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  salaryRange?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  notes?: string;
}
```

**响应：200 OK**
```typescript
interface UpdateJobResponse {
  success: true;
  data: {
    // 更新后的完整岗位数据
  };
}
```

### 4.6 归档/恢复岗位

```http
PATCH /api/v1/jobs/:id/archive
PATCH /api/v1/jobs/:id/restore
```

**响应：200 OK**
```typescript
interface ArchiveJobResponse {
  success: true;
  data: {
    id: string;
    status: 'archived' | 'active';
  };
}
```

### 4.7 删除岗位

```http
DELETE /api/v1/jobs/:id
```

**响应：204 No Content**

---

## 5. 技能发掘接口

### 5.1 创建技能发掘会话

```http
POST /api/v1/skill-discovery/sessions
```

**请求体：**
```typescript
interface CreateSkillDiscoveryRequest {
  jobId?: string;  // 关联岗位（可选）
}
```

**响应：201 Created**
```typescript
interface CreateSkillDiscoveryResponse {
  success: true;
  data: {
    id: string;
    status: 'active' | 'completed';
    jobId: string | null;
    discoveredSkills: string[];
    messagesCount: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 5.2 发送消息（流式）

```http
POST /api/v1/skill-discovery/sessions/:sessionId/chat
```

**请求类型：** `text/event-stream`

**请求体：**
```typescript
interface ChatMessageRequest {
  content: string;
}
```

**响应（Server-Sent Events）：**
```
data: {"type":"message","data":{"id":"msg_123","role":"user","content":"..."}}

data: {"type":"ai_start","data":{}}

data: {"type":"ai_chunk","data":{"content":"让我"}}

data: {"type":"ai_chunk","data":{"content":"来了解"}}

data: {"type":"ai_chunk","data":{"content":"一下你的"}}

data: {"type":"ai_end","data":{"messageId":"msg_456","fullContent":"让我来了解一下你的","suggestions":["技能1","技能2"]}}

data: {"type":"done","data":{}}
```

**事件类型：**
```typescript
type StreamEvent =
  | { type: 'message'; data: ChatMessage }
  | { type: 'ai_start'; data: {} }
  | { type: 'ai_chunk'; data: { content: string } }
  | { type: 'ai_end'; data: { messageId: string; fullContent: string; suggestions?: string[] } }
  | { type: 'error'; data: { error: string } }
  | { type: 'done'; data: {} };
```

### 5.3 获取会话历史

```http
GET /api/v1/skill-discovery/sessions/:sessionId/messages
```

**查询参数：**
```typescript
interface GetMessagesQuery {
  limit?: number;
  cursor?: string;
}
```

**响应：200 OK**
```typescript
interface GetMessagesResponse {
  success: true;
  data: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
```

### 5.4 保存发现的技能

```http
POST /api/v1/skill-discovery/sessions/:sessionId/save-skills
```

**请求体：**
```typescript
interface SaveSkillsRequest {
  skills: string[];  // 要保存的技能列表
}
```

**响应：200 OK**
```typescript
interface SaveSkillsResponse {
  success: true;
  data: {
    savedCount: number;
    skills: string[];
  };
}
```

### 5.5 完成会话

```http
POST /api/v1/skill-discovery/sessions/:sessionId/complete
```

**响应：200 OK**
```typescript
interface CompleteSessionResponse {
  success: true;
  data: {
    id: string;
    status: 'completed';
    summary: {
      totalMessages: number;
      discoveredSkills: string[];
      recommendedSkills: string[];
    };
  };
}
```

### 5.6 获取所有会话列表

```http
GET /api/v1/skill-discovery/sessions
```

**响应：200 OK**
```typescript
interface GetSessionsResponse {
  success: true;
  data: {
    id: string;
    status: 'active' | 'completed';
    jobId: string | null;
    job: {
      id: string;
      title: string;
      company: string;
    } | null;
    discoveredSkills: string[];
    messagesCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
}
```

---

## 6. 经历管理接口

### 6.1 教育经历

#### 创建教育经历
```http
POST /api/v1/profile/educations
```

**请求体：**
```typescript
interface CreateEducationRequest {
  school: string;
  degree: string;
  major: string;
  startDate: string;  // ISO 8601
  endDate?: string;   // ISO 8601，null 表示在读
  gpa?: number;
  description?: string;
}
```

**响应：201 Created**
```typescript
interface CreateEducationResponse {
  success: true;
  data: {
    id: string;
    school: string;
    degree: string;
    major: string;
    startDate: string;
    endDate: string | null;
    gpa: number | null;
    description: string | null;
  };
}
```

#### 更新教育经历
```http
PATCH /api/v1/profile/educations/:id
```

#### 删除教育经历
```http
DELETE /api/v1/profile/educations/:id
```

### 6.2 工作经历

#### 创建工作经历
```http
POST /api/v1/profile/work-experiences
```

**请求体：**
```typescript
interface CreateWorkExperienceRequest {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;  // 是否在职
  description?: string;
  achievements?: string[];
}
```

**响应：201 Created**
```typescript
interface CreateWorkExperienceResponse {
  success: true;
  data: {
    id: string;
    company: string;
    position: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string | null;
    achievements: string[];
    createdAt: string;
    updatedAt: string;
  };
}
```

#### 获取工作经历列表
```http
GET /api/v1/profile/work-experiences
```

#### 更新工作经历
```http
PATCH /api/v1/profile/work-experiences/:id
```

#### 删除工作经历
```http
DELETE /api/v1/profile/work-experiences/:id
```

### 6.3 项目经验

#### 创建项目经验
```http
POST /api/v1/profile/projects
```

**请求体：**
```typescript
interface CreateProjectRequest {
  name: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
  technologies: string[];
  achievements: string[];
  link?: string;  // 项目链接
}
```

**响应：201 Created**
```typescript
interface CreateProjectResponse {
  success: true;
  data: {
    id: string;
    name: string;
    role: string;
    startDate: string;
    endDate: string | null;
    description: string;
    technologies: string[];
    achievements: string[];
    link: string | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

#### 获取项目列表
```http
GET /api/v1/profile/projects
```

#### 更新项目
```http
PATCH /api/v1/profile/projects/:id
```

#### 删除项目
```http
DELETE /api/v1/profile/projects/:id
```

### 6.4 AI 优化建议

```http
POST /api/v1/profile/optimize
```

**请求体：**
```typescript
interface OptimizeProfileRequest {
  type: 'work-experience' | 'project' | 'education';
  id: string;  // 经历 ID
  jobId?: string;  // 可选：关联岗位，生成针对性优化
}
```

**响应（流式）：**
```
data: {"type":"start","data":{}}

data: {"type":"chunk","data":{"content":"根据目标岗位"}}

data: {"type":"chunk","data":{"content":"的要求，建议突出"}}

data: {"type":"end","data":{"suggestions":[{"type":"description","original":"...","optimized":"...","reason":"..."}]}}

data: {"type":"done","data":{}}
```

**响应类型：**
```typescript
interface OptimizationSuggestion {
  type: 'description' | 'achievement' | 'keyword';
  original: string;
  optimized: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}
```

---

## 7. 简历模块接口

### 7.1 获取简历模板列表

```http
GET /api/v1/resumes/templates
```

**查询参数：**
```typescript
interface GetTemplatesQuery {
  category?: 'professional' | 'creative' | 'simple' | 'executive';
  industry?: string;
}
```

**响应：200 OK**
```typescript
interface GetTemplatesResponse {
  success: true;
  data: {
    id: string;
    name: string;
    category: string;
    thumbnail: string;
    preview: string;
    description: string;
    features: string[];
    isFree: boolean;
  }[];
}
```

### 7.2 创建简历

```http
POST /api/v1/resumes
```

**请求体：**
```typescript
interface CreateResumeRequest {
  name: string;
  jobId?: string;  // 关联岗位（可选）
  templateId?: string;  // 模板 ID，默认使用系统模板
  language?: 'zh' | 'en';
}
```

**响应：201 Created**
```typescript
interface CreateResumeResponse {
  success: true;
  data: {
    id: string;
    name: string;
    jobId: string | null;
    templateId: string;
    language: string;
    status: 'draft' | 'generating' | 'completed' | 'failed';
    content: {
      header: ResumeHeader;
      summary: string;
      experience: ResumeExperience[];
      education: ResumeEducation[];
      skills: ResumeSkill[];
      projects: ResumeProject[];
    } | null;
    matchScore: number | null;  // 与目标岗位的匹配度
    createdAt: string;
    updatedAt: string;
  };
}
```

### 7.3 生成简历内容（流式）

```http
POST /api/v1/resumes/:id/generate
```

**请求类型：** `text/event-stream`

**请求体：**
```typescript
interface GenerateResumeRequest {
  targetJob: {
    title: string;
    company?: string;
    description: string;
    requirements: string[];
  };
  options: {
    tone?: 'professional' | 'casual' | 'confident';
    length?: 'concise' | 'standard' | 'detailed';
    highlights?: string[];  // 重点突出的经历/技能
  };
}
```

**响应（Server-Sent Events）：**
```
data: {"type":"start","data":{"section":"summary"}}

data: {"type":"chunk","data":{"content":"具有5年"}}

data: {"type":"chunk","data":{"content":"前端开发经验"}}

data: {"type":"section_end","data":{"section":"summary"}}

data: {"type":"start","data":{"section":"experience"}}

...

data: {"type":"match_score","data":{"score":85,"analysis":"..."}}

data: {"type":"done","data":{}}
```

### 7.4 获取简历列表

```http
GET /api/v1/resumes
```

**查询参数：**
```typescript
interface GetResumesQuery {
  limit?: number;
  cursor?: string;
  status?: 'draft' | 'completed' | 'all';
  jobId?: string;
}
```

**响应：200 OK**
```typescript
interface GetResumesResponse {
  success: true;
  data: {
    id: string;
    name: string;
    templateId: string;
    status: string;
    matchScore: number | null;
    job: {
      id: string;
      title: string;
      company: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
```

### 7.5 获取简历详情

```http
GET /api/v1/resumes/:id
```

**响应：200 OK**
```typescript
interface ResumeDetailResponse {
  success: true;
  data: {
    id: string;
    name: string;
    jobId: string | null;
    templateId: string;
    language: string;
    status: string;
    content: ResumeContent;
    matchScore: number | null;
    matchAnalysis: {
      score: number;
      matchedSkills: string[];
      missingSkills: string[];
      strengths: string[];
      improvements: string[];
    } | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 7.6 更新简历

```http
PATCH /api/v1/resumes/:id
```

**请求体：**
```typescript
interface UpdateResumeRequest {
  name?: string;
  templateId?: string;
  language?: string;
  content?: Partial<ResumeContent>;
}
```

### 7.7 计算匹配度

```http
POST /api/v1/resumes/:id/match
```

**请求体：**
```typescript
interface MatchResumeRequest {
  jobId: string;
}
```

**响应：200 OK**
```typescript
interface MatchResumeResponse {
  success: true;
  data: {
    score: number;  // 0-100
    analysis: {
      matchedSkills: string[];
      missingSkills: string[];
      experienceMatch: {
        score: number;
        details: string;
      };
      educationMatch: {
        score: number;
        details: string;
      };
      strengths: string[];
      improvements: string[];
      recommendations: string[];
    };
  };
}
```

### 7.8 导出简历（PDF）

```http
POST /api/v1/resumes/:id/export
```

**请求体：**
```typescript
interface ExportResumeRequest {
  format: 'pdf' | 'docx';
  options?: {
    includePhoto?: boolean;
    pageNumbers?: boolean;
      watermark?: boolean;
  };
}
```

**响应：200 OK**
```typescript
interface ExportResumeResponse {
  success: true;
  data: {
    downloadUrl: string;
    expiresAt: string;  // 下载链接过期时间
    fileSize: number;
    pageCount: number;
  };
}
```

### 7.9 删除简历

```http
DELETE /api/v1/resumes/:id
```

**响应：204 No Content**

---

## 8. 面试模块接口

### 8.1 创建面试准备计划

```http
POST /api/v1/interviews/preparation-plans
```

**请求体：**
```typescript
interface CreatePreparationPlanRequest {
  jobId: string;
  resumeId: string;
  duration?: number;  // 准备天数，默认 7
  focusAreas?: string[];  // 重点关注领域
}
```

**响应：201 Created**
```typescript
interface CreatePreparationPlanResponse {
  success: true;
  data: {
    id: string;
    jobId: string;
    resumeId: string;
    status: 'active' | 'completed';
    startDate: string;
    endDate: string;
    dailyPlan: {
      day: number;
      date: string;
      topics: string[];
      tasks: {
        type: 'study' | 'practice' | 'mock-interview';
        title: string;
        description: string;
        resources?: string[];
        completed: boolean;
      }[];
    }[];
    overallProgress: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 8.2 获取准备计划

```http
GET /api/v1/interviews/preparation-plans/:id
```

### 8.3 更新任务状态

```http
PATCH /api/v1/interviews/preparation-plans/:planId/tasks/:taskId
```

**请求体：**
```typescript
interface UpdateTaskRequest {
  completed: boolean;
}
```

### 8.4 搜索面试题

```http
GET /api/v1/interviews/questions
```

**查询参数：**
```typescript
interface SearchQuestionsQuery {
  category?: string;  // 技术类别：frontend、backend、algorithm 等
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'technical' | 'behavioral' | 'situational';
  keyword?: string;
  limit?: number;
  cursor?: string;
}
```

**响应：200 OK**
```typescript
interface SearchQuestionsResponse {
  success: true;
  data: {
    id: string;
    category: string;
    difficulty: string;
    type: string;
    question: string;
    answer?: string;
    tags: string[];
    frequency: number;  // 出现频率
  }[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
```

### 8.5 获取题库分类

```http
GET /api/v1/interviews/questions/categories
```

**响应：200 OK**
```typescript
interface CategoriesResponse {
  success: true;
  data: {
    id: string;
    name: string;
    description: string;
    questionCount: number;
    subcategories?: {
      id: string;
      name: string;
      questionCount: number;
    }[];
  }[];
}
```

---

## 9. 订阅模块接口

### 9.1 获取订阅套餐列表

```http
GET /api/v1/subscriptions/plans
```

**响应：200 OK**
```typescript
interface GetPlansResponse {
  success: true;
  data: {
    id: string;
    name: string;
    description: string;
    price: {
      monthly: number;
      yearly: number;
      currency: string;
    };
    features: {
      name: string;
      value: string | boolean;
    }[];
    limits: {
      resumesPerMonth: number;
      aiChatsPerMonth: number;
      mockInterviewsPerMonth: number;
      exportFormats: string[];
    };
    popular: boolean;
  }[];
}
```

### 9.2 获取当前订阅状态

```http
GET /api/v1/subscriptions/current
```

**响应：200 OK**
```typescript
interface CurrentSubscriptionResponse {
  success: true;
  data: {
    plan: {
      id: string;
      name: string;
    };
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    usage: {
      resumesThisMonth: number;
      aiChatsThisMonth: number;
      mockInterviewsThisMonth: number;
    };
    limits: {
      resumesPerMonth: number;
      aiChatsPerMonth: number;
      mockInterviewsPerMonth: number;
    };
  };
}
```

### 9.3 创建支付订单

```http
POST /api/v1/subscriptions/checkout
```

**请求体：**
```typescript
interface CheckoutRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: 'alipay' | 'wechat' | 'stripe';
  couponCode?: string;
}
```

**响应：201 Created**
```typescript
interface CheckoutResponse {
  success: true;
  data: {
    orderId: string;
    amount: number;
    currency: string;
    paymentUrl: string;  // 支付链接
    expiresAt: string;
    qrCode?: string;  // 二维码（支付宝/微信）
  };
}
```

### 9.4 验证支付

```http
POST /api/v1/subscriptions/verify-payment
```

**请求体：**
```typescript
interface VerifyPaymentRequest {
  orderId: string;
}
```

**响应：200 OK**
```typescript
interface VerifyPaymentResponse {
  success: true;
  data: {
    status: 'success' | 'pending' | 'failed';
    subscription?: {
      id: string;
      planId: string;
      status: string;
      startDate: string;
      endDate: string;
    };
  };
}
```

### 9.5 取消订阅

```http
POST /api/v1/subscriptions/cancel
```

**请求体：**
```typescript
interface CancelSubscriptionRequest {
  reason?: string;
  feedback?: string;
}
```

**响应：200 OK**
```typescript
interface CancelSubscriptionResponse {
  success: true;
  data: {
    message: '订阅已取消';
    effectiveDate: string;  // 生效日期（当前计费周期结束）
  };
}
```

### 9.6 恢复订阅

```http
POST /api/v1/subscriptions/reactivate
```

**响应：200 OK**
```typescript
interface ReactivateSubscriptionResponse {
  success: true;
  data: {
    message: '订阅已恢复';
    status: string;
  };
}
```

### 9.7 更新支付方式

```http
PATCH /api/v1/subscriptions/payment-method
```

**请求体：**
```typescript
interface UpdatePaymentMethodRequest {
  paymentMethod: 'alipay' | 'wechat' | 'stripe';
}
```

### 9.8 获取发票列表

```http
GET /api/v1/subscriptions/invoices
```

**响应：200 OK**
```typescript
interface GetInvoicesResponse {
  success: true;
  data: {
    id: string;
    number: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    dueDate: string;
    paidAt: string | null;
    downloadUrl: string;
  }[];
}
```

---

## 10. WebSocket 协议

### 10.1 连接端点

```
wss://api.example.com/ws/v1/mock-interview?token=<access_token>
```

### 10.2 消息格式

#### 客户端 -> 服务器

```typescript
interface ClientMessage {
  type: 'start' | 'audio' | 'text' | 'answer' | 'end';
  payload: unknown;
}
```

#### 服务器 -> 客户端

```typescript
interface ServerMessage {
  type: 'started' | 'question' | 'listening' | 'analyzing' | 'feedback' | 'ended' | 'error';
  payload: unknown;
}
```

### 10.3 消息类型详解

#### 开始面试

**客户端发送：**
```typescript
{
  type: 'start',
  payload: {
    jobId: string;
    resumeId: string;
    mode: 'audio' | 'text';
    duration?: number;  // 预计时长（分钟）
    focusAreas?: string[];
  }
}
```

**服务器响应：**
```typescript
{
  type: 'started',
  payload: {
    interviewId: string;
    estimatedDuration: number;
    questionCount: number;
  }
}
```

#### 提问

**服务器发送：**
```typescript
{
  type: 'question',
  payload: {
    questionId: string;
    question: string;
    category: string;
    type: 'technical' | 'behavioral';
    hints?: string[];
    timeLimit?: number;  // 建议回答时长（秒）
  }
}
```

#### 音频输入

**客户端发送（流式）：**
```typescript
{
  type: 'audio',
  payload: {
    data: string;  // Base64 编码的音频数据
    format: 'wav' | 'mp3' | 'ogg';
    isFinal: boolean;  // 是否为最后一段
  }
}
```

**服务器响应（开始监听）：**
```typescript
{
  type: 'listening',
  payload: {
    transcription: string;  // 实时转录文本
  }
}
```

#### 文本输入

**客户端发送：**
```typescript
{
  type: 'text',
  payload: {
    content: string;
  }
}
```

#### 回答完成

**客户端发送：**
```typescript
{
  type: 'answer',
  payload: {
    finished: true;
  }
}
```

**服务器响应（分析中）：**
```typescript
{
  type: 'analyzing',
  payload: {
    message: '正在分析您的回答...'
  }
}
```

#### 反馈

**服务器发送：**
```typescript
{
  type: 'feedback',
  payload: {
    questionId: string;
    overallScore: number;  // 0-100
    criteria: {
      name: string;
      score: number;
      feedback: string;
    }[];
    strengths: string[];
    improvements: string[];
    suggestedAnswer?: string;
    nextQuestion?: boolean;
  }
}
```

#### 结束面试

**客户端发送：**
```typescript
{
  type: 'end',
  payload: {
    reason?: 'completed' | 'user_cancel';
  }
}
```

**服务器响应：**
```typescript
{
  type: 'ended',
  payload: {
    interviewId: string;
    duration: number;  // 实际时长（秒）
    questionCount: number;
    reportUrl: string;  // 完整报告链接
  }
}
```

#### 错误处理

**服务器发送：**
```typescript
{
  type: 'error',
  payload: {
    code: string;
    message: string;
    recoverable: boolean;
  }
}
```

### 10.4 心跳机制

**客户端每 30 秒发送：**
```typescript
{
  type: 'ping'
}
```

**服务器响应：**
```typescript
{
  type: 'pong',
  payload: {
    timestamp: string;
  }
}
```

### 10.5 重连策略

1. **断开检测**：60 秒未收到 pong 消息视为断开
2. **重连间隔**：1s, 2s, 5s, 10s, 30s（指数退避）
3. **会话恢复**：重连后发送 `interviewId` 恢复会话

**重连请求：**
```typescript
{
  type: 'resume',
  payload: {
    interviewId: string;
    lastMessageId: string;
  }
}
```

---

## 11. 数据模型

### 11.1 用户模型

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface UserProfile {
  id: string;
  userId: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  targetRoles: string[];
  targetLocations: string[];
  expectedSalary: {
    min?: number;
    max?: number;
    currency: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 11.2 岗位模型

```typescript
interface Job {
  id: string;
  userId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  salaryRange: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  sourceType: 'screenshot' | 'link' | 'text';
  sourceUrl: string | null;
  parseStatus: 'pending' | 'parsing' | 'completed' | 'failed';
  parseError: string | null;
  status: 'active' | 'archived';
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

### 11.3 简历模型

```typescript
interface Resume {
  id: string;
  userId: string;
  jobId: string | null;
  name: string;
  templateId: string;
  language: 'zh' | 'en';
  status: 'draft' | 'generating' | 'completed' | 'failed';
  content: ResumeContent | null;
  matchScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ResumeContent {
  header: {
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
    avatar: string | null;
    links: Array<{
      type: 'github' | 'linkedin' | 'portfolio' | 'other';
      url: string;
    }>;
  };
  summary: string;
  experience: Array<{
    company: string;
    position: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    major: string;
    startDate: string;
    endDate: string | null;
    gpa: string | null;
    description: string | null;
  }>;
  skills: Array<{
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
  }>;
  projects: Array<{
    name: string;
    role: string;
    startDate: string;
    endDate: string | null;
    description: string;
    technologies: string[];
    achievements: string[];
    link: string | null;
  }>;
}
```

### 11.4 面试模型

```typescript
interface MockInterview {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  mode: 'audio' | 'text';
  status: 'in_progress' | 'completed' | 'aborted';
  duration: number;
  questionCount: number;
  overallScore: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

interface InterviewQuestion {
  id: string;
  interviewId: string;
  question: string;
  category: string;
  type: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  answer: string;
  audioUrl: string | null;
  score: number;
  feedback: {
    overallScore: number;
    criteria: Array<{
      name: string;
      score: number;
      feedback: string;
    }>;
    strengths: string[];
    improvements: string[];
  };
  startedAt: Date;
  completedAt: Date | null;
  order: number;
}

interface InterviewReport {
  id: string;
  interviewId: string;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  criteriaScores: Array<{
    category: string;
    score: number;
    details: string;
  }>;
  createdAt: Date;
}
```

### 11.5 订阅模型

```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: Array<{
    name: string;
    value: string | boolean;
  }>;
  limits: {
    resumesPerMonth: number;
    aiChatsPerMonth: number;
    mockInterviewsPerMonth: number;
    exportFormats: string[];
  };
  popular: boolean;
}

interface Usage {
  userId: string;
  subscriptionId: string;
  period: string;  // YYYY-MM
  resumes: number;
  aiChats: number;
  mockInterviews: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 附录

### A. 安全最佳实践

1. **Token 存储**
   - Access Token 存储在内存中
   - Refresh Token 存储在 httpOnly Cookie 或安全存储

2. **请求签名**
   ```typescript
   // 敏感操作需要请求签名
   interface SignedRequest {
     data: unknown;
     signature: string;
     timestamp: number;
     nonce: string;
   }
   ```

3. **速率限制**
   - 认证接口：5 次/分钟
   - API 接口：100 次/分钟
   - AI 接口：20 次/分钟

4. **IP 白名单**
   - 管理 API 支持 IP 白名单

### B. 错误处理示例

```typescript
// 验证错误
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "email": ["邮箱格式不正确"],
      "password": ["密码长度不能少于8位"]
    }
  }
}

// 配额超限
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "本月简历生成次数已达上限",
    "details": {
      "limit": 10,
      "used": 10,
      "resetAt": "2025-03-01T00:00:00Z"
    }
  }
}
```

### C. Webhook 事件

```typescript
type WebhookEvent =
  | { event: 'subscription.created'; data: Subscription }
  | { event: 'subscription.canceled'; data: Subscription }
  | { event: 'subscription.renewed'; data: Subscription }
  | { event: 'payment.succeeded'; data: Payment }
  | { event: 'payment.failed'; data: Payment }
  | { event: 'invoice.created'; data: Invoice };
```

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2025-02-15 | 初始版本 |

---

**文档维护**：技术团队
**联系方式**：tech@example.com
