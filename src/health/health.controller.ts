// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { AsaasHealthIndicator } from './indicators/asaas.health';
import { ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private asaasHealth: AsaasHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database check
      () => this.prismaHealth.isHealthy(),

      // External services check
      () => this.asaasHealth.isHealthy(),

      // Disk storage check
      () =>
        this.disk.checkStorage('storage', {
          thresholdPercent: 0.9,
          path: '/',
        }),

      // Memory heap check
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB

      // Memory RSS check
      () => this.memory.checkRSS('memory_rss', 3000 * 1024 * 1024), // 3000MB
    ]);
  }
}
