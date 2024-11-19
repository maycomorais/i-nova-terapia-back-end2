// src/documents/services/document-storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DocumentMetadata,
  IDocumentStorage,
} from '../interfaces/document-storage.interface';

@Injectable()
export class DocumentStorageService implements IDocumentStorage {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly baseDir = 'uploads/documents';

  constructor() {
    this.ensureDirectoryExists(this.baseDir);
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async store(
    fileName: string,
    content: Buffer,
    metadata?: Record<string, any>,
  ): Promise<string> {
    try {
      const tenantId = metadata?.tenantId || 'default';
      const tenantDir = path.join(this.baseDir, tenantId);
      await this.ensureDirectoryExists(tenantDir);

      const timestamp = new Date().getTime();
      const safeFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(tenantDir, safeFileName);

      await fs.writeFile(filePath, content);

      const documentMetadata: DocumentMetadata = {
        fileName: safeFileName,
        createdAt: new Date().toISOString(),
        tenantId: metadata?.tenantId,
        userId: metadata?.userId,
        type: metadata?.type,
        ...metadata,
      };

      const metadataPath = `${filePath}.meta.json`;
      await fs.writeFile(
        metadataPath,
        JSON.stringify(documentMetadata, null, 2),
      );

      return filePath;
    } catch (error) {
      this.logger.error(`Erro ao armazenar documento: ${error.message}`);
      throw new Error(`Erro ao armazenar documento: ${error.message}`);
    }
  }

  async get(fileUrl: string): Promise<Buffer> {
    try {
      const filePath = path.resolve(fileUrl);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Erro ao recuperar documento: ${error.message}`);
      throw new Error(`Documento não encontrado: ${fileUrl}`);
    }
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      const filePath = path.resolve(fileUrl);
      await fs.unlink(filePath);

      try {
        const metadataPath = `${filePath}.meta.json`;
        await fs.unlink(metadataPath);
      } catch {
        // Ignora se não houver arquivo de metadata
      }
    } catch (error) {
      this.logger.error(`Erro ao remover documento: ${error.message}`);
      throw new Error(`Erro ao remover documento: ${fileUrl}`);
    }
  }

  async getMetadata(fileUrl: string): Promise<DocumentMetadata | null> {
    try {
      const metadataPath = `${fileUrl}.meta.json`;
      const content = await fs.readFile(metadataPath, 'utf-8');
      const data = JSON.parse(content);

      const metadata: DocumentMetadata = {
        fileName: data.fileName,
        createdAt: data.createdAt,
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        ...data,
      };

      return metadata;
    } catch {
      return null;
    }
  }
}
