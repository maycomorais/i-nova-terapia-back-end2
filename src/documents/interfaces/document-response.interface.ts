// src/documents/interfaces/document-response.interface.ts
import {
  DocumentStatus,
  DocumentType,
  DocumentFormat,
  DocumentPermission,
} from '../enums';

export interface IDocumentResponse {
  id: number;
  type: DocumentType;
  format: DocumentFormat;
  status: DocumentStatus;
  permission: DocumentPermission;
  url?: string;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  tenantId: string;
}
