// src/documents/services/google-cloud-storage.service.ts

import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GoogleCloudStorageService {
  private storage: Storage;

  constructor() {
    // Carregar as credenciais do arquivo JSON (inserindo as credenciais diretamente)
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    this.storage = new Storage({ credentials }); // Inicializar o Storage com as credenciais
  }

  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<string> {
    // Obter o bucket do Google Cloud Storage
    const bucketName = process.env.GCS_BUCKET_NAME;
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Fazer upload do arquivo para o bucket
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/pdf', // Definir o tipo de conteúdo como PDF
      },
    });

    // Retornar a URL pública do arquivo
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
  }
}
