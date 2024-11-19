// test/units/payments/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../../../src/payments/payments.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { AsaasService } from '../../../src/asaas/asaas.service';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentDto } from '../../../src/payments/dtos/create-payment.dto';
import { Payment, PaymentMethod, PaymentStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let asaasService: AsaasService;

  // Mock data
  const mockTenantId = 'test-tenant';
  const mockAppointment = {
    id: 1,
    patient: {
      id: 1,
      user: {
        name: 'Test Patient',
        email: 'patient@test.com',
      },
      cpf: '12345678901',
      phone: '11999999999',
      asaasId: null,
    },
    psychologist: {
      id: 1,
      user: {
        name: 'Test Psychologist',
      },
    },
    tenantId: mockTenantId,
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

  const mockPayment: Payment = {
    id: 1,
    appointmentId: 1,
    amount: 100 as any, // Decimal
    method: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    discount: null,
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

  const mockPrismaService = {
    appointment: {
      findFirst: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockAsaasService = {
    createPayment: jest.fn(),
    createCustomer: jest.fn(),
    createTransfer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AsaasService,
          useValue: mockAsaasService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    asaasService = module.get<AsaasService>(AsaasService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment successfully', async () => {
      // Arrange
      mockPrismaService.appointment.findFirst.mockResolvedValue(
        mockAppointment,
      );
      mockAsaasService.createPayment.mockResolvedValue(mockAsaasPayment);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await service.create(mockCreatePaymentDto, mockTenantId);

      // Assert
      expect(result).toEqual(mockPayment);
      expect(mockPrismaService.appointment.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCreatePaymentDto.appointmentId,
          tenantId: mockTenantId,
        },
        include: expect.any(Object),
      });
      expect(mockAsaasService.createPayment).toHaveBeenCalled();
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when appointment is not found', async () => {
      // Arrange
      mockPrismaService.appointment.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create(mockCreatePaymentDto, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all payments for tenant', async () => {
      // Arrange
      const mockPayments = [mockPayment];
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      // Act
      const result = await service.findAll({
        tenantId: mockTenantId,
      });

      // Assert
      expect(result).toEqual(mockPayments);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      // Arrange
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);

      // Act
      const result = await service.findOne(1, mockTenantId);

      // Assert
      expect(result).toEqual(mockPayment);
      expect(mockPrismaService.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1,
            tenantId: mockTenantId,
          },
        }),
      );
    });

    it('should throw NotFoundException when payment is not found', async () => {
      // Arrange
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act & Assert
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

    it('should process webhook and update payment status', async () => {
      // Arrange
      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        paymentSplits: [],
      });
      mockPrismaService.payment.update.mockResolvedValue(mockPayment);

      // Act
      await service.processWebhook(mockWebhookData);

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          paidAt: new Date(mockWebhookData.payment.paymentDate),
        },
      });
    });

    it('should handle webhook for non-existent payment', async () => {
      // Arrange
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      await service.processWebhook(mockWebhookData);

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Pagamento não encontrado'),
      );
    });

    it('should process splits when payment is confirmed', async () => {
      // Arrange
      const mockPaymentWithSplits = {
        ...mockPayment,
        paymentSplits: [
          {
            receiverId: 1,
            percentage: 70,
          },
        ],
      };
      mockPrismaService.payment.findFirst.mockResolvedValue(
        mockPaymentWithSplits,
      );
      mockPrismaService.payment.update.mockResolvedValue(mockPayment);
      mockAsaasService.createTransfer = jest.fn().mockResolvedValue({});

      // Act
      await service.processWebhook(mockWebhookData);

      // Assert
      expect(mockAsaasService.createTransfer).toHaveBeenCalledWith({
        amount: 70, // 70% of 100
        description: expect.any(String),
        bankAccount: '1',
      });
    });
  });

  describe('validateSplits', () => {
    const mockSplits = [
      {
        receiverId: 1,
        percentage: 70,
      },
      {
        receiverId: 2,
        percentage: 30,
      },
    ];

    it('should validate splits successfully', async () => {
      // Arrange
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      // Act & Assert
      await expect(
        service['validateSplits'](mockSplits, mockAppointment, 100),
      ).resolves.not.toThrow();
    });

    it('should throw error when total percentage exceeds 100', async () => {
      // Arrange
      const invalidSplits = [
        { receiverId: 1, percentage: 70 },
        { receiverId: 2, percentage: 40 },
      ];

      // Act & Assert
      await expect(
        service['validateSplits'](invalidSplits, mockAppointment, 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when receiver does not exist', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service['validateSplits'](mockSplits, mockAppointment, 100),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty splits array', async () => {
      // Act & Assert
      await expect(
        service['validateSplits']([], mockAppointment, 100),
      ).resolves.not.toThrow();
    });
  });

  describe('createAsaasPayment', () => {
    it('should create payment in ASAAS successfully', async () => {
      // Arrange
      mockAsaasService.createCustomer.mockResolvedValue({ id: 'customer-id' });
      mockAsaasService.createPayment.mockResolvedValue(mockAsaasPayment);

      // Act
      const result = await service['createAsaasPayment'](
        mockAppointment,
        mockCreatePaymentDto,
      );

      // Assert
      expect(result).toEqual(mockAsaasPayment);
      expect(mockAsaasService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'customer-id',
          value: mockCreatePaymentDto.amount,
          dueDate: mockCreatePaymentDto.dueDate,
        }),
      );
    });

    it('should use existing customer ID if available', async () => {
      // Arrange
      const appointmentWithAsaasId = {
        ...mockAppointment,
        patient: {
          ...mockAppointment.patient,
          asaasId: 'existing-customer-id',
        },
      };

      mockAsaasService.createPayment.mockResolvedValue(mockAsaasPayment);

      // Act
      await service['createAsaasPayment'](
        appointmentWithAsaasId,
        mockCreatePaymentDto,
      );

      // Assert
      expect(mockAsaasService.createCustomer).not.toHaveBeenCalled();
      expect(mockAsaasService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'existing-customer-id',
        }),
      );
    });

    it('should handle ASAAS API error', async () => {
      // Arrange
      mockAsaasService.createPayment.mockRejectedValue(
        new Error('ASAAS API Error'),
      );

      // Act & Assert
      await expect(
        service['createAsaasPayment'](mockAppointment, mockCreatePaymentDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapPaymentMethod', () => {
    it('should map PIX payment method correctly', () => {
      // Act
      const result = service['mapPaymentMethod']('PIX');

      // Assert
      expect(result).toBe('PIX');
    });

    it('should map BOLETO payment method correctly', () => {
      // Act
      const result = service['mapPaymentMethod']('BOLETO');

      // Assert
      expect(result).toBe('BOLETO');
    });

    it('should map CREDIT_CARD payment method correctly', () => {
      // Act
      const result = service['mapPaymentMethod']('CREDIT_CARD');

      // Assert
      expect(result).toBe('CREDIT_CARD');
    });

    it('should map HEALTH_INSURANCE to UNDEFINED', () => {
      // Act
      const result = service['mapPaymentMethod']('HEALTH_INSURANCE');

      // Assert
      expect(result).toBe('UNDEFINED');
    });

    it('should map unknown payment methods to UNDEFINED', () => {
      // Act
      const result = service['mapPaymentMethod']('UNKNOWN_METHOD' as any);

      // Assert
      expect(result).toBe('UNDEFINED');
    });
  });

  describe('mapAsaasStatus', () => {
    it('should map PENDING status correctly', () => {
      // Act
      const result = service['mapAsaasStatus']('PENDING');

      // Assert
      expect(result).toBe(PaymentStatus.PENDING);
    });

    it('should map CONFIRMED status correctly', () => {
      // Act
      const result = service['mapAsaasStatus']('CONFIRMED');

      // Assert
      expect(result).toBe(PaymentStatus.CONFIRMED);
    });

    it('should map RECEIVED status correctly', () => {
      // Act
      const result = service['mapAsaasStatus']('RECEIVED');

      // Assert
      expect(result).toBe(PaymentStatus.RECEIVED);
    });

    it('should map OVERDUE status correctly', () => {
      // Act
      const result = service['mapAsaasStatus']('OVERDUE');

      // Assert
      expect(result).toBe(PaymentStatus.OVERDUE);
    });

    it('should map unknown status to PENDING', () => {
      // Act
      const result = service['mapAsaasStatus']('UNKNOWN_STATUS');

      // Assert
      expect(result).toBe(PaymentStatus.PENDING);
    });
  });

  describe('getOrCreateAsaasCustomer', () => {
    const mockPatient = {
      id: 1,
      user: {
        name: 'Test Patient',
        email: 'patient@test.com',
      },
      cpf: '12345678901',
      phone: '11999999999',
      asaasId: null,
    };

    it('should return existing customer ID if available', async () => {
      // Arrange
      const patientWithAsaasId = {
        ...mockPatient,
        asaasId: 'existing-customer-id',
      };

      // Act
      const result =
        await service['getOrCreateAsaasCustomer'](patientWithAsaasId);

      // Assert
      expect(result).toEqual({ id: 'existing-customer-id' });
      expect(mockAsaasService.createCustomer).not.toHaveBeenCalled();
      expect(mockPrismaService.patient.update).not.toHaveBeenCalled();
    });

    it('should create new customer and update patient when asaasId is null', async () => {
      // Arrange
      const newCustomerId = 'new-customer-id';
      mockAsaasService.createCustomer.mockResolvedValue({ id: newCustomerId });

      // Act
      const result = await service['getOrCreateAsaasCustomer'](mockPatient);

      // Assert
      expect(result).toEqual({ id: newCustomerId });
      expect(mockAsaasService.createCustomer).toHaveBeenCalledWith({
        name: mockPatient.user.name,
        email: mockPatient.user.email,
        cpfCnpj: mockPatient.cpf,
        phone: mockPatient.phone,
      });
      expect(mockPrismaService.patient.update).toHaveBeenCalledWith({
        where: { id: mockPatient.id },
        data: { asaasId: newCustomerId },
      });
    });

    it('should handle errors when creating customer', async () => {
      // Arrange
      mockAsaasService.createCustomer.mockRejectedValue(
        new Error('ASAAS API Error'),
      );

      // Act & Assert
      await expect(
        service['getOrCreateAsaasCustomer'](mockPatient),
      ).rejects.toThrow();
    });
  });
});
