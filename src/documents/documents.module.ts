// src/documents/documents.module.ts

import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { DocumentStorageService } from './services/document-storage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleDocsService } from './services/google-docs.service'; // Importar o GoogleDocsService
import { PdfService } from './services/pdf.service'; // Importar o PdfService
import { GoogleCloudStorageService } from './services/google-cloud-storage.service'; // Importar o GoogleCloudStorageService

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [
    PdfGeneratorService,
    DocumentStorageService,
    GoogleDocsService, // Adicionar o GoogleDocsService aos providers
    PdfService, // Adicionar o PdfService aos providers
    GoogleCloudStorageService, // Adicionar o GoogleCloudStorageService aos providers
  ],
  exports: [PdfGeneratorService, DocumentStorageService],
})
export class DocumentsModule {}
