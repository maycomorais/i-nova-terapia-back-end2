// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { AsaasHealthIndicator } from './indicators/asaas.health';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsTask } from './tasks/metrics.task';

@Module({
  imports: [TerminusModule, HttpModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [HealthController, MetricsController],
  providers: [
    PrismaHealthIndicator,
    AsaasHealthIndicator,
    MetricsService,
    MetricsTask,
  ],
  exports: [MetricsService],
})
export class HealthModule {}
