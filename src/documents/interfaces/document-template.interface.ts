// src/documents/interfaces/document-template.interface.ts
export interface IDocumentTemplate {
  getTemplate(): string | Promise<string>;
  getStyles?(): string | Promise<string>;
  getScripts?(): string | Promise<string>;
}
