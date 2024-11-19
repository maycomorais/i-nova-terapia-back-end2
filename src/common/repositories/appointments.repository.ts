// src/common/repositories/appointments.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { IAppointmentsRepository } from './appointments.repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AppointmentsRepository
  extends BaseRepository<Appointment>
  implements IAppointmentsRepository
{
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, 'appointment');
  }
  async findWithRelations(id: number, tenantId: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
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
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async findByPatient(
    patientId: number,
    tenantId: string,
  ): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        patientId,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
      orderBy: {
        dateTime: 'desc',
      },
    });
  }

  async findByPsychologist(
    psychologistId: number,
    tenantId: string,
  ): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        psychologistId,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
      orderBy: {
        dateTime: 'desc',
      },
    });
  }

  async findByStatus(
    status: AppointmentStatus,
    tenantId: string,
  ): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        status,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        dateTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
      orderBy: {
        dateTime: 'asc',
      },
    });
  }

  async checkConflicts(
    psychologistId: number,
    dateTime: Date,
    duration: number,
    tenantId: string,
    excludeId?: number,
  ): Promise<boolean> {
    const endTime = new Date(dateTime.getTime() + duration * 60000);

    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        psychologistId,
        tenantId,
        dateTime: {
          lt: endTime,
        },
        AND: {
          OR: [
            {
              // Nova consulta começa durante uma existente
              dateTime: {
                lte: dateTime,
              },
              endTime: {
                gt: dateTime,
              },
            },
            {
              // Nova consulta termina durante uma existente
              dateTime: {
                lt: endTime,
              },
              endTime: {
                gte: endTime,
              },
            },
            {
              // Nova consulta engloba uma existente
              dateTime: {
                gte: dateTime,
              },
              endTime: {
                lte: endTime,
              },
            },
          ],
        },
        status: {
          notIn: [
            AppointmentStatus.CANCELLED_BY_PATIENT,
            AppointmentStatus.CANCELLED_BY_PROFESSIONAL,
          ],
        },
      },
    });

    return !!conflictingAppointment;
  }

  // Sobrescrever método findOne para incluir relações
  async findOne(id: number, tenantId: string): Promise<Appointment> {
    return this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });
  }

  // Sobrescrever método findAll para incluir relações
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    tenantId: string;
  }): Promise<Appointment[]> {
    const { skip, take, where, orderBy, tenantId } = params;
    return this.prisma.appointment.findMany({
      skip,
      take,
      where: {
        ...where,
        tenantId,
      },
      orderBy: orderBy || { dateTime: 'desc' },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });
  }
  async create(
    data: Prisma.AppointmentUncheckedCreateInput,
    tenantId: string,
  ): Promise<Appointment> {
    const dateTime = new Date(data.dateTime);
    const endTime = new Date(
      dateTime.getTime() + (data.duration as number) * 60000,
    );

    return this.prisma.appointment.create({
      data: {
        ...data,
        dateTime,
        endTime,
        tenantId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        psychologist: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });
  }
}
