// src/documents/interfaces/document-storage.interface.ts
export interface DocumentMetadata {
  fileName: string;
  createdAt: string;
  tenantId: string;
  userId: number;
  type: string;
  // Campos opcionais
  [key: string]: any;
}

export interface IDocumentStorage {
  store(
    fileName: string,
    content: Buffer,
    metadata?: Record<string, any>,
  ): Promise<string>;
  get(fileUrl: string): Promise<Buffer>;
  delete(fileUrl: string): Promise<void>;
  getMetadata(fileUrl: string): Promise<DocumentMetadata | null>;
}
