// test/integration/payments/payments.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { AuthService } from '../../../src/auth/auth.service';

describe('Payments Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;
  let accessToken: string;

  interface TestData {
    clinic?: any;
    patient?: any;
    psychologist?: any;
    appointment?: any;
  }

  const testData: TestData = {};

  const mockTenantId = 'test-tenant';
  const mockUser = {
    email: 'test@example.com',
    password: 'Test@123',
    name: 'Test User',
    role: Role.MASTER,
  };

  const mockCreatePaymentDto = {
    appointmentId: 0, // Será atualizado após setup
    amount: 200,
    method: PaymentMethod.PIX,
    dueDate: new Date().toISOString(),
    notes: 'Test payment',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);

    await app.init();

    // Setup: Create test user and get access token
    const user = await prismaService.user.create({
      data: {
        ...mockUser,
        tenantId: mockTenantId,
      },
    });

    const auth = await authService.login(user);
    accessToken = auth.accessToken;

    // Setup: Create test data
    await setupTestData();

    // Atualizar o appointmentId com o valor correto
    mockCreatePaymentDto.appointmentId = testData.appointment.id;
  });

  const setupTestData = async () => {
    // Create test clinic
    testData.clinic = await prismaService.clinic.create({
      data: {
        user: {
          create: {
            email: 'clinic@test.com',
            password: 'Test@123',
            name: 'Test Clinic',
            role: Role.CLINIC,
            tenantId: mockTenantId,
          },
        },
        name: 'Test Clinic',
        address: 'Test Address',
        phone: '11999999999',
        tenantId: mockTenantId,
      },
    });

    // Create test patient
    testData.patient = await prismaService.patient.create({
      data: {
        user: {
          create: {
            email: 'patient@test.com',
            password: 'Test@123',
            name: 'Test Patient',
            role: Role.PATIENT,
            tenantId: mockTenantId,
          },
        },
        cpf: '12345678901',
        address: 'Test Address',
        phone: '11999999999',
        tenantId: mockTenantId,
      },
    });

    // Create test psychologist
    testData.psychologist = await prismaService.psychologist.create({
      data: {
        user: {
          create: {
            email: 'psychologist@test.com',
            password: 'Test@123',
            name: 'Test Psychologist',
            role: Role.PSYCHOLOGIST,
            tenantId: mockTenantId,
          },
        },
        cpf: '98765432101',
        crp: '12345',
        address: 'Test Address',
        phone: '11999999999',
        clinic: {
          connect: { id: testData.clinic.id },
        },
        tenantId: mockTenantId,
      },
    });

    // Create test appointment
    testData.appointment = await prismaService.appointment.create({
      data: {
        patient: { connect: { id: testData.patient.id } },
        psychologist: { connect: { id: testData.psychologist.id } },
        dateTime: new Date(),
        duration: 50,
        value: 200,
        status: 'SCHEDULED',
        tenantId: mockTenantId,
      },
    });
  };
  afterAll(async () => {
    // Cleanup: Remove test data in correct order to avoid foreign key constraints
    await prismaService.payment.deleteMany({
      where: { tenantId: mockTenantId },
    });
    await prismaService.appointment.deleteMany({
      where: { tenantId: mockTenantId },
    });
    await prismaService.patient.deleteMany({
      where: { tenantId: mockTenantId },
    });
    await prismaService.psychologist.deleteMany({
      where: { tenantId: mockTenantId },
    });
    await prismaService.clinic.deleteMany({
      where: { tenantId: mockTenantId },
    });
    await prismaService.user.deleteMany({
      where: { tenantId: mockTenantId },
    });

    await app.close();
  });

  describe('POST /payments', () => {
    it('should create a new payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(mockCreatePaymentDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject({
            appointmentId: mockCreatePaymentDto.appointmentId,
            amount: mockCreatePaymentDto.amount,
            method: mockCreatePaymentDto.method,
            status: PaymentStatus.PENDING,
          });
        });
    });

    it('should fail if appointment does not exist', () => {
      const invalidDto = {
        ...mockCreatePaymentDto,
        appointmentId: 999,
      };

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(invalidDto)
        .expect(404);
    });
  });

  describe('GET /payments', () => {
    beforeEach(async () => {
      // Create test payments
      await prismaService.payment.create({
        data: {
          appointment: { connect: { id: testData.appointment.id } },
          amount: 200,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PENDING,
          dueDate: new Date(),
          tenantId: mockTenantId,
        },
      });
    });

    it('should return list of payments', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    it('should filter payments by status', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .query({ status: PaymentStatus.PENDING })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          res.body.forEach((payment) => {
            expect(payment.status).toBe(PaymentStatus.PENDING);
          });
        });
    });
  });

  describe('GET /payments/:id', () => {
    let testPaymentId: number;

    beforeEach(async () => {
      // Create a test payment
      const payment = await prismaService.payment.create({
        data: {
          appointment: { connect: { id: testData.appointment.id } },
          amount: 200,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PENDING,
          dueDate: new Date(),
          tenantId: mockTenantId,
        },
      });
      testPaymentId = payment.id;
    });

    it('should return payment by id', () => {
      return request(app.getHttpServer())
        .get(`/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testPaymentId);
        });
    });

    it('should return 404 for non-existent payment', () => {
      return request(app.getHttpServer())
        .get('/payments/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(404);
    });
  });
  describe('POST /payments/batch', () => {
    it('should create multiple payments', () => {
      const batchPayments = [
        mockCreatePaymentDto,
        {
          ...mockCreatePaymentDto,
          amount: 300,
          notes: 'Second test payment',
        },
      ];

      return request(app.getHttpServer())
        .post('/payments/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(batchPayments)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBeTruthy();
          expect(Array.isArray(res.body.results)).toBeTruthy();
          expect(res.body.results).toHaveLength(2);
        });
    });

    it('should handle partial failures in batch creation', () => {
      const batchPayments = [
        mockCreatePaymentDto,
        {
          ...mockCreatePaymentDto,
          appointmentId: 999, // Non-existent appointment
        },
      ];

      return request(app.getHttpServer())
        .post('/payments/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(batchPayments)
        .expect(400);
    });
  });

  describe('GET /payments/stats', () => {
    beforeEach(async () => {
      // Create test payments for stats
      await prismaService.payment.createMany({
        data: [
          {
            appointmentId: testData.appointment.id,
            amount: 200,
            method: PaymentMethod.PIX,
            status: PaymentStatus.PAID,
            dueDate: new Date(),
            tenantId: mockTenantId,
            paidAt: new Date(),
          },
          {
            appointmentId: testData.appointment.id,
            amount: 300,
            method: PaymentMethod.CREDIT_CARD,
            status: PaymentStatus.PENDING,
            dueDate: new Date(),
            tenantId: mockTenantId,
          },
          {
            appointmentId: testData.appointment.id,
            amount: 150,
            method: PaymentMethod.BOLETO,
            status: PaymentStatus.OVERDUE,
            dueDate: new Date(),
            tenantId: mockTenantId,
          },
        ],
      });
    });

    it('should return payment statistics', () => {
      return request(app.getHttpServer())
        .get('/payments/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('byStatus');
          expect(res.body).toHaveProperty('byMethod');
          expect(res.body.byStatus).toHaveProperty('PAID');
          expect(res.body.byStatus).toHaveProperty('PENDING');
          expect(res.body.byStatus).toHaveProperty('OVERDUE');
        });
    });

    it('should return filtered statistics by date range', () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      return request(app.getHttpServer())
        .get('/payments/stats')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('totalAmount');
        });
    });
  });

  describe('GET /payments/report', () => {
    it('should generate a payment report', () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      return request(app.getHttpServer())
        .get('/payments/report')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('period');
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('summary');
          expect(res.body.period).toHaveProperty('startDate');
          expect(res.body.period).toHaveProperty('endDate');
        });
    });

    it('should validate date range parameters', () => {
      return request(app.getHttpServer())
        .get('/payments/report')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(400); // Should fail without dates
    });
  });
  describe('Authorization tests', () => {
    let patientToken: string;
    let psychologistToken: string;

    beforeAll(async () => {
      // Create tokens for different roles
      const patient = await prismaService.user.findFirst({
        where: { role: Role.PATIENT },
      });
      const psychologist = await prismaService.user.findFirst({
        where: { role: Role.PSYCHOLOGIST },
      });

      const patientAuth = await authService.login(patient);
      const psychologistAuth = await authService.login(psychologist);

      patientToken = patientAuth.accessToken;
      psychologistToken = psychologistAuth.accessToken;
    });

    it('should restrict payment creation to authorized roles', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(mockCreatePaymentDto)
        .expect(403);
    });

    it('should allow psychologists to view their own payments', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${psychologistToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    it('should restrict access to payment statistics', () => {
      return request(app.getHttpServer())
        .get('/payments/stats')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(403);
    });
  });

  describe('Tenant isolation tests', () => {
    const otherTenantId = 'other-tenant';
    let otherTenantPayment: any;

    beforeAll(async () => {
      // Create payment in different tenant
      otherTenantPayment = await prismaService.payment.create({
        data: {
          appointment: { connect: { id: testData.appointment.id } },
          amount: 200,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PENDING,
          dueDate: new Date(),
          tenantId: otherTenantId,
        },
      });
    });

    it('should not allow access to payments from different tenant', () => {
      return request(app.getHttpServer())
        .get(`/payments/${otherTenantPayment.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(404);
    });

    it('should only return payments for current tenant', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          res.body.forEach((payment) => {
            expect(payment.tenantId).toBe(mockTenantId);
          });
        });
    });
  });

  describe('Payment with splits', () => {
    const splitTestData = {
      clinic: null,
      psychologist: null,
    };

    beforeAll(async () => {
      // Create clinic for split tests
      splitTestData.clinic = await prismaService.clinic.create({
        data: {
          user: {
            create: {
              email: 'split-clinic@test.com',
              password: 'Test@123',
              name: 'Split Test Clinic',
              role: Role.CLINIC,
              tenantId: mockTenantId,
            },
          },
          name: 'Split Test Clinic',
          address: 'Test Address',
          phone: '11999999999',
          tenantId: mockTenantId,
        },
      });

      // Create psychologist for split tests
      splitTestData.psychologist = await prismaService.psychologist.create({
        data: {
          user: {
            create: {
              email: 'split-psych@test.com',
              password: 'Test@123',
              name: 'Split Test Psychologist',
              role: Role.PSYCHOLOGIST,
              tenantId: mockTenantId,
            },
          },
          cpf: '11122233344',
          crp: '54321',
          address: 'Test Address',
          phone: '11999999999',
          clinic: {
            connect: { id: splitTestData.clinic.id },
          },
          tenantId: mockTenantId,
        },
      });
    });
    it('should create payment with splits', () => {
      const paymentWithSplits = {
        ...mockCreatePaymentDto,
        splits: [
          {
            receiverId: splitTestData.psychologist.id,
            percentage: 70,
          },
          {
            receiverId: splitTestData.clinic.id,
            percentage: 30,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(paymentWithSplits)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('paymentSplits');
          expect(res.body.paymentSplits).toHaveLength(2);
          expect(res.body.paymentSplits[0].percentage).toBe(70);
          expect(res.body.paymentSplits[1].percentage).toBe(30);
        });
    });

    it('should reject splits with total percentage over 100', () => {
      const invalidSplits = {
        ...mockCreatePaymentDto,
        splits: [
          {
            receiverId: splitTestData.psychologist.id,
            percentage: 80,
          },
          {
            receiverId: splitTestData.clinic.id,
            percentage: 30,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(invalidSplits)
        .expect(400);
    });
  });

  describe('Payment lifecycle tests', () => {
    let lifecyclePayment: any;

    beforeEach(async () => {
      // Create payment for lifecycle testing
      lifecyclePayment = await prismaService.payment.create({
        data: {
          appointment: { connect: { id: testData.appointment.id } },
          amount: 200,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PENDING,
          dueDate: new Date(),
          tenantId: mockTenantId,
        },
      });
    });

    it('should handle payment confirmation webhook', () => {
      const webhookData = {
        payment: {
          id: lifecyclePayment.id,
          status: 'CONFIRMED',
          paymentDate: new Date().toISOString(),
        },
      };

      return request(app.getHttpServer())
        .post('/payments/webhook')
        .send(webhookData)
        .expect(200)
        .then(async () => {
          const updatedPayment = await prismaService.payment.findUnique({
            where: { id: lifecyclePayment.id },
          });
          expect(updatedPayment.status).toBe(PaymentStatus.CONFIRMED);
          expect(updatedPayment.paidAt).toBeDefined();
        });
    });

    it('should handle payment overdue status', () => {
      const webhookData = {
        payment: {
          id: lifecyclePayment.id,
          status: 'OVERDUE',
        },
      };

      return request(app.getHttpServer())
        .post('/payments/webhook')
        .send(webhookData)
        .expect(200)
        .then(async () => {
          const updatedPayment = await prismaService.payment.findUnique({
            where: { id: lifecyclePayment.id },
          });
          expect(updatedPayment.status).toBe(PaymentStatus.OVERDUE);
        });
    });
  });

  describe('Payment filtering and pagination', () => {
    beforeAll(async () => {
      // Create multiple payments for testing filters and pagination
      const testPayments = Array.from({ length: 15 }, (_, i) => ({
        appointmentId: testData.appointment.id,
        amount: 100 + i * 50,
        method: i % 2 === 0 ? PaymentMethod.PIX : PaymentMethod.CREDIT_CARD,
        status:
          i % 3 === 0
            ? PaymentStatus.PAID
            : i % 3 === 1
              ? PaymentStatus.PENDING
              : PaymentStatus.OVERDUE,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        tenantId: mockTenantId,
      }));

      for (const payment of testPayments) {
        await prismaService.payment.create({ data: payment });
      }
    });

    it('should return paginated results', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          expect(res.body).toHaveLength(5);
        });
    });

    it('should filter by payment method', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .query({ method: PaymentMethod.PIX })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          res.body.forEach((payment) => {
            expect(payment.method).toBe(PaymentMethod.PIX);
          });
        });
    });

    it('should filter by date range', () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      return request(app.getHttpServer())
        .get('/payments')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          res.body.forEach((payment) => {
            const paymentDate = new Date(payment.dueDate);
            expect(
              paymentDate >= startDate && paymentDate <= endDate,
            ).toBeTruthy();
          });
        });
    });
  });
});
