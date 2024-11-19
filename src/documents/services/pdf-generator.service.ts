// src/documents/services/pdf-generator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  IDocumentGenerator,
  IDocumentGeneratorParams,
  IDocumentGeneratorResult,
} from '../interfaces';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from 'src/prisma/prisma.service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DocumentType, DocumentFormat } from '@prisma/client';
import { DocumentStorageService } from './document-storage.service';

@Injectable()
export class PdfGeneratorService implements IDocumentGenerator {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageService,
  ) {}

  supports(type: DocumentType, format: DocumentFormat): boolean {
    return format === DocumentFormat.PDF;
  }

  async generateDocument(
    params: IDocumentGeneratorParams,
  ): Promise<IDocumentGeneratorResult> {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      // Coletar chunks do PDF
      doc.on('data', chunks.push.bind(chunks));

      // Adicionar conteúdo ao PDF
      await this.addContent(doc, params);

      // Finalizar o documento
      doc.end();

      // Combinar chunks em um único buffer
      const pdfBuffer = Buffer.concat(chunks);

      // Armazenar o PDF
      const fileName = `${params.type.toLowerCase()}-${Date.now()}.pdf`;
      const fileUrl = await this.storage.store(fileName, pdfBuffer, {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        generatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        url: fileUrl,
        data: {
          generatedAt: new Date(),
          type: params.type,
          format: 'PDF',
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async addContent(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    switch (params.type) {
      case 'PATIENT_LIST':
        await this.addPatientList(doc, params);
        break;
      case 'PSYCHOLOGIST_LIST':
        await this.addPsychologistList(doc, params);
        break;
      case 'FINANCIAL_REPORT':
        await this.addFinancialReport(doc, params);
        break;
      case 'MOOD_DIARY_REPORT':
        await this.addMoodDiaryReport(doc, params);
        break;
      default:
        throw new Error(`Tipo de documento não suportado: ${params.type}`);
    }
  }

  private async addPatientList(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    const patients = await this.prisma.patient.findMany({
      where: {
        tenantId: params.tenantId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        psychologist: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Cabeçalho
    doc.fontSize(20).text('Lista de Pacientes', { align: 'center' });
    doc.moveDown();

    // Data do relatório
    doc
      .fontSize(12)
      .text(
        `Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
        { align: 'right' },
      );
    doc.moveDown();

    // Lista de pacientes
    patients.forEach((patient) => {
      doc.fontSize(14).text(patient.user.name);
      doc
        .fontSize(10)
        .text(`Email: ${patient.user.email}`)
        .text(`Telefone: ${patient.user.phone || 'Não informado'}`)
        .text(`CPF: ${patient.cpf}`)
        .text(
          `Psicólogo: ${patient.psychologist?.user.name || 'Não atribuído'}`,
        );
      doc.moveDown();
    });

    // Rodapé
    doc
      .fontSize(10)
      .text(
        `Total de pacientes: ${patients.length}`,
        50,
        doc.page.height - 50,
        { align: 'center' },
      );
  }

  private async addPsychologistList(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    const psychologists = await this.prisma.psychologist.findMany({
      where: {
        tenantId: params.tenantId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        clinic: true,
        patients: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    // Cabeçalho
    doc.fontSize(20).text('Lista de Psicólogos', { align: 'center' });
    doc.moveDown();

    // Data do relatório
    doc
      .fontSize(12)
      .text(
        `Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
        { align: 'right' },
      );
    doc.moveDown();

    // Lista de psicólogos
    psychologists.forEach((psych, index) => {
      if (index > 0) doc.moveDown(0.5);

      doc.fontSize(14).text(psych.user.name, { underline: true });
      doc
        .fontSize(10)
        .text(`Email: ${psych.user.email}`)
        .text(`Telefone: ${psych.user.phone || 'Não informado'}`)
        .text(`CRP: ${psych.crp}`)
        .text(`CPF: ${psych.cpf}`)
        .text(`Endereço: ${psych.address}`)
        .text(`Clínica: ${psych.clinic?.name || 'Autônomo'}`)
        .text(`Total de pacientes: ${psych.patients.length}`);

      // Lista de pacientes se houver
      if (psych.patients.length > 0) {
        doc.moveDown(0.5).text('Pacientes:', { underline: true });
        psych.patients.forEach((patient) => {
          doc.text(`- ${patient.user.name}`);
        });
      }
    });

    // Rodapé
    const currentDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
    doc
      .fontSize(8)
      .text(`Documento gerado em ${currentDate}`, 50, doc.page.height - 50, {
        align: 'center',
      });
  }

  private async addFinancialReport(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    const startDate = params.filters?.startDate
      ? new Date(params.filters.startDate)
      : undefined;
    const endDate = params.filters?.endDate
      ? new Date(params.filters.endDate)
      : undefined;

    // Buscar pagamentos no período
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId: params.tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        appointment: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
            psychologist: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Buscar despesas no período
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId: params.tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Cabeçalho
    doc.fontSize(20).text('Relatório Financeiro', { align: 'center' });
    doc.moveDown();

    // Período do relatório
    doc
      .fontSize(12)
      .text(
        `Período: ${format(startDate || new Date(), 'dd/MM/yyyy')} a ${format(
          endDate || new Date(),
          'dd/MM/yyyy',
        )}`,
        { align: 'right' },
      );
    doc.moveDown();

    // Resumo
    const totalReceitas = payments.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0,
    );
    const totalDespesas = expenses.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0,
    );
    const saldo = totalReceitas - totalDespesas;

    doc.fontSize(14).text('Resumo Financeiro', { underline: true });
    doc
      .fontSize(12)
      .text(`Total de Receitas: R$ ${totalReceitas.toFixed(2)}`)
      .text(`Total de Despesas: R$ ${totalDespesas.toFixed(2)}`)
      .text(`Saldo: R$ ${saldo.toFixed(2)}`, {
        align: 'left',
        continued: false,
      });
    doc.moveDown();

    // Detalhamento de Receitas
    doc.fontSize(14).text('Detalhamento de Receitas', { underline: true });
    payments.forEach((payment) => {
      doc
        .fontSize(10)
        .text(`Data: ${format(payment.createdAt, 'dd/MM/yyyy')}`)
        .text(`Paciente: ${payment.appointment.patient.user.name}`)
        .text(`Psicólogo: ${payment.appointment.psychologist.user.name}`)
        .text(`Valor: R$ ${Number(payment.amount).toFixed(2)}`)
        .text(`Status: ${payment.status}`)
        .moveDown(0.5);
    });

    // Detalhamento de Despesas
    doc.fontSize(14).text('Detalhamento de Despesas', { underline: true });
    expenses.forEach((expense) => {
      doc
        .fontSize(10)
        .text(`Data: ${format(expense.createdAt, 'dd/MM/yyyy')}`)
        .text(`Categoria: ${expense.category}`)
        .text(`Descrição: ${expense.description}`)
        .text(`Valor: R$ ${Number(expense.amount).toFixed(2)}`)
        .moveDown(0.5);
    });

    // Rodapé
    const currentDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
    doc
      .fontSize(8)
      .text(`Documento gerado em ${currentDate}`, 50, doc.page.height - 50, {
        align: 'center',
      });
  }

  private async addMoodDiaryReport(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    if (!params.filters?.patientId) {
      throw new Error('ID do paciente é obrigatório para relatório de humor');
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: params.filters.patientId,
        tenantId: params.tenantId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        moodDiaries: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!patient) {
      throw new Error('Paciente não encontrado');
    }

    // Cabeçalho
    doc.fontSize(20).text('Relatório de Humor', { align: 'center' });
    doc.moveDown();

    // Informações do paciente
    doc
      .fontSize(14)
      .text(`Paciente: ${patient.user.name}`)
      .text(`Email: ${patient.user.email}`);
    doc.moveDown();

    // Lista de registros
    patient.moodDiaries.forEach((entry, index) => {
      if (index > 0) doc.moveDown(0.5);

      doc
        .fontSize(12)
        .text(format(entry.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }));

      // Nível de humor (1-5)
      const moodText = '😞 😟 😐 🙂 😊'.split(' ')[entry.mood - 1];
      doc
        .fontSize(10)
        .text(`Humor: ${entry.mood}/5 ${moodText}`)
        .text(`Observações: ${entry.notes || 'Nenhuma observação'}`);
    });

    // Estatísticas
    doc.moveDown();
    const avgMood =
      patient.moodDiaries.reduce((acc, curr) => acc + curr.mood, 0) /
      patient.moodDiaries.length;
    doc
      .fontSize(12)
      .text('Estatísticas:', { underline: true })
      .text(`Total de registros: ${patient.moodDiaries.length}`)
      .text(`Média de humor: ${avgMood.toFixed(2)}/5`);

    // Rodapé
    const currentDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
    doc
      .fontSize(8)
      .text(`Documento gerado em ${currentDate}`, 50, doc.page.height - 50, {
        align: 'center',
      });
  }
}
