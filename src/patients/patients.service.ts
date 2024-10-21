import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Patient, Prisma } from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca um paciente específico com base em um critério único
   * @param patientWhereUniqueInput Critério de busca único (ex: id, email)
   * @returns O paciente encontrado ou null se não existir
   */
  async patient(
    patientWhereUniqueInput: Prisma.PatientWhereUniqueInput,
  ): Promise<Patient | null> {
    return this.prisma.patient.findUnique({
      where: patientWhereUniqueInput,
    });
  }

  /**
   * Busca múltiplos pacientes com base em vários critérios
   * @param params Objeto contendo opções de busca, paginação e ordenação
   * @returns Array de pacientes que correspondem aos critérios
   */
  async patients(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PatientWhereUniqueInput;
    where?: Prisma.PatientWhereInput;
    orderBy?: Prisma.PatientOrderByWithRelationInput;
  }): Promise<Patient[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.patient.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  /**
   * Cria um novo paciente
   * @param data Dados do paciente a ser criado
   * @returns O paciente criado
   */
  async createPatient(data: Prisma.PatientCreateInput): Promise<Patient> {
    return this.prisma.patient.create({
      data,
    });
  }

  /**
   * Atualiza os dados de um paciente existente
   * @param params Objeto contendo o critério de busca e os dados a serem atualizados
   * @returns O paciente atualizado
   */
  async updatePatient(params: {
    where: Prisma.PatientWhereUniqueInput;
    data: Prisma.PatientUpdateInput;
  }): Promise<Patient> {
    const { where, data } = params;
    return this.prisma.patient.update({
      data,
      where,
    });
  }

  /**
   * Remove um paciente do banco de dados
   * @param where Critério único para identificar o paciente a ser removido
   * @returns O paciente removido
   */
  async deletePatient(where: Prisma.PatientWhereUniqueInput): Promise<Patient> {
    return this.prisma.patient.delete({
      where,
    });
  }

  /**
   * Vincula um paciente a um psicólogo
   * @param patientId ID do paciente
   * @param psychologistId ID do psicólogo
   * @returns O paciente atualizado
   */
  async linkToPsychologist(
    patientId: number,
    psychologistId: number,
  ): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    const psychologist = await this.prisma.psychologist.findUnique({
      where: { id: psychologistId },
    });

    if (!psychologist) {
      throw new NotFoundException(
        `Psychologist with ID ${psychologistId} not found`,
      );
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: { psychologistId: psychologistId },
    });
  }

  /**
   * Vincula um paciente a uma clínica
   * @param patientId ID do paciente
   * @param clinicId ID da clínica
   * @returns O paciente atualizado
   */
  async linkToClinic(patientId: number, clinicId: number): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: { clinicId: clinicId },
    });
  }

  /**
   * Remove a vinculação de um paciente com um psicólogo
   * @param patientId ID do paciente
   * @returns O paciente atualizado
   */
  async unlinkFromPsychologist(patientId: number): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: { psychologistId: null },
    });
  }

  /**
   * Remove a vinculação de um paciente com uma clínica
   * @param patientId ID do paciente
   * @returns O paciente atualizado
   */
  async unlinkFromClinic(patientId: number): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: { clinicId: null },
    });
  }
}
