// src/psychologists/psychologists.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Psychologist, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Serviço responsável por gerenciar as operações relacionadas aos psicólogos
 * Lida com criação, atualização, busca e remoção de psicólogos, além de suas relações
 */
@Injectable()
export class PsychologistsService {
  private readonly logger = new Logger(PsychologistsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Busca um psicólogo específico por ID
   */
  async psychologist(
    psychologistId: number,
    tenantId: string,
  ): Promise<Psychologist | null> {
    const psychologist = await this.prisma.psychologist.findFirst({
      where: {
        id: psychologistId,
        tenantId,
      },
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
        clinic: {
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
        patients: {
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

    if (!psychologist) {
      throw new NotFoundException(
        `Psicólogo com ID ${psychologistId} não encontrado`,
      );
    }

    return psychologist;
  }

  /**
   * Lista psicólogos com filtros e paginação
   */
  async psychologists(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PsychologistWhereInput;
    orderBy?: Prisma.PsychologistOrderByWithRelationInput;
    tenantId: string;
  }): Promise<Psychologist[]> {
    const { skip, take, where, orderBy, tenantId } = params;
    return this.prisma.psychologist.findMany({
      skip,
      take,
      where: {
        ...where,
        tenantId,
      },
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
            createdAt: true,
            updatedAt: true,
            phone: true,
            tenantId: true,
          },
        },
        clinic: {
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
        patients: {
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
   * Cria um novo psicólogo
   */
  async createPsychologist(
    data: Prisma.PsychologistCreateInput,
  ): Promise<Psychologist> {
    this.logger.debug(`Criando psicólogo com CRP: ${data.crp}`);

    // Verificar se CRP já existe
    const existingCRP = await this.prisma.psychologist.findFirst({
      where: {
        crp: data.crp,
        tenantId: data.tenantId,
      },
    });

    if (existingCRP) {
      throw new ForbiddenException('CRP já cadastrado no sistema');
    }

    try {
      // Se houver dados de usuário, fazer hash da senha
      if (data.user?.create?.password) {
        data.user.create.password = await bcrypt.hash(
          data.user.create.password,
          10,
        );
      }

      // Criar o psicólogo com todas as relações
      return await this.prisma.psychologist.create({
        data: {
          cpf: data.cpf,
          crp: data.crp,
          address: data.address,
          phone: data.phone,
          tenantId: data.tenantId,
          user: data.user,
          clinic: data.clinic,
        },
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
          clinic: {
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
          patients: {
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
    } catch (error) {
      this.logger.error(
        `Erro ao criar psicólogo: ${error.message}`,
        error.stack,
      );
      if (error.code === 'P2002') {
        throw new ForbiddenException(
          'CRP, CPF ou email já cadastrado no sistema',
        );
      }
      throw error;
    }
  }

  /**
   * Atualiza um psicólogo
   */
  async updatePsychologist(params: {
    id: number;
    data: Prisma.PsychologistUpdateInput;
    tenantId: string;
    userId?: number;
  }): Promise<Psychologist> {
    const { id, data, tenantId, userId } = params;

    const psychologist = await this.psychologist(id, tenantId);

    // Se for o próprio psicólogo atualizando, verificar permissões especiais
    if (userId && psychologist.userId === userId) {
      // Remover campos que o psicólogo não pode atualizar
      delete (data as any).clinic;
      delete (data as any).tenantId;
    }

    // Verificar CRP se estiver sendo atualizado
    if (data.crp) {
      const existingCRP = await this.prisma.psychologist.findFirst({
        where: {
          crp: data.crp as string,
          tenantId,
          NOT: { id },
        },
      });

      if (existingCRP) {
        throw new ForbiddenException('CRP já cadastrado no sistema');
      }
    }

    return this.prisma.psychologist.update({
      where: { id },
      data,
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
        clinic: {
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
        patients: {
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
   * Remove um psicólogo
   */
  async deletePsychologist(
    id: number,
    tenantId: string,
  ): Promise<Psychologist> {
    await this.psychologist(id, tenantId);

    const hasPatients = await this.prisma.patient.count({
      where: {
        psychologistId: id,
        tenantId,
      },
    });

    if (hasPatients > 0) {
      throw new ForbiddenException(
        'Não é possível excluir um psicólogo que possui pacientes vinculados',
      );
    }

    return this.prisma.psychologist.delete({
      where: { id },
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
        clinic: {
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
        patients: {
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
   * Vincula psicólogo a uma clínica
   */
  async linkToClinic(
    psychologistId: number,
    clinicId: number,
    tenantId: string,
  ): Promise<Psychologist> {
    await this.psychologist(psychologistId, tenantId);

    const clinic = await this.prisma.clinic.findFirst({
      where: {
        id: clinicId,
        tenantId,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clínica com ID ${clinicId} não encontrada`);
    }

    return this.prisma.psychologist.update({
      where: { id: psychologistId },
      data: {
        clinic: {
          connect: { id: clinicId },
        },
      },
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
        clinic: {
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
        patients: {
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
   * Remove vínculo com clínica
   */
  async unlinkFromClinic(
    psychologistId: number,
    tenantId: string,
  ): Promise<Psychologist> {
    await this.psychologist(psychologistId, tenantId);

    return this.prisma.psychologist.update({
      where: { id: psychologistId },
      data: {
        clinic: {
          disconnect: true,
        },
      },
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
        clinic: {
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
        patients: {
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
}
