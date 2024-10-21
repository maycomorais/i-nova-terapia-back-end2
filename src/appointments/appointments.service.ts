import {
  ConflictException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Appointment, Prisma, AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Busca um agendamento específico
  async appointment(
    appointmentWhereUniqueInput: Prisma.AppointmentWhereUniqueInput,
  ): Promise<Prisma.AppointmentGetPayload<{
    include: { patient: true; psychologist: true };
  }> | null> {
    return this.prisma.appointment.findUnique({
      where: appointmentWhereUniqueInput,
      include: { patient: true, psychologist: true },
    });
  }

  // Busca múltiplos agendamentos com base em parâmetros
  async appointments(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AppointmentWhereUniqueInput;
    where?: Prisma.AppointmentWhereInput;
    orderBy?: Prisma.AppointmentOrderByWithRelationInput;
  }): Promise<
    Prisma.AppointmentGetPayload<{
      include: { patient: true; psychologist: true };
    }>[]
  > {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.appointment.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { patient: true, psychologist: true },
    });
  }

  // Cria um novo agendamento
  async createAppointment(
    data: Prisma.AppointmentCreateInput,
  ): Promise<Appointment> {
    await this.checkAvailability(data);

    const appointment = await this.prisma.appointment.create({
      data: {
        ...data,
        status: AppointmentStatus.SCHEDULED,
      },
      include: { patient: true, psychologist: true },
    });

    await this.notificationsService.sendAppointmentNotification(appointment);

    const reminderTime = new Date(appointment.dateTime);
    reminderTime.setHours(reminderTime.getHours() - 24);
    setTimeout(() => {
      this.notificationsService.sendAppointmentReminder(appointment);
    }, reminderTime.getTime() - Date.now());

    return appointment;
  }

  // Atualiza um agendamento existente
  async updateAppointment(params: {
    where: Prisma.AppointmentWhereUniqueInput;
    data: Prisma.AppointmentUpdateInput;
  }): Promise<Appointment> {
    const { where, data } = params;

    if (data.dateTime || data.duration) {
      const existingAppointment = await this.prisma.appointment.findUnique({
        where,
      });
      await this.checkAvailability({
        ...existingAppointment,
        ...data,
      } as Prisma.AppointmentCreateInput);
    }

    const appointment = await this.prisma.appointment.update({
      data,
      where,
      include: { patient: true, psychologist: true },
    });

    await this.notificationsService.sendAppointmentNotification(appointment);
    return appointment;
  }

  // Cancela um agendamento
  async cancelAppointment(
    id: number,
    cancelledBy: 'PATIENT' | 'PROFESSIONAL',
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Apenas agendamentos com status SCHEDULED podem ser cancelados',
      );
    }

    const status =
      cancelledBy === 'PATIENT'
        ? AppointmentStatus.CANCELLED_BY_PATIENT
        : AppointmentStatus.CANCELLED_BY_PROFESSIONAL;

    const cancelledAppointment = await this.prisma.appointment.update({
      where: { id },
      data: { status },
      include: { patient: true, psychologist: true },
    });

    await this.notificationsService.sendAppointmentNotification(
      cancelledAppointment,
    );
    return cancelledAppointment;
  }

  // Marca um agendamento como concluído
  async completeAppointment(id: number): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Apenas agendamentos com status SCHEDULED podem ser concluídos',
      );
    }

    const completedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
      include: { patient: true, psychologist: true },
    });

    await this.notificationsService.sendAppointmentNotification(
      completedAppointment,
    );
    return completedAppointment;
  }

  // Verifica a disponibilidade para um agendamento
  private async checkAvailability(
    data:
      | Prisma.AppointmentCreateInput
      | (Prisma.AppointmentUpdateInput & { psychologistId?: number }),
  ): Promise<void> {
    const dateTime = new Date(data.dateTime as string | Date);
    const duration = Number(data.duration);
    const psychologistId =
      'psychologist' in data
        ? data.psychologist.connect?.id
        : data.psychologistId;

    // Verificar feriados
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        date: new Date(dateTime.toISOString().split('T')[0]),
      },
    });

    if (holiday) {
      throw new ConflictException(
        `A data selecionada é um feriado: ${holiday.description}`,
      );
    }

    // Verificar disponibilidade do psicólogo
    const availableSlot = await this.prisma.availableSlot.findFirst({
      where: {
        psychologistId: psychologistId,
        startTime: { lte: dateTime },
        endTime: {
          gte: new Date(dateTime.getTime() + duration * 60000),
        },
        isAvailable: true,
      },
    });

    if (!availableSlot) {
      throw new ConflictException(
        'O psicólogo não está disponível neste horário.',
      );
    }

    // Verificar conflitos com outros agendamentos
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        psychologistId: psychologistId,
        status: AppointmentStatus.SCHEDULED,
        dateTime: {
          gte: dateTime,
          lt: new Date(dateTime.getTime() + duration * 60000),
        },
        NOT: {
          id: (data as any).id, // Exclui o próprio agendamento ao verificar conflitos (para updates)
        },
      },
    });

    if (conflictingAppointment) {
      throw new ConflictException(
        'Já existe uma consulta agendada para este horário.',
      );
    }
  }

  // Deleta um agendamento
  async deleteAppointment(
    where: Prisma.AppointmentWhereUniqueInput,
  ): Promise<Appointment> {
    return this.prisma.appointment.delete({
      where,
      include: { patient: true, psychologist: true },
    });
  }

  // Busca agendamentos de um psicólogo específico
  async findAppointmentsByPsychologist(psychologistId: number): Promise<
    Prisma.AppointmentGetPayload<{
      include: { patient: true; psychologist: true };
    }>[]
  > {
    return this.prisma.appointment.findMany({
      where: { psychologistId },
      include: { patient: true, psychologist: true },
    });
  }

  // Busca agendamentos de um paciente específico
  async findAppointmentsByPatient(patientId: number): Promise<
    Prisma.AppointmentGetPayload<{
      include: { patient: true; psychologist: true };
    }>[]
  > {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: { patient: true, psychologist: true },
    });
  }
}
