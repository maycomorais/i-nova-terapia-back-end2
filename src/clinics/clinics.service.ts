// src/clinics/clinics.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Clinic, Prisma } from '@prisma/client';

@Injectable()
export class ClinicsService {
  private readonly logger = new Logger(ClinicsService.name);

  constructor(private prisma: PrismaService) {}

  async clinic(
    clinicWhereUniqueInput: Prisma.ClinicWhereUniqueInput,
    tenantId: string,
  ): Promise<Clinic | null> {
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        ...clinicWhereUniqueInput,
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
        psychologists: {
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

    if (!clinic) {
      throw new NotFoundException(
        `Clínica com ID ${clinicWhereUniqueInput.id} não encontrada`,
      );
    }

    return clinic;
  }

  async clinics(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ClinicWhereUniqueInput;
    where?: Prisma.ClinicWhereInput;
    orderBy?: Prisma.ClinicOrderByWithRelationInput;
    tenantId: string;
  }): Promise<Clinic[]> {
    const { skip, take, cursor, where, orderBy, tenantId } = params;
    return this.prisma.clinic.findMany({
      skip,
      take,
      cursor,
      where: {
        ...where,
        tenantId,
      },
      orderBy,
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
        psychologists: {
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

  async createClinic(
    data: Prisma.ClinicCreateInput,
    tenantId: string,
  ): Promise<Clinic> {
    // Verificar se já existe uma clínica com o mesmo CNPJ
    if (data.cnpj) {
      const existingClinic = await this.prisma.clinic.findFirst({
        where: {
          cnpj: data.cnpj,
          tenantId,
        },
      });

      if (existingClinic) {
        throw new ForbiddenException('CNPJ já cadastrado no sistema');
      }
    }

    return this.prisma.clinic.create({
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
            createdAt: true,
            updatedAt: true,
            phone: true,
            tenantId: true,
          },
        },
      },
    });
  }

  async updateClinic(params: {
    where: Prisma.ClinicWhereUniqueInput;
    data: Prisma.ClinicUpdateInput;
    tenantId: string;
  }): Promise<Clinic> {
    const { where, data, tenantId } = params;

    // Verificar se a clínica existe e pertence ao tenant
    await this.clinic(where, tenantId);

    // Verificar CNPJ se estiver sendo atualizado
    if (data.cnpj) {
      const existingClinic = await this.prisma.clinic.findFirst({
        where: {
          cnpj: data.cnpj as string,
          tenantId,
          NOT: where,
        },
      });

      if (existingClinic) {
        throw new ForbiddenException('CNPJ já cadastrado no sistema');
      }
    }

    return this.prisma.clinic.update({
      where,
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
      },
    });
  }

  async deleteClinic(
    where: Prisma.ClinicWhereUniqueInput,
    tenantId: string,
  ): Promise<Clinic> {
    // Verificar se a clínica existe e pertence ao tenant
    await this.clinic(where, tenantId);

    // Verificar se possui psicólogos ou pacientes vinculados
    const clinic = await this.prisma.clinic.findUnique({
      where,
      include: {
        psychologists: true,
        patients: true,
      },
    });

    if (clinic.psychologists.length > 0 || clinic.patients.length > 0) {
      throw new ForbiddenException(
        'Não é possível excluir uma clínica que possui psicólogos ou pacientes vinculados',
      );
    }

    return this.prisma.clinic.delete({
      where,
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
    });
  }
}
