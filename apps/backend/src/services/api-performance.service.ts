import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry {
  data: any;
  expiry: number;
  hits: number;
  createdAt: number;
}

@Injectable()
export class ApiPerformanceService {
  private readonly logger = new Logger(ApiPerformanceService.name);
  private readonly responseCache = new Map<string, CacheEntry>();
  private readonly performanceMetrics = new Map<string, number[]>();

  constructor(private readonly configService: ConfigService) {
    this.startCacheCleanup();
  }

  async cacheResponse(key: string, data: any, ttlMs: number = 300000): Promise<void> {
    const entry: CacheEntry = {
      data,
      expiry: Date.now() + ttlMs,
      hits: 0,
      createdAt: Date.now(),
    };

    this.responseCache.set(key, entry);
    this.logger.debug(`Cached response for key: ${key}`);
  }

  async getCachedResponse(key: string): Promise<any | null> {
    const cached = this.responseCache.get(key);

    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.responseCache.delete(key);
      return null;
    }

    cached.hits++;
    this.logger.debug(`Cache hit for key: ${key} (hits: ${cached.hits})`);
    return cached.data;
  }

  generateCacheKey(userId: string, endpoint: string, params: any): string {
    const paramString = JSON.stringify(params || {});
    return `${userId}:${endpoint}:${Buffer.from(paramString).toString('base64')}`;
  }

  recordPerformanceMetric(endpoint: string, duration: number): void {
    if (!this.performanceMetrics.has(endpoint)) {
      this.performanceMetrics.set(endpoint, []);
    }

    const metrics = this.performanceMetrics.get(endpoint)!;
    metrics.push(duration);

    if (metrics.length > 100) {
      metrics.shift();
    }

    if (duration > 1000) {
      this.logger.warn(`Slow API response: ${endpoint} took ${duration}ms`);
    }
  }

  getPerformanceStats(endpoint: string): any {
    const metrics = this.performanceMetrics.get(endpoint);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const avg = metrics.reduce((sum, val) => sum + val, 0) / metrics.length;

    return {
      endpoint,
      count: metrics.length,
      average: Math.round(avg),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  getCacheStats(): any {
    const totalEntries = this.responseCache.size;
    let totalHits = 0;
    let expiredEntries = 0;

    const now = Date.now();
    for (const [key, entry] of this.responseCache.entries()) {
      totalHits += entry.hits;
      if (now > entry.expiry) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      totalHits,
      expiredEntries,
      hitRate: totalEntries > 0 ? (totalHits / totalEntries).toFixed(2) : '0.00',
    };
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.responseCache.entries()) {
        if (now > entry.expiry) {
          this.responseCache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
      }
    }, 60000);
  }
}
