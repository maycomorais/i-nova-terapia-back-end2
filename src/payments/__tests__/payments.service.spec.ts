// src/payments/__tests__/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../payments.service';
import { IPaymentsRepository } from '../../common/repositories/payments.repository.interface';
import { AsaasService } from '../../asaas/asaas.service';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentMethod, PaymentStatus } from '@prisma/client';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<IPaymentsRepository>;
  let asaasService: jest.Mocked<AsaasService>;

  const mockTenantId = 'test-tenant';
  const mockPayment: Payment = {
    id: 1,
    appointmentId: 1,
    amount: 100 as any, // Decimal
    discount: null,
    method: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    dueDate: new Date(),
    installments: null,
    asaasPaymentId: 'asaas-payment-id',
    asaasInvoiceUrl: 'http://test.com/invoice',
    asaasPixCode: 'pix-code',
    asaasBoletoCode: 'boleto-code',
    paidAt: null,
    notes: 'Test payment',
    tenantId: mockTenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreatePaymentDto: CreatePaymentDto = {
    appointmentId: 1,
    amount: 100,
    method: PaymentMethod.PIX,
    dueDate: new Date().toISOString(),
    notes: 'Test payment',
  };

  const mockAsaasPayment = {
    id: 'asaas-payment-id',
    invoiceUrl: 'http://test.com/invoice',
    pixCode: 'pix-code',
    boletoCode: 'boleto-code',
  };

  beforeEach(async () => {
    const mockPaymentsRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByAsaasId: jest.fn(),
      findByAppointment: jest.fn(),
      findByStatus: jest.fn(),
      processSplits: jest.fn(),
    };

    const mockAsaasService = {
      createPayment: jest.fn(),
      createCustomer: jest.fn(),
      createTransfer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: 'IPaymentsRepository',
          useValue: mockPaymentsRepository,
        },
        {
          provide: AsaasService,
          useValue: mockAsaasService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentsRepository = module.get('IPaymentsRepository');
    asaasService = module.get(AsaasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    beforeEach(() => {
      asaasService.createPayment.mockResolvedValue(mockAsaasPayment);
      paymentsRepository.create.mockResolvedValue(mockPayment);
    });

    it('should create a payment successfully', async () => {
      const result = await service.create(mockCreatePaymentDto, mockTenantId);

      expect(result).toEqual(mockPayment);
      expect(asaasService.createPayment).toHaveBeenCalled();
      expect(paymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: mockCreatePaymentDto.appointmentId,
          amount: mockCreatePaymentDto.amount,
          method: mockCreatePaymentDto.method,
          status: PaymentStatus.PENDING,
        }),
        mockTenantId,
      );
    });

    it('should handle ASAAS API error', async () => {
      asaasService.createPayment.mockRejectedValue(
        new Error('ASAAS API Error'),
      );

      await expect(
        service.create(mockCreatePaymentDto, mockTenantId),
      ).rejects.toThrow('Failed to create payment in ASAAS');
    });

    it('should process splits if provided', async () => {
      const dtoWithSplits = {
        ...mockCreatePaymentDto,
        splits: [
          { receiverId: 1, percentage: 70 },
          { receiverId: 2, percentage: 30 },
        ],
      };

      await service.create(dtoWithSplits, mockTenantId);

      expect(paymentsRepository.create).toHaveBeenCalled();
      // Verificar se os splits foram processados
    });
  });

  describe('findAll', () => {
    it('should return all payments for tenant', async () => {
      const mockPayments = [mockPayment];
      paymentsRepository.findAll.mockResolvedValue(mockPayments);

      const result = await service.findAll({ tenantId: mockTenantId });

      expect(result).toEqual(mockPayments);
      expect(paymentsRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      paymentsRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.findOne(1, mockTenantId);

      expect(result).toEqual(mockPayment);
      expect(paymentsRepository.findOne).toHaveBeenCalledWith(1, mockTenantId);
    });

    it('should throw NotFoundException when payment is not found', async () => {
      paymentsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processWebhook', () => {
    const mockWebhookData = {
      payment: {
        id: 'asaas-payment-id',
        status: 'CONFIRMED',
        paymentDate: '2024-01-01T10:00:00Z',
      },
    };

    beforeEach(() => {
      paymentsRepository.findByAsaasId.mockResolvedValue(mockPayment);
      paymentsRepository.update.mockResolvedValue(mockPayment);
    });

    it('should process webhook and update payment status', async () => {
      await service.processWebhook(mockWebhookData);

      expect(paymentsRepository.update).toHaveBeenCalledWith(
        mockPayment.id,
        expect.objectContaining({
          status: PaymentStatus.CONFIRMED,
          paidAt: expect.any(Date),
        }),
        mockPayment.tenantId,
      );
    });

    it('should process splits for confirmed payments', async () => {
      await service.processWebhook(mockWebhookData);

      expect(paymentsRepository.processSplits).toHaveBeenCalledWith(
        mockPayment.id,
        mockPayment.tenantId,
      );
    });

    it('should handle non-existent payment', async () => {
      paymentsRepository.findByAsaasId.mockResolvedValue(null);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.processWebhook(mockWebhookData);

      expect(paymentsRepository.update).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
