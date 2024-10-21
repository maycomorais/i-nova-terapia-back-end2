import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Tarefa agendada para enviar lembretes de consultas
   * Executa a cada hora
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: now,
          lt: in24Hours,
        },
        status: 'SCHEDULED',
      },
      include: {
        patient: true,
        psychologist: true,
      },
    });

    for (const appointment of upcomingAppointments) {
      await this.notificationsService.sendAppointmentNotification(appointment);
    }
  }
}
