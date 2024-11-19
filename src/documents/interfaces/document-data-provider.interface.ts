import { IDocumentGeneratorParams } from './document-generator.interface';

// src/documents/interfaces/document-data-provider.interface.ts
export interface IDocumentDataProvider {
  getData(params: IDocumentGeneratorParams): Promise<any>;
}
