// src/documents/interfaces/document-generator.interface.ts
import { DocumentType, DocumentFormat } from '@prisma/client';

export interface IDocumentGenerator {
  supports(type: DocumentType, format: DocumentFormat): boolean;
  generateDocument(
    params: IDocumentGeneratorParams,
  ): Promise<IDocumentGeneratorResult>;
}

export interface IDocumentGeneratorParams {
  type: DocumentType;
  format: DocumentFormat;
  filters?: Record<string, any>;
  tenantId: string;
  userId: number;
}

export interface IDocumentGeneratorResult {
  success: boolean;
  url?: string;
  error?: string;
  data?: Record<string, any>;
}
