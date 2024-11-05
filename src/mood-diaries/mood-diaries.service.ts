// src/mood-diaries/mood-diaries.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MoodDiary, Prisma } from '@prisma/client';
import { CreateMoodDiaryDto } from './dto/create-mood-diary.dto';

/**
 * Serviço responsável pelo gerenciamento do diário de humor
 * Permite pacientes registrarem e acompanharem seu estado emocional
 */
@Injectable()
export class MoodDiariesService {
  private readonly logger = new Logger(MoodDiariesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Busca um registro específico do diário
   */
  async findOne(id: number, tenantId: string): Promise<MoodDiary> {
    const moodDiary = await this.prisma.moodDiary.findFirst({
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

    if (!moodDiary) {
      throw new NotFoundException(`Registro de humor ${id} não encontrado`);
    }

    return moodDiary;
  }

  /**
   * Lista registros do diário com filtros e paginação
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.MoodDiaryWhereInput;
    orderBy?: Prisma.MoodDiaryOrderByWithRelationInput;
    tenantId: string;
  }): Promise<MoodDiary[]> {
    const { skip, take, where, orderBy, tenantId } = params;

    return this.prisma.moodDiary.findMany({
      skip,
      take,
      where: {
        ...where,
        tenantId,
      },
      orderBy: orderBy || {
        date: 'desc',
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
  }

  /**
   * Cria um novo registro no diário
   */
  async create(
    createMoodDiaryDto: CreateMoodDiaryDto,
    tenantId: string,
  ): Promise<MoodDiary> {
    this.logger.debug(
      `Criando registro de humor para paciente ${createMoodDiaryDto.patientId}`,
    );

    // Verificar se o paciente existe e pertence ao tenant
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: createMoodDiaryDto.patientId,
        tenantId,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Paciente ${createMoodDiaryDto.patientId} não encontrado`,
      );
    }

    // Verificar se já existe registro para o dia
    const existingEntry = await this.prisma.moodDiary.findFirst({
      where: {
        patientId: createMoodDiaryDto.patientId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        tenantId,
      },
    });

    if (existingEntry) {
      throw new ForbiddenException('Já existe um registro para hoje');
    }

    return this.prisma.moodDiary.create({
      data: {
        patientId: createMoodDiaryDto.patientId,
        mood: createMoodDiaryDto.mood,
        notes: createMoodDiaryDto.notes,
        date: new Date(), // Definimos a data atual aqui
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
  }

  /**
   * Atualiza um registro do diário
   */
  async update(
    id: number,
    data: Prisma.MoodDiaryUncheckedUpdateInput,
    tenantId: string,
    userId: number,
  ): Promise<MoodDiary> {
    const moodDiary = await this.prisma.moodDiary.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
      },
    });

    if (!moodDiary) {
      throw new NotFoundException(`Registro de humor ${id} não encontrado`);
    }

    // Verificar se o registro pertence ao paciente
    const patient = await this.prisma.patient.findUnique({
      where: { id: moodDiary.patientId },
    });

    if (!patient || patient.userId !== userId) {
      throw new ForbiddenException(
        'Você só pode atualizar seus próprios registros',
      );
    }

    // Verificar se o registro é de hoje
    if (!this.isToday(moodDiary.date)) {
      throw new ForbiddenException(
        'Só é possível editar registros do dia atual',
      );
    }

    return this.prisma.moodDiary.update({
      where: { id },
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
  }

  /**
   * Remove um registro do diário
   */
  async delete(
    id: number,
    tenantId: string,
    userId: number,
  ): Promise<MoodDiary> {
    const moodDiary = await this.prisma.moodDiary.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
      },
    });

    if (!moodDiary) {
      throw new NotFoundException(`Registro de humor ${id} não encontrado`);
    }

    // Verificar se o registro pertence ao paciente
    const patient = await this.prisma.patient.findUnique({
      where: { id: moodDiary.patientId },
    });

    if (!patient || patient.userId !== userId) {
      throw new ForbiddenException(
        'Você só pode deletar seus próprios registros',
      );
    }

    // Verificar se o registro é de hoje
    if (!this.isToday(moodDiary.date)) {
      throw new ForbiddenException(
        'Só é possível deletar registros do dia atual',
      );
    }

    return this.prisma.moodDiary.delete({
      where: { id },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
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
  }

  /**
   * Busca registros de um paciente específico
   */
  async findByPatient(
    patientId: number,
    tenantId: string,
    userId: number,
  ): Promise<MoodDiary[]> {
    // Verificar se o paciente existe
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId,
      },
      include: {
        psychologist: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente ${patientId} não encontrado`);
    }

    // Verificar se é o próprio paciente ou seu psicólogo
    if (patient.userId !== userId && patient.psychologist?.userId !== userId) {
      throw new ForbiddenException(
        'Acesso não autorizado aos registros deste paciente',
      );
    }

    return this.findAll({
      where: { patientId },
      tenantId,
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Verifica se uma data é do dia atual
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }
}
