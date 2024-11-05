// src/common/cache/cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule as BaseCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

@Module({
  imports: [
    BaseCacheModule.register({
      ttl: 60 * 60, // 1 hora
      max: 100, // máximo de 100 itens em cache
      isGlobal: true,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, BaseCacheModule],
})
export class CacheModule {}
