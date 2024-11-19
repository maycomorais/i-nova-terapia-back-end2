// src/payments/repositories/payments.repository.ts
import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';
import { IPaymentsRepository } from './payments.repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentsRepository
  extends BaseRepository<Payment>
  implements IPaymentsRepository
{
  constructor(prismaService: PrismaService) {
    super(prismaService, 'payment');
  }

  async findByAppointment(
    appointmentId: number,
    tenantId: string,
  ): Promise<Payment> {
    return this.prisma.payment.findFirst({
      where: {
        appointmentId,
        tenantId,
      },
      include: {
        paymentSplits: true,
        appointment: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
            psychologist: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async findByStatus(
    status: PaymentStatus,
    tenantId: string,
  ): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        status,
        tenantId,
      },
      include: {
        paymentSplits: true,
        appointment: true,
      },
    });
  }

  async findByAsaasId(asaasId: string): Promise<Payment> {
    return this.prisma.payment.findFirst({
      where: {
        asaasPaymentId: asaasId,
      },
      include: {
        paymentSplits: true,
      },
    });
  }

  async processSplits(paymentId: number, tenantId: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId,
      },
      include: {
        paymentSplits: true,
      },
    });

    if (!payment) return;

    // Processar splits existentes
    await Promise.all(
      payment.paymentSplits.map(async (split) => {
        await this.prisma.paymentSplit.update({
          where: { id: split.id },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });
      }),
    );
  }

  // Sobrescrever método findOne para incluir relações
  async findOne(id: number, tenantId: string): Promise<Payment> {
    return this.prisma.payment.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        paymentSplits: true,
        appointment: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
            psychologist: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }
}
