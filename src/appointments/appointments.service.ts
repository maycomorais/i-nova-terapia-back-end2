// src/appointments/appointments.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../common/cache/cache.service';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { IAppointmentsRepository } from '../common/repositories/appointments.repository.interface';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @Inject('IAppointmentsRepository')
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AppointmentWhereInput;
    tenantId: string;
  }): Promise<Appointment[]> {
    const cacheKey = `appointments:list:${JSON.stringify(params)}`;
    const cached = await this.cacheService.get<Appointment[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const appointments = await this.appointmentsRepository.findAll(params);
    await this.cacheService.set(cacheKey, appointments, 300);
    return appointments;
  }

  async findOne(id: number, tenantId: string): Promise<Appointment> {
    const cacheKey = `appointment:${id}:${tenantId}`;
    const cached = await this.cacheService.get<Appointment>(cacheKey);

    if (cached) {
      return cached;
    }

    const appointment = await this.appointmentsRepository.findOne(id, tenantId);
    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    await this.cacheService.set(cacheKey, appointment, 300);
    return appointment;
  }

  async createAppointment(
    data: Prisma.AppointmentCreateInput,
    userId: number,
    tenantId: string,
  ): Promise<Appointment> {
    this.logger.debug(`Criando agendamento para tenant ${tenantId}`);

    // Verificar conflitos de horário
    const hasConflict = await this.appointmentsRepository.checkConflicts(
      data.psychologist.connect.id,
      data.dateTime as Date,
      data.duration as number,
      tenantId,
    );

    if (hasConflict) {
      throw new BadRequestException('Conflito de horário detectado');
    }

    const appointment = await this.appointmentsRepository.create(
      {
        ...data,
        status: AppointmentStatus.SCHEDULED,
      },
      tenantId,
    );

    await this.invalidateCache(tenantId);
    await this.notificationsService.sendAppointmentNotification(appointment);

    return appointment;
  }

  async updateAppointment(
    id: number,
    data: Prisma.AppointmentUpdateInput,
    userId: number,
    tenantId: string,
  ): Promise<Appointment> {
    const existingAppointment = await this.findOne(id, tenantId);

    // Se estiver alterando data/hora, verificar conflitos
    if (data.dateTime || data.duration) {
      const hasConflict = await this.appointmentsRepository.checkConflicts(
        existingAppointment.psychologistId,
        (data.dateTime as Date) || existingAppointment.dateTime,
        (data.duration as number) || existingAppointment.duration,
        tenantId,
        id,
      );

      if (hasConflict) {
        throw new BadRequestException('Conflito de horário detectado');
      }
    }

    const appointment = await this.appointmentsRepository.update(
      id,
      data,
      tenantId,
    );

    await this.invalidateCache(tenantId);
    await this.notificationsService.sendAppointmentNotification(appointment);

    return appointment;
  }

  async delete(id: number, tenantId: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.delete(id, tenantId);
    await this.invalidateCache(tenantId);
    return appointment;
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    await this.cacheService.delete(`${tenantId}:appointments:list`);
  }
}
