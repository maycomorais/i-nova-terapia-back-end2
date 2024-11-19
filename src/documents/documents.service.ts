// src/documents/documents.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { CacheService } from '../common/cache/cache.service';
import { DocumentType, DocumentFormat, DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly cacheService: CacheService,
  ) {}

  // Implementação virá em seguida
}
