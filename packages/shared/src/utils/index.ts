// 共享工具函数

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date);
  if (format === 'long') {
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('zh-CN');
}

/**
 * 计算工作年限
 */
export function calculateWorkYears(startDate: Date, endDate?: Date): number {
  const end = endDate ? new Date(endDate) : new Date();
  const start = new Date(startDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
  return Math.round(diffYears * 10) / 10;
}

/**
 * 格式化薪资范围
 */
export function formatSalaryRange(salary?: { min?: number; max?: number; currency: string }): string {
  if (!salary) return '面议';
  const { min, max, currency } = salary;
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency;

  if (min && max) {
    return `${symbol}${min / 1000}K-${max / 1000}K`;
  } else if (min) {
    return `${symbol}${min / 1000}K+`;
  } else if (max) {
    return `${symbol}${max / 1000}K以内`;
  }
  return '面议';
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; delayMs: number } = { maxAttempts: 3, delayMs: 1000 }
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < options.maxAttempts) {
        await delay(options.delayMs * attempt);
      }
    }
  }
  throw lastError;
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 判断是否为空值
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
