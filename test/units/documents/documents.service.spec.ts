// src/documents/documents.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PdfGeneratorService } from 'src/documents/services/pdf-generator.service';
import { CacheService } from '../../../src/common/cache/cache.service';
import { DocumentType, DocumentFormat } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly cache: CacheService,
  ) {}

  async generateDocument(
    dto: {
      type: DocumentType;
      format: DocumentFormat;
      filters?: any;
    },
    userId: number,
    tenantId: string,
  ) {
    if (!this.pdfGenerator.supports(dto.type, dto.format)) {
      throw new Error('Unsupported document format');
    }

    const result = await this.pdfGenerator.generateDocument({
      ...dto,
      userId,
      tenantId,
    });

    if (!result.success) {
      throw new Error('Failed to generate document');
    }

    return this.prisma.document.create({
      data: {
        type: dto.type,
        format: dto.format,
        url: result.url,
        data: dto.filters || {},
        userId,
        tenantId,
      },
    });
  }

  async findAll(params: { tenantId: string; userId: number }) {
    const cacheKey = `documents:${params.tenantId}:${params.userId}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const documents = await this.prisma.document.findMany({
      where: {
        tenantId: params.tenantId,
      },
    });

    await this.cache.set(cacheKey, documents, 300); // Cache por 5 minutos
    return documents;
  }

  async findOne(id: number, tenantId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async delete(id: number, tenantId: string) {
    await this.findOne(id, tenantId);

    await this.cache.delete(`documents:${tenantId}`);

    return this.prisma.document.delete({
      where: {
        id,
      },
    });
  }
}
