// src/common/cache/cache.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { getTenantId } from '../tenant.context';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private generateKey(key: string): string {
    const tenantId = getTenantId();
    return `${tenantId}:${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(this.generateKey(key));
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.cacheManager.set(this.generateKey(key), value, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(this.generateKey(key));
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }
}
