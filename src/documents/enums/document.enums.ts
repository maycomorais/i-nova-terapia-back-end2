// src/documents/enums/document.enums.ts
export enum DocumentAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SHARE = 'SHARE',
  DOWNLOAD = 'DOWNLOAD',
  PRINT = 'PRINT',
}

export enum DocumentCategory {
  FINANCIAL = 'FINANCIAL',
  CLINICAL = 'CLINICAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  LEGAL = 'LEGAL',
}

export enum DocumentProcessingStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
