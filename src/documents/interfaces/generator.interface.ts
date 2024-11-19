// src/documents/interfaces/generator.interface.ts

export interface IDocumentGeneratorParams {
  type: string; // Alterado de DocumentType
  format: string; // Alterado de DocumentFormat
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

export interface IDocumentGenerator {
  generateDocument(
    params: IDocumentGeneratorParams,
  ): Promise<IDocumentGeneratorResult>;
  supports(type: string, format: string): boolean; // Alterado para string
}
