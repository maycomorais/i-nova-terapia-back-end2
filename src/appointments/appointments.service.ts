// src/appointments/appointments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../common/cache/cache.service';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private cacheService: CacheService,
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

    const appointments = await this.prisma.appointment.findMany({
      skip: params.skip,
      take: params.take,
      where: {
        ...params.where,
        tenantId: params.tenantId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
        psychologist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    });

    await this.cacheService.set(cacheKey, appointments, 300);
    return appointments;
  }

  async findOne(id: number, tenantId: string): Promise<Appointment> {
    const cacheKey = `appointment:${id}:${tenantId}`;
    const cached = await this.cacheService.get<Appointment>(cacheKey);

    if (cached) {
      return cached;
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
        psychologist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
      },
    });

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

    // Verificar se paciente e psicólogo existem e pertencem ao mesmo tenant
    const [patient, psychologist] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: data.patient.connect.id, tenantId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              refreshToken: true,
              createdAt: true,
              updatedAt: true,
              phone: true,
              tenantId: true,
            },
          },
        },
      }),
      this.prisma.psychologist.findFirst({
        where: { id: data.psychologist.connect.id, tenantId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              refreshToken: true,
              createdAt: true,
              updatedAt: true,
              phone: true,
              tenantId: true,
            },
          },
        },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException(
        `Paciente com ID ${data.patient.connect.id} não encontrado`,
      );
    }

    if (!psychologist) {
      throw new NotFoundException(
        `Psicólogo com ID ${data.psychologist.connect.id} não encontrado`,
      );
    }

    const appointmentData = {
      ...data,
      tenantId,
      status: AppointmentStatus.SCHEDULED,
    };

    const appointment = await this.prisma.appointment.create({
      data: appointmentData,
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
        psychologist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
      },
    });

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
    // Verificar se o agendamento existe e pertence ao tenant
    const existingAppointment = await this.findOne(id, tenantId);
    if (!existingAppointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    // Se estiver atualizando paciente ou psicólogo, verificar se existem
    if (data.patient?.connect?.id) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: Number(data.patient.connect.id), tenantId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              refreshToken: true,
              createdAt: true,
              updatedAt: true,
              phone: true,
              tenantId: true,
            },
          },
        },
      });
      if (!patient) {
        throw new NotFoundException(
          `Paciente com ID ${data.patient.connect.id} não encontrado`,
        );
      }
    }

    if (data.psychologist?.connect?.id) {
      const psychologist = await this.prisma.psychologist.findFirst({
        where: { id: Number(data.psychologist.connect.id), tenantId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              refreshToken: true,
              createdAt: true,
              updatedAt: true,
              phone: true,
              tenantId: true,
            },
          },
        },
      });
      if (!psychologist) {
        throw new NotFoundException(
          `Psicólogo com ID ${data.psychologist.connect.id} não encontrado`,
        );
      }
    }

    const appointment = await this.prisma.appointment.update({
      where: {
        id,
        tenantId,
      },
      data,
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
        psychologist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
      },
    });

    await this.invalidateCache(tenantId);
    await this.notificationsService.sendAppointmentNotification(appointment);

    return appointment;
  }

  async delete(id: number, tenantId: string): Promise<Appointment> {
    // Verificar se o agendamento existe e pertence ao tenant
    const existingAppointment = await this.findOne(id, tenantId);
    if (!existingAppointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    const appointment = await this.prisma.appointment.delete({
      where: {
        id,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
        psychologist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                refreshToken: true,
                createdAt: true,
                updatedAt: true,
                phone: true,
                tenantId: true,
              },
            },
          },
        },
      },
    });

    await this.invalidateCache(tenantId);
    return appointment;
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    await this.cacheService.delete(`${tenantId}:appointments:list`);
  }
}
