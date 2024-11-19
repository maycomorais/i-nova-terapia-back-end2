// src/payments/payments.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AsaasService } from '../asaas/asaas.service';
import { Payment, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { IPaymentsRepository } from 'src/common/repositories/payments.repository.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  prisma: any;

  constructor(
    private readonly paymentsRepository: IPaymentsRepository,
    private readonly asaas: AsaasService,
    private readonly config: ConfigService,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    tenantId: string,
  ): Promise<Payment> {
    this.logger.debug(`Creating payment for tenant ${tenantId}`);

    // Criar pagamento no ASAAS
    const asaasPayment = await this.createAsaasPayment(createPaymentDto);

    // Criar pagamento no banco de dados
    const payment = await this.paymentsRepository.create(
      {
        appointmentId: createPaymentDto.appointmentId,
        amount: createPaymentDto.amount,
        method: createPaymentDto.method,
        status: PaymentStatus.PENDING,
        dueDate: new Date(createPaymentDto.dueDate),
        installments: createPaymentDto.installments,
        notes: createPaymentDto.notes,
        asaasPaymentId: asaasPayment.id,
        asaasInvoiceUrl: asaasPayment.invoiceUrl,
        asaasPixCode: asaasPayment.pixCode,
        asaasBoletoCode: asaasPayment.boletoCode,
      },
      tenantId,
    );

    // Processar splits se houver
    if (createPaymentDto.splits?.length) {
      await this.processSplits(payment.id, createPaymentDto.splits, tenantId);
    }

    return payment;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    tenantId: string;
  }): Promise<Payment[]> {
    return this.paymentsRepository.findAll(params);
  }

  async findOne(id: number, tenantId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne(id, tenantId);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async processWebhook(webhookData: any): Promise<void> {
    this.logger.debug(
      `Processing payment webhook: ${JSON.stringify(webhookData)}`,
    );

    const payment = await this.paymentsRepository.findByAsaasId(
      webhookData.payment.id,
    );

    if (!payment) {
      this.logger.warn(`Payment not found: ${webhookData.payment.id}`);
      return;
    }

    // Atualizar status do pagamento
    await this.paymentsRepository.update(
      payment.id,
      {
        status: this.mapAsaasStatus(webhookData.payment.status),
        paidAt: webhookData.payment.paymentDate
          ? new Date(webhookData.payment.paymentDate)
          : null,
      },
      payment.tenantId,
    );

    // Processar splits se o pagamento foi confirmado
    if (
      webhookData.payment.status === 'CONFIRMED' ||
      webhookData.payment.status === 'RECEIVED'
    ) {
      await this.paymentsRepository.processSplits(payment.id, payment.tenantId);
    }
  }

  private async processSplits(
    paymentId: number,
    splits: Array<{ receiverId: number; percentage: number }>,
    tenantId: string,
  ): Promise<void> {
    const payment = await this.paymentsRepository.findOne(paymentId, tenantId);
    if (!payment) return;

    for (const split of splits) {
      // Criar split no banco
      await this.prisma.paymentSplit.create({
        data: {
          payment: { connect: { id: paymentId } },
          receiverId: split.receiverId,
          percentage: split.percentage,
          tenantId,
        },
      });

      // Se o pagamento já estiver confirmado, processar o split imediatamente
      if (
        payment.status === PaymentStatus.CONFIRMED ||
        payment.status === PaymentStatus.RECEIVED
      ) {
        const splitAmount = Number(payment.amount) * (split.percentage / 100);
        await this.asaas.createTransfer({
          amount: splitAmount,
          description: `Split for payment ${paymentId}`,
          bankAccount: split.receiverId.toString(),
        });
      }
    }
  }

  private mapAsaasStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      PENDING: PaymentStatus.PENDING,
      CONFIRMED: PaymentStatus.CONFIRMED,
      RECEIVED: PaymentStatus.RECEIVED,
      OVERDUE: PaymentStatus.OVERDUE,
      REFUNDED: PaymentStatus.REFUNDED,
      CANCELLED: PaymentStatus.CANCELLED,
    };
    return statusMap[status] || PaymentStatus.PENDING;
  }

  private async createAsaasPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<any> {
    try {
      return await this.asaas.createPayment({
        value: createPaymentDto.amount,
        dueDate: createPaymentDto.dueDate,
        description: `Payment for appointment ${createPaymentDto.appointmentId}`,
        installmentCount: createPaymentDto.installments,
        customer: '',
        billingType: 'BOLETO',
      });
    } catch (error) {
      this.logger.error(`Error creating ASAAS payment: ${error.message}`);
      throw new Error('Failed to create payment in ASAAS');
    }
  }
}
