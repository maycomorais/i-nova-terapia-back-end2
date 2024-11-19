// src/documents/interfaces/provider.interface.ts
import { IDocumentGeneratorParams } from './generator.interface';

export interface IDocumentDataProvider {
  getData(params: IDocumentGeneratorParams): Promise<any>;
}
