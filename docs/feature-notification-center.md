# 消息中心功能规划

> 创建时间：2026-02-19
> 状态：规划完成，待实现

## 一、功能概述

消息中心用于管理用户的所有通知消息，包括系统通知、业务提醒、活动公告等，提供站内消息展示、已读/未读管理、消息分类筛选等功能。

## 二、消息类型定义

| 类型 | 标识 | 说明 | 示例 |
|------|------|------|------|
| **系统通知** | `system` | 账户安全、系统升级、维护公告 | "您的账户已在新设备登录" |
| **业务提醒** | `business` | 简历生成完成、面试提醒、匹配度更新 | "您的简历已生成完成" |
| **活动公告** | `activity` | 促销活动、新功能上线、会员福利 | "专业版限时 8 折优惠" |
| **订阅消息** | `subscription` | 订阅到期、续费成功、配额提醒 | "您的订阅将于 3 天后到期" |

## 三、数据库模型设计

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 消息分类
  type        String   // system | business | activity | subscription

  // 消息内容
  title       String
  content     String   @db.Text
  icon        String?  // 可选图标标识

  // 跳转链接
  actionType  String?  // link | modal | none
  actionUrl   String?  @map("action_url")
  actionData  Json?    @map("action_data")  // 额外参数

  // 状态
  isRead      Boolean  @default(false) @map("is_read")
  readAt      DateTime? @map("read_at")

  // 过期时间（可选，用于自动清理）
  expiresAt   DateTime? @map("expires_at")

  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId, isRead])
  @@index([userId, type])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

## 四、后端 API 设计

### 4.1 API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notifications` | 获取消息列表（支持分页和筛选） |
| GET | `/notifications/unread-count` | 获取未读消息数量 |
| PATCH | `/notifications/:id/read` | 标记消息为已读 |
| POST | `/notifications/batch-read` | 批量标记已读 |
| DELETE | `/notifications/:id` | 删除消息 |
| DELETE | `/notifications/read` | 清空所有已读消息 |
| GET | `/notifications/settings` | 获取消息设置 |
| PATCH | `/notifications/settings` | 更新消息设置 |

### 4.2 请求/响应示例

```typescript
// GET /notifications?page=1&limit=20&type=all&unreadOnly=false
interface GetNotificationsQuery {
  page?: number;       // 页码，默认 1
  limit?: number;      // 每页数量，默认 20
  type?: string;       // 消息类型：all | system | business | activity | subscription
  unreadOnly?: boolean; // 仅未读
}

interface NotificationListItem {
  id: string;
  type: string;
  title: string;
  content: string;
  icon: string | null;
  actionType: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface GetNotificationsResponse {
  data: NotificationListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

// POST /notifications/batch-read
interface BatchReadBody {
  ids?: string[];  // 指定消息 ID 列表
  all?: boolean;   // 标记全部已读
  type?: string;   // 按类型标记已读
}

// GET /notifications/settings
interface NotificationSettings {
  systemEnabled: boolean;
  businessEnabled: boolean;
  activityEnabled: boolean;
  subscriptionEnabled: boolean;
  emailNotify: boolean;
}
```

## 五、前端页面设计

### 5.1 页面结构

```
/dashboard/notifications
├── 页面头部
│   ├── 标题：消息中心
│   ├── 全部已读按钮
│   └── 设置入口
├── 筛选标签
│   ├── 全部
│   ├── 未读
│   ├── 系统通知
│   ├── 业务提醒
│   ├── 活动公告
│   └── 订阅消息
├── 消息列表
│   ├── 消息卡片（图标 + 标题 + 内容 + 时间）
│   ├── 未读标记（圆点）
│   └── 操作按钮（删除）
└── 空状态
    └── 暂无消息提示
```

### 5.2 导航入口

在顶部导航栏添加消息图标：
- 显示消息铃铛图标
- 未读消息数量红点提示
- 点击跳转到消息中心

### 5.3 消息卡片设计

```
┌─────────────────────────────────────────────────────┐
│ 🔵  未读圆点  │  📄 图标  │  消息标题              × │
│              │           │  消息内容摘要...         │
│              │           │  2 小时前                │
└─────────────────────────────────────────────────────┘
```

## 六、消息触发场景

| 场景 | 消息类型 | 触发时机 | 标题示例 |
|------|----------|----------|----------|
| 简历生成完成 | business | AI 简历生成任务完成时 | "简历生成完成" |
| 简历导出完成 | business | PDF/Word 导出完成时 | "简历导出成功" |
| 面试准备计划创建 | business | 创建准备计划成功时 | "面试准备计划已生成" |
| 面试模拟完成 | business | 模拟面试结束并生成报告时 | "模拟面试完成" |
| 技能发掘完成 | business | AI 技能发掘会话结束时 | "技能发掘完成" |
| 岗位匹配度更新 | business | 岗位匹配分数更新时 | "发现新匹配岗位" |
| 新设备登录 | system | 检测到新设备登录时 | "新设备登录提醒" |
| 密码修改成功 | system | 用户修改密码后 | "密码修改成功" |
| 订阅即将到期 | subscription | 订阅到期前 7/3/1 天 | "订阅即将到期" |
| 配额即将用尽 | subscription | 配额使用达到 80%/100% | "配额使用提醒" |
| 续费成功 | subscription | 支付成功后 | "续费成功" |
| 促销活动 | activity | 后台推送活动信息 | "限时优惠活动" |
| 新功能上线 | activity | 系统版本更新时 | "新功能上线" |

## 七、实现优先级

### P0 - 核心功能（必须实现）

| 序号 | 功能 | 说明 |
|------|------|------|
| 1 | 数据库模型 | 创建 Notification 表，添加到 schema.prisma |
| 2 | 后端基础 API | 实现 CRUD 接口 |
| 3 | 前端 API 封装 | 创建 notifications.ts API 客户端 |
| 4 | 消息中心页面 | 消息列表展示、已读/未读管理 |
| 5 | 导航栏未读提示 | 铃铛图标 + 未读数量红点 |

### P1 - 重要功能

| 序号 | 功能 | 说明 |
|------|------|------|
| 6 | 消息设置 | 用户偏好设置页面 |
| 7 | 业务消息触发 | 接入简历生成、面试完成等场景 |
| 8 | NotificationService | 封装消息创建服务 |

### P2 - 增强功能

| 序号 | 功能 | 说明 |
|------|------|------|
| 9 | 消息推送 | WebSocket 实时消息推送 |
| 10 | 消息模板管理 | 后台管理消息模板 |
| 11 | 批量推送 | 后台向所有用户推送活动消息 |
| 12 | 定时清理 | 定期清理 90 天前的已读消息 |

## 八、技术要点

1. **分页加载**：消息列表支持无限滚动或分页
2. **缓存策略**：未读数量使用 Redis 缓存
3. **定时清理**：定期清理 90 天前的已读消息
4. **批量操作**：支持批量已读、批量删除
5. **图标映射**：根据消息类型显示不同图标

## 九、图标定义

```typescript
const notificationIcons: Record<string, string> = {
  system: 'Settings',       // 系统通知 - 齿轮图标
  business: 'Briefcase',    // 业务提醒 - 公文包图标
  activity: 'Gift',         // 活动公告 - 礼物图标
  subscription: 'Crown',    // 订阅消息 - 皇冠图标
};
```

## 十、后续扩展

- 消息推送（WebSocket/SSE）
- 消息模板管理后台
- 用户分组推送
- 消息 A/B 测试
- 消息转化率统计
