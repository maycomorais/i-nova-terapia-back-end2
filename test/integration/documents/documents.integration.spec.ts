// test/integration/documents/documents.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { DocumentType, DocumentFormat, Role } from '@prisma/client';
import { AuthService } from '../../../src/auth/auth.service';

describe('Documents Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;
  let accessToken: string;

  interface TestData {
    clinic?: any;
    patient?: any;
    psychologist?: any;
    document?: any;
  }

  const testData: TestData = {};

  const mockTenantId = 'test-tenant';
  const mockUser = {
    email: 'test@example.com',
    password: 'Test@123',
    name: 'Test User',
    role: Role.MASTER,
  };

  const mockGenerateDocumentDto = {
    type: DocumentType.PATIENT_LIST,
    format: DocumentFormat.PDF,
    filters: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
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

    // Create test document
    testData.document = await prismaService.document.create({
      data: {
        type: DocumentType.PATIENT_LIST,
        format: DocumentFormat.PDF,
        url: 'documents/test.pdf',
        data: {},
        userId: testData.patient.user.id,
        tenantId: mockTenantId,
      },
    });
  };

  afterAll(async () => {
    // Cleanup: Remove test data
    await prismaService.document.deleteMany({
      where: { tenantId: mockTenantId },
    });
    await prismaService.patient.deleteMany({
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
  describe('POST /documents', () => {
    it('should generate a document', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(mockGenerateDocumentDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject({
            type: mockGenerateDocumentDto.type,
            format: mockGenerateDocumentDto.format,
            userId: expect.any(Number),
            tenantId: mockTenantId,
          });
          expect(res.body.url).toBeDefined();
        });
    });

    it('should fail with invalid document type', () => {
      const invalidDto = {
        ...mockGenerateDocumentDto,
        type: 'INVALID_TYPE',
      };

      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(invalidDto)
        .expect(400);
    });

    it('should fail with invalid format', () => {
      const invalidDto = {
        ...mockGenerateDocumentDto,
        format: 'INVALID_FORMAT',
      };

      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /documents', () => {
    it('should return list of documents', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('type');
          expect(res.body[0]).toHaveProperty('url');
        });
    });

    it('should filter documents by type', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .query({ type: DocumentType.PATIENT_LIST })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          res.body.forEach((doc) => {
            expect(doc.type).toBe(DocumentType.PATIENT_LIST);
          });
        });
    });
  });

  describe('GET /documents/:id', () => {
    it('should return a document by id', () => {
      return request(app.getHttpServer())
        .get(`/documents/${testData.document.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testData.document.id);
          expect(res.body.type).toBe(testData.document.type);
          expect(res.body.url).toBe(testData.document.url);
        });
    });

    it('should return 404 for non-existent document', () => {
      return request(app.getHttpServer())
        .get('/documents/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(404);
    });
  });

  describe('Authorization tests', () => {
    let patientToken: string;

    beforeAll(async () => {
      const patient = await prismaService.user.findFirst({
        where: { role: Role.PATIENT },
      });
      const patientAuth = await authService.login(patient);
      patientToken = patientAuth.accessToken;
    });

    it('should restrict document generation to authorized roles', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('x-tenant-id', mockTenantId)
        .send(mockGenerateDocumentDto)
        .expect(403);
    });

    it('should allow patients to view their own documents', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          res.body.forEach((doc) => {
            expect(doc.userId).toBe(testData.patient.userId);
          });
        });
    });
  });

  describe('Tenant isolation tests', () => {
    const otherTenantId = 'other-tenant';

    beforeAll(async () => {
      // Create document in different tenant
      await prismaService.document.create({
        data: {
          type: DocumentType.PATIENT_LIST,
          format: DocumentFormat.PDF,
          url: 'documents/other-tenant.pdf',
          data: {},
          userId: testData.patient.user.id,
          tenantId: otherTenantId,
        },
      });
    });

    it('should only return documents for current tenant', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          res.body.forEach((doc) => {
            expect(doc.tenantId).toBe(mockTenantId);
          });
        });
    });

    it('should not allow access to documents from different tenant', async () => {
      const otherTenantDoc = await prismaService.document.findFirst({
        where: { tenantId: otherTenantId },
      });

      return request(app.getHttpServer())
        .get(`/documents/${otherTenantDoc.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', mockTenantId)
        .expect(404);
    });
  });
});
