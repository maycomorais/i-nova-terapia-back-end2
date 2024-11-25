// src/documents/interfaces/document.interfaces.ts
import {
  DocumentType,
  DocumentFormat,
  DocumentStatus,
  DocumentPermission,
} from '@prisma/client';

// Interface para metadados do documento
export interface DocumentMetadata {
  id: number;
  type: DocumentType;
  format: DocumentFormat;
  status: DocumentStatus;
  permission: DocumentPermission;
  originalName: string;
  fileName: string;
  createdAt: Date;
  createdById: number;
  tenantId: string;
  version: number;
  hash: string;
  size: number;
  mimeType: string;
  tags?: string[];
}

// Interface para versionamento
export interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
  fileName: string;
  hash: string;
  size: number;
  createdAt: Date;
  createdById: number;
  comment?: string;
}

// Interface para template de documento
export interface DocumentTemplate {
  id: number;
  type: DocumentType;
  name: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  tenantId: string;
}

// Interface para dados de geração de documento
export interface DocumentGenerationData {
  type: DocumentType;
  format: DocumentFormat;
  template?: string;
  data: Record<string, any>;
  options?: DocumentGenerationOptions;
}

// Interface para opções de geração
export interface DocumentGenerationOptions {
  template?: string;
  format?: DocumentFormat;
  orientation?: 'portrait' | 'landscape';
  size?: 'A4' | 'letter' | 'legal';
  margin?:
    | number
    | { top: number; right: number; bottom: number; left: number };
  header?: string | boolean;
  footer?: string | boolean;
  watermark?: string;
  protection?: {
    password?: string;
    permissions?: {
      printing?: boolean;
      modifying?: boolean;
      copying?: boolean;
      annotating?: boolean;
    };
  };
}
