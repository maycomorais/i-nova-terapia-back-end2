// src/documents/services/pdf.service.ts

import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  async generatePdf(html: string): Promise<Buffer> {
    // 1. Iniciar o Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // 2. Definir o conteúdo HTML da página
    await page.setContent(html);

    // 3. Gerar o PDF
    const pdfBuffer = await page.pdf({ format: 'A4' });

    // 4. Fechar o Puppeteer
    await browser.close();

    // 5. Retornar o buffer do PDF
    return Buffer.from(pdfBuffer);
  }
}
