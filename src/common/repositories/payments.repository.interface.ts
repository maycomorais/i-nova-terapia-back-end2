// src/payments/repositories/payments.repository.interface.ts
import { Payment, PaymentStatus } from '@prisma/client';
import { IBaseRepository } from '../../common/repositories/base.repository';

export interface IPaymentsRepository extends IBaseRepository<Payment> {
  findByAppointment(appointmentId: number, tenantId: string): Promise<Payment>;
  findByStatus(status: PaymentStatus, tenantId: string): Promise<Payment[]>;
  findByAsaasId(asaasId: string): Promise<Payment>;
  processSplits(paymentId: number, tenantId: string): Promise<void>;
}
