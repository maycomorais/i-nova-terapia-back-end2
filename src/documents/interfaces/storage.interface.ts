// src/documents/interfaces/storage.interface.ts
export interface IDocumentStorage {
  save(data: Buffer, filename: string): Promise<string>;
  delete(url: string): Promise<void>;
  exists(url: string): Promise<boolean>;
}
