// src/documents/services/google-docs.service.ts

import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PdfService } from './pdf.service';
import { GoogleCloudStorageService } from './google-cloud-storage.service';

@Injectable()
export class GoogleDocsService {
  private auth: OAuth2Client;

  constructor(
    private readonly pdfService: PdfService,
    private readonly storageService: GoogleCloudStorageService,
  ) {
    // Carregar as credenciais do arquivo JSON
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    // Autenticar o cliente usando as credenciais e escopos da API
    google.auth
      .getClient({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/documents'],
      })
      .then((auth) => {
        // Especificar o tipo OAuth2Client para evitar erros de compilação
        this.auth = auth as OAuth2Client; // Armazenar o cliente autenticado na variável this.auth
      });
  }

  async createDocumentFromTemplate(
    templateId: string,
    data: any,
  ): Promise<string> {
    // Criar uma instância da API do Google Docs com o cliente autenticado
    const docs = google.docs({ version: 'v1', auth: this.auth });

    try {
      // 1. Criar uma cópia do template
      const {
        data: { documentId },
      } = await docs.documents.create({
        requestBody: {
          // name: 'Novo Documento', // O nome do documento é definido na requisição de cópia
        },
      });

      // 2. Preencher o documento com os dados
      await this.populateDocument(documentId, data);

      // 3. Obter o conteúdo do documento em HTML
      const {
        data: {
          body: { content },
        },
      } = await docs.documents.get({
        documentId: documentId,
      });

      // 4. Extrair o HTML do conteúdo
      const html = this.extractHtmlFromContent(content);

      // 5. Gerar o PDF usando o PdfService
      const pdfBuffer = await this.pdfService.generatePdf(html);

      // 6. Fazer upload do PDF para o Google Cloud Storage
      const fileUrl = await this.storageService.uploadFile(
        pdfBuffer,
        'nome-do-arquivo.pdf', // Substitua pelo nome desejado
      );

      // 7. Retornar a URL do arquivo
      return fileUrl;
    } catch (error) {
      // Tratar o erro de forma adequada
      console.error('Erro ao criar documento:', error);
      throw error; // Ou retornar um valor padrão/mensagem de erro
    }
  }

  private async populateDocument(documentId: string, data: any): Promise<void> {
    const docs = google.docs({ version: 'v1', auth: this.auth });
    const requests = this.createReplaceRequests(data);

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: requests,
      },
    });
  }

  private createReplaceRequests(data: any): any[] {
    const requests = [];
    for (const key in data) {
      requests.push({
        replaceAllText: {
          containsText: {
            text: `{{${key}}}`,
            matchCase: true,
          },
          replaceText: data[key],
        },
      });
    }
    return requests;
  }

  private extractHtmlFromContent(content: any[]): string {
    let html = '';
    for (const element of content) {
      if (element.paragraph) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun) {
            html += elem.textRun.content;
          }
        }
      }
    }
    return html;
  }
}
