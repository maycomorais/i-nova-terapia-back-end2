// src/common/repositories/appointments.repository.interface.ts
import { Appointment, AppointmentStatus } from '@prisma/client';
import { IBaseRepository } from './base.repository';

export interface IAppointmentsRepository extends IBaseRepository<Appointment> {
  findByPatient(patientId: number, tenantId: string): Promise<Appointment[]>;
  findByPsychologist(
    psychologistId: number,
    tenantId: string,
  ): Promise<Appointment[]>;
  findByStatus(
    status: AppointmentStatus,
    tenantId: string,
  ): Promise<Appointment[]>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<Appointment[]>;
  checkConflicts(
    psychologistId: number,
    dateTime: Date,
    duration: number,
    tenantId: string,
    excludeId?: number,
  ): Promise<boolean>;
  findWithRelations(id: number, tenantId: string): Promise<Appointment>;
}
