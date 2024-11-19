// src/documents/interfaces/template.interface.ts
export interface IDocumentTemplate {
  name: string;
  getTemplate(): string | Promise<string>;
  getStyles?(): string | Promise<string>;
  getScripts?(): string | Promise<string>;
}
