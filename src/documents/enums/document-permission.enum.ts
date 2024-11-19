// src/documents/enums/document-permission.enum.ts
export enum DocumentPermission {
  PRIVATE = 'PRIVATE', // Apenas o criador pode ver
  RESTRICTED = 'RESTRICTED', // Criador e outros roles específicos
  PUBLIC = 'PUBLIC', // Qualquer usuário do tenant pode ver
}
