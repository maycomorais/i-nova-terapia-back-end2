import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Clinic, Prisma } from '@prisma/client';

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  async clinic(
    clinicWhereUniqueInput: Prisma.ClinicWhereUniqueInput,
  ): Promise<Clinic | null> {
    return this.prisma.clinic.findUnique({
      where: clinicWhereUniqueInput,
    });
  }

  async clinics(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ClinicWhereUniqueInput;
    where?: Prisma.ClinicWhereInput;
    orderBy?: Prisma.ClinicOrderByWithRelationInput;
  }): Promise<Clinic[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.clinic.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createClinic(data: Prisma.ClinicCreateInput): Promise<Clinic> {
    return this.prisma.clinic.create({
      data,
    });
  }

  async updateClinic(params: {
    where: Prisma.ClinicWhereUniqueInput;
    data: Prisma.ClinicUpdateInput;
  }): Promise<Clinic> {
    const { where, data } = params;
    return this.prisma.clinic.update({
      data,
      where,
    });
  }

  async deleteClinic(where: Prisma.ClinicWhereUniqueInput): Promise<Clinic> {
    return this.prisma.clinic.delete({
      where,
    });
  }
}
