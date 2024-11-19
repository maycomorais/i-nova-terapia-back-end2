// src/documents/documents.module.ts
import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { DocumentStorageService } from './services/document-storage.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [PdfGeneratorService, DocumentStorageService],
  exports: [PdfGeneratorService, DocumentStorageService],
})
export class DocumentsModule {}
