import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Psychologist, Prisma } from '@prisma/client';

@Injectable()
export class PsychologistsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca um psicólogo específico com base em um critério único
   * @param psychologistWhereUniqueInput Critério de busca único (ex: id, email)
   * @returns O psicólogo encontrado ou null se não existir
   */
  async psychologist(
    psychologistWhereUniqueInput: Prisma.PsychologistWhereUniqueInput,
  ): Promise<Psychologist | null> {
    return this.prisma.psychologist.findUnique({
      where: psychologistWhereUniqueInput,
    });
  }

  /**
   * Busca múltiplos psicólogos com base em vários critérios
   * @param params Objeto contendo opções de busca, paginação e ordenação
   * @returns Array de psicólogos que correspondem aos critérios
   */
  async psychologists(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PsychologistWhereUniqueInput;
    where?: Prisma.PsychologistWhereInput;
    orderBy?: Prisma.PsychologistOrderByWithRelationInput;
  }): Promise<Psychologist[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.psychologist.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  /**
   * Cria um novo psicólogo
   * @param data Dados do psicólogo a ser criado
   * @returns O psicólogo criado
   */
  async createPsychologist(
    data: Prisma.PsychologistCreateInput,
  ): Promise<Psychologist> {
    return this.prisma.psychologist.create({
      data,
    });
  }

  /**
   * Atualiza os dados de um psicólogo existente
   * @param params Objeto contendo o critério de busca e os dados a serem atualizados
   * @returns O psicólogo atualizado
   */
  async updatePsychologist(params: {
    where: Prisma.PsychologistWhereUniqueInput;
    data: Prisma.PsychologistUpdateInput;
  }): Promise<Psychologist> {
    const { where, data } = params;
    return this.prisma.psychologist.update({
      data,
      where,
    });
  }

  /**
   * Remove um psicólogo do banco de dados
   * @param where Critério único para identificar o psicólogo a ser removido
   * @returns O psicólogo removido
   */
  async deletePsychologist(
    where: Prisma.PsychologistWhereUniqueInput,
  ): Promise<Psychologist> {
    return this.prisma.psychologist.delete({
      where,
    });
  }

  /**
   * Vincula um psicólogo a uma clínica
   * @param psychologistId ID do psicólogo
   * @param clinicId ID da clínica
   * @returns O psicólogo atualizado
   */
  async linkToClinic(
    psychologistId: number,
    clinicId: number,
  ): Promise<Psychologist> {
    const psychologist = await this.prisma.psychologist.findUnique({
      where: { id: psychologistId },
    });

    if (!psychologist) {
      throw new NotFoundException(
        `Psychologist with ID ${psychologistId} not found`,
      );
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    return this.prisma.psychologist.update({
      where: { id: psychologistId },
      data: { clinicId: clinicId },
    });
  }

  /**
   * Remove a vinculação de um psicólogo com uma clínica
   * @param psychologistId ID do psicólogo
   * @returns O psicólogo atualizado
   */
  async unlinkFromClinic(psychologistId: number): Promise<Psychologist> {
    const psychologist = await this.prisma.psychologist.findUnique({
      where: { id: psychologistId },
    });

    if (!psychologist) {
      throw new NotFoundException(
        `Psychologist with ID ${psychologistId} not found`,
      );
    }

    return this.prisma.psychologist.update({
      where: { id: psychologistId },
      data: { clinicId: null },
    });
  }
}
