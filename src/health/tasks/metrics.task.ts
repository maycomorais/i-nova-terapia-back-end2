// src/health/tasks/metrics.task.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics.service';

@Injectable()
export class MetricsTask {
  constructor(
    private prisma: PrismaService,
    private metricsService: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateMetrics() {
    // Atualizar contadores de pacientes ativos por clínica
    const clinics = await this.prisma.clinic.findMany();
    for (const clinic of clinics) {
      const activePatients = await this.prisma.patient.count({
        where: {
          clinicId: clinic.id,
          // Adicione outros critérios de "ativo" se necessário
        },
      });
      this.metricsService.setActivePatients(
        clinic.id.toString(),
        activePatients,
      );

      const activePsychologists = await this.prisma.psychologist.count({
        where: {
          clinicId: clinic.id,
          // Adicione outros critérios de "ativo" se necessário
        },
      });
      this.metricsService.setActivePsychologists(
        clinic.id.toString(),
        activePsychologists,
      );
    }
  }
}
