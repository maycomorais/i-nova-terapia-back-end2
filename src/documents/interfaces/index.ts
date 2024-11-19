// src/documents/interfaces/index.ts
import { DocumentType, DocumentFormat } from '@prisma/client';

export interface IDocumentGenerator {
  generateDocument(
    params: IDocumentGeneratorParams,
  ): Promise<IDocumentGeneratorResult>;
  supports(type: DocumentType, format: DocumentFormat): boolean;
}

export interface IDocumentGeneratorParams {
  type: DocumentType;
  format: DocumentFormat;
  filters?: any;
  tenantId: string;
  userId: number;
}

export interface IDocumentGeneratorResult {
  success: boolean;
  url?: string;
  error?: string;
  data?: any;
}

export * from './document.interfaces';
