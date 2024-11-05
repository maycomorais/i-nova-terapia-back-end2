// src/patients/patients.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Patient, Prisma, Role } from '@prisma/client';

/**
 * Serviço responsável pelo gerenciamento de pacientes
 * Lida com criação, atualização, busca e remoção de pacientes
 * Mantém a integridade dos dados e regras de negócio relacionadas a pacientes
 */
@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Busca um paciente específico pelo ID
   * Inclui todas as relações relevantes (usuário, psicólogo, clínica, etc)
   */
  async patient(patientId: number, tenantId: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId,
      },
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
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Paciente com ID ${patientId} não encontrado`,
      );
    }

    return patient;
  }

  /**
   * Lista pacientes com filtros e paginação
   * Considera o papel do usuário para filtrar os resultados apropriadamente
   */
  async patients(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PatientWhereInput;
    orderBy?: Prisma.PatientOrderByWithRelationInput;
    tenantId: string;
    userId?: number;
    userRole?: Role;
  }): Promise<Patient[]> {
    const { skip, take, where, orderBy, tenantId, userId, userRole } = params;

    let filter: Prisma.PatientWhereInput = {
      ...where,
      tenantId,
    };

    // Filtrar pacientes baseado no papel do usuário
    if (userRole === Role.PSYCHOLOGIST) {
      filter = {
        ...filter,
        psychologist: {
          userId: userId,
        },
      };
    } else if (userRole === Role.CLINIC) {
      filter = {
        ...filter,
        clinic: {
          userId: userId,
        },
      };
    }

    return this.prisma.patient.findMany({
      skip,
      take,
      where: filter,
      orderBy: {
        user: {
          name: 'asc',
        },
        ...orderBy,
      },
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
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }

  /**
   * Cria um novo paciente
   * Realiza validações de dados únicos e cria relações necessárias
   */
  async createPatient(
    data: Prisma.PatientCreateInput,
    tenantId: string,
  ): Promise<Patient> {
    this.logger.debug(`Criando paciente para tenant ${tenantId}`);

    // Verificar se CPF já existe
    const existingCPF = await this.prisma.patient.findFirst({
      where: {
        cpf: data.cpf,
        tenantId,
      },
    });

    if (existingCPF) {
      throw new ForbiddenException('CPF já cadastrado no sistema');
    }

    try {
      // Garantir o tenantId no usuário se houver criação
      if (data.user?.create) {
        data.user.create = {
          ...data.user.create,
          tenantId,
        };
      }

      // Criar o paciente com todas as relações
      const patient = await this.prisma.patient.create({
        data: {
          ...data,
          tenantId,
        },
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
          psychologist: true,
          clinic: true,
          appointments: true,
          moodDiaries: true,
        },
      });

      this.logger.debug(`Paciente criado com ID ${patient.id}`);
      return patient;
    } catch (error) {
      this.logger.error(`Erro ao criar paciente: ${error.message}`);
      if (error.code === 'P2002') {
        throw new ForbiddenException('CPF ou email já cadastrado no sistema');
      }
      throw error;
    }
  }

  /**
   * Atualiza os dados de um paciente existente
   * Inclui validações de permissão e dados únicos
   */
  async updatePatient(params: {
    id: number;
    data: Prisma.PatientUpdateInput;
    tenantId: string;
    userId?: number;
    userRole?: Role;
  }): Promise<Patient> {
    const { id, data, tenantId, userId, userRole } = params;

    // Verificar se o paciente existe e pertence ao tenant
    await this.patient(id, tenantId);

    // Verificar permissões
    if (userRole === Role.PATIENT && userId !== id) {
      throw new ForbiddenException(
        'Paciente só pode atualizar seus próprios dados',
      );
    }

    // Verificar CPF se estiver sendo atualizado
    if (data.cpf) {
      const existingCPF = await this.prisma.patient.findFirst({
        where: {
          cpf: data.cpf as string,
          tenantId,
          NOT: { id },
        },
      });

      if (existingCPF) {
        throw new ForbiddenException('CPF já cadastrado no sistema');
      }
    }

    // Se for o próprio paciente atualizando, limitar campos que podem ser atualizados
    if (userRole === Role.PATIENT) {
      const allowedFields = ['address', 'phone'];
      Object.keys(data).forEach((key) => {
        if (!allowedFields.includes(key)) {
          delete data[key];
        }
      });
    }

    return this.prisma.patient.update({
      where: { id },
      data,
      include: {
        user: true,
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }

  /**
   * Remove um paciente do sistema
   * Verifica se não há consultas associadas antes da remoção
   */
  async deletePatient(id: number, tenantId: string): Promise<Patient> {
    // Verificar se o paciente existe e pertence ao tenant
    await this.patient(id, tenantId);

    // Verificar se possui consultas
    const hasAppointments = await this.prisma.appointment.count({
      where: {
        patientId: id,
        tenantId,
      },
    });

    if (hasAppointments > 0) {
      throw new ForbiddenException(
        'Não é possível excluir um paciente que possui consultas registradas',
      );
    }

    return this.prisma.patient.delete({
      where: { id },
      include: {
        user: true,
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }

  /**
   * Vincula um paciente a um psicólogo
   * Verifica a existência de ambos no mesmo tenant
   */
  async linkToPsychologist(
    patientId: number,
    psychologistId: number,
    tenantId: string,
  ): Promise<Patient> {
    // Verificar se o paciente existe e pertence ao tenant
    await this.patient(patientId, tenantId);

    const psychologist = await this.prisma.psychologist.findFirst({
      where: {
        id: psychologistId,
        tenantId,
      },
    });

    if (!psychologist) {
      throw new NotFoundException(
        `Psicólogo com ID ${psychologistId} não encontrado`,
      );
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        psychologist: {
          connect: { id: psychologistId },
        },
      },
      include: {
        user: true,
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }

  /**
   * Vincula um paciente a uma clínica
   * Verifica a existência de ambos no mesmo tenant
   */
  async linkToClinic(
    patientId: number,
    clinicId: number,
    tenantId: string,
  ): Promise<Patient> {
    // Verificar se o paciente existe e pertence ao tenant
    await this.patient(patientId, tenantId);

    const clinic = await this.prisma.clinic.findFirst({
      where: {
        id: clinicId,
        tenantId,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clínica com ID ${clinicId} não encontrada`);
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        clinic: {
          connect: { id: clinicId },
        },
      },
      include: {
        user: true,
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }

  /**
   * Remove o vínculo entre paciente e psicólogo
   */
  async unlinkFromPsychologist(
    patientId: number,
    tenantId: string,
  ): Promise<Patient> {
    // Verificar se o paciente existe e pertence ao tenant
    await this.patient(patientId, tenantId);

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        psychologist: {
          disconnect: true,
        },
      },
      include: {
        user: true,
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }

  /**
   * Remove o vínculo entre paciente e clínica
   */
  async unlinkFromClinic(
    patientId: number,
    tenantId: string,
  ): Promise<Patient> {
    // Verificar se o paciente existe e pertence ao tenant
    await this.patient(patientId, tenantId);

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        clinic: {
          disconnect: true,
        },
      },
      include: {
        user: true,
        psychologist: true,
        clinic: true,
        appointments: true,
        moodDiaries: true,
      },
    });
  }
}
