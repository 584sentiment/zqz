/**
 * 性能监控工具
 * 用于监控 AI 代理和画布操作的性能
 */

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 操作名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 额外数据 */
  metadata?: Record<string, any>;
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations: Map<string, number> = new Map();
  private maxMetrics: number;

  constructor(maxMetrics: number = 1000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * 开始监控操作
   */
  startOperation(name: string): string {
    const operationId = `${name}:${Date.now()}:${Math.random()}`;
    this.activeOperations.set(operationId, performance.now());
    return operationId;
  }

  /**
   * 结束监控操作
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>
  ): PerformanceMetrics | null {
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) return null;

    this.activeOperations.delete(operationId);
    const endTime = performance.now();

    const metric: PerformanceMetrics = {
      name: operationId.split(':')[0],
      startTime,
      endTime,
      duration: endTime - startTime,
      success,
      error,
      metadata,
    };

    this.metrics.push(metric);

    // 限制最大数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    return metric;
  }

  /**
   * 获取平均耗时
   */
  getAverageDuration(name?: string): number {
    const filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics;

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  /**
   * 获取成功率
   */
  getSuccessRate(name?: string): number {
    const filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics;

    if (filtered.length === 0) return 0;

    const successCount = filtered.filter((m) => m.success).length;
    return (successCount / filtered.length) * 100;
  }

  /**
   * 获取慢操作
   */
  getSlowOperations(threshold: number = 3000): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.duration > threshold);
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取指标统计
   */
  getStats(name?: string): {
    count: number;
    averageDuration: number;
    successRate: number;
    minDuration: number;
    maxDuration: number;
  } {
    const filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics;

    if (filtered.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        successRate: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const durations = filtered.map((m) => m.duration);
    const successCount = filtered.filter((m) => m.success).length;

    return {
      count: filtered.length,
      averageDuration: this.getAverageDuration(name),
      successRate: (successCount / filtered.length) * 100,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  /**
   * 导出指标
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

/**
 * 装饰器：自动监控函数性能
 */
export function monitorPerformance(monitor: PerformanceMonitor, name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = name || propertyKey;

    descriptor.value = async function (...args: any[]) {
      const operationId = monitor.startOperation(operationName);

      try {
        const result = await originalMethod.apply(this, args);
        monitor.endOperation(operationId, true);
        return result;
      } catch (error: any) {
        monitor.endOperation(operationId, false, error.message);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 内存监控
 */
export class MemoryMonitor {
  private samples: Array<{ timestamp: number; memory: NodeJS.MemoryUsage }> = [];
  private maxSamples: number;

  constructor(maxSamples: number = 100) {
    this.maxSamples = maxSamples;
  }

  /**
   * 采样当前内存使用
   */
  sample(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.samples.push({
        timestamp: Date.now(),
        memory: process.memoryUsage(),
      });

      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }
    }
  }

  /**
   * 获取内存趋势
   */
  getTrend(): {
    heapUsed: number[];
    heapTotal: number[];
    rss: number[];
  } {
    return {
      heapUsed: this.samples.map((s) => s.memory.heapUsed),
      heapTotal: this.samples.map((s) => s.memory.heapTotal),
      rss: this.samples.map((s) => s.memory.rss),
    };
  }

  /**
   * 获取平均内存使用
   */
  getAverage(): {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  } {
    if (this.samples.length === 0) {
      return { heapUsed: 0, heapTotal: 0, rss: 0 };
    }

    const sum = this.samples.reduce(
      (acc, s) => ({
        heapUsed: acc.heapUsed + s.memory.heapUsed,
        heapTotal: acc.heapTotal + s.memory.heapTotal,
        rss: acc.rss + s.memory.rss,
      }),
      { heapUsed: 0, heapTotal: 0, rss: 0 }
    );

    return {
      heapUsed: sum.heapUsed / this.samples.length,
      heapTotal: sum.heapTotal / this.samples.length,
      rss: sum.rss / this.samples.length,
    };
  }

  /**
   * 清空样本
   */
  clear(): void {
    this.samples = [];
  }
}

// 全局单例
let globalMonitor: PerformanceMonitor | null = null;
let globalMemoryMonitor: MemoryMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

export function getMemoryMonitor(): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor();
  }
  return globalMemoryMonitor;
}
