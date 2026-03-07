/**
 * AI 代理缓存管理器
 * 用于缓存 AI 响应和操作，提升性能
 */

import type { AgentPlan, AgentPerception } from './resume-canvas-agent';

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 缓存配置
 */
interface CacheConfig {
  /** 最大缓存数量 */
  maxSize: number;
  /** 默认过期时间（毫秒） */
  defaultTTL: number;
  /** 是否启用缓存 */
  enabled: boolean;
}

/**
 * AI 代理缓存管理器
 */
export class AIAgentCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 100,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 分钟
      enabled: config.enabled ?? true,
    };
  }

  /**
   * 生成缓存键
   */
  private generateKey(message: string, shapes: any[]): string {
    const shapesHash = this.hashShapes(shapes);
    return `${message}:${shapesHash}`;
  }

  /**
   * 简单的形状哈希
   */
  private hashShapes(shapes: any[]): string {
    if (!shapes || shapes.length === 0) return 'empty';

    // 简单哈希：使用形状数量和第一个形状的 ID
    const count = shapes.length;
    const firstId = shapes[0]?.id || 'none';
    return `${count}:${firstId}`;
  }

  /**
   * 获取缓存
   */
  get<T>(message: string, shapes: any[]): T | null {
    if (!this.config.enabled) return null;

    const key = this.generateKey(message, shapes);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存
   */
  set<T>(message: string, shapes: any[], data: T, ttl?: number): void {
    if (!this.config.enabled) return;

    const key = this.generateKey(message, shapes);

    // 检查缓存大小，移除最旧的条目
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    });
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * 移除最旧的条目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    enabled: boolean;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      enabled: this.config.enabled,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 操作去重器
 * 避免在短时间内重复执行相同操作
 */
export class ActionDeduplicator {
  private recentActions: Map<string, number> = new Map();
  private deduplicationWindow: number;

  constructor(deduplicationWindow: number = 1000) {
    this.deduplicationWindow = deduplicationWindow;
  }

  /**
   * 检查操作是否重复
   */
  isDuplicate(action: any): boolean {
    const key = this.getActionKey(action);
    const now = Date.now();
    const lastTime = this.recentActions.get(key);

    if (lastTime && now - lastTime < this.deduplicationWindow) {
      return true;
    }

    this.recentActions.set(key, now);
    return false;
  }

  /**
   * 生成操作键
   */
  private getActionKey(action: any): string {
    return JSON.stringify({
      type: action.type,
      shapeId: action.shapeId,
      x: action.x,
      y: action.y,
      width: action.width,
      height: action.height,
    });
  }

  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.recentActions.entries()) {
      if (now - timestamp > this.deduplicationWindow) {
        this.recentActions.delete(key);
      }
    }
  }
}

/**
 * 操作批处理器
 * 将多个操作合并为批量操作，提升性能
 */
export class ActionBatcher {
  private pendingActions: any[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private batchDelay: number;
  private maxBatchSize: number;
  private onExecute: (actions: any[]) => void;

  constructor(
    onExecute: (actions: any[]) => void,
    options: {
      batchDelay?: number;
      maxBatchSize?: number;
    } = {}
  ) {
    this.onExecute = onExecute;
    this.batchDelay = options.batchDelay || 100;
    this.maxBatchSize = options.maxBatchSize || 50;
  }

  /**
   * 添加操作
   */
  add(action: any): void {
    this.pendingActions.push(action);

    // 达到最大批处理大小，立即执行
    if (this.pendingActions.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // 启动延迟计时器
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flush();
      }, this.batchDelay);
    }
  }

  /**
   * 立即执行所有待处理操作
   */
  flush(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pendingActions.length > 0) {
      this.onExecute(this.pendingActions);
      this.pendingActions = [];
    }
  }

  /**
   * 获取待处理操作数量
   */
  getPendingCount(): number {
    return this.pendingActions.length;
  }

  /**
   * 清空待处理操作
   */
  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingActions = [];
  }
}

// 单例实例
let globalCache: AIAgentCache | null = null;
let globalDeduplicator: ActionDeduplicator | null = null;

/**
 * 获取全局缓存实例
 */
export function getAIAgentCache(): AIAgentCache {
  if (!globalCache) {
    globalCache = new AIAgentCache();
  }
  return globalCache;
}

/**
 * 获取全局去重器实例
 */
export function getActionDeduplicator(): ActionDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new ActionDeduplicator();
  }
  return globalDeduplicator;
}
