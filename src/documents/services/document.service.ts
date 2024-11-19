// src/documents/services/generators/pdf-generator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import {
  IDocumentGenerator,
  IDocumentGeneratorParams,
  IDocumentGeneratorResult,
} from '../interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PdfGeneratorService implements IDocumentGenerator {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  supports(type: string, format: string): boolean {
    return format === 'PDF';
  }

  async generateDocument(
    params: IDocumentGeneratorParams,
  ): Promise<IDocumentGeneratorResult> {
    try {
      const doc = new PDFDocument({ margin: 50 });

      // Adiciona o conteúdo baseado no tipo de documento
      switch (params.type) {
        case 'PATIENT_LIST':
          await this.generatePatientList(doc, params);
          break;
        case 'PSYCHOLOGIST_LIST':
          await this.generatePsychologistList(doc, params);
          break;
        case 'CLINIC_LIST':
          await this.generateClinicList(doc, params);
          break;
        case 'MOOD_DIARY_REPORT':
          await this.generateMoodDiaryReport(doc, params);
          break;
        case 'FINANCIAL_REPORT':
          await this.generateFinancialReport(doc, params);
          break;
        default:
          throw new Error(`Tipo de documento não suportado: ${params.type}`);
      }

      // TODO: Implementar o armazenamento do PDF
      const filePath = `documents/${params.tenantId}/${Date.now()}.pdf`;

      // Por enquanto, retornamos um resultado simulado
      return {
        success: true,
        url: filePath,
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

  private async generatePatientList(
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
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    // Cabeçalho
    doc.fontSize(20).text('Lista de Pacientes', { align: 'center' });
    doc.moveDown();

    // Data do relatório
    doc
      .fontSize(12)
      .text(`Data: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Tabela de pacientes
    patients.forEach((patient, index) => {
      if (index > 0) doc.moveDown(0.5);

      doc.fontSize(14).text(patient.user.name);
      doc
        .fontSize(10)
        .text(`Email: ${patient.user.email}`)
        .text(`Telefone: ${patient.user.phone || 'Não informado'}`)
        .text(`CPF: ${patient.cpf}`)
        .text(
          `Psicólogo: ${patient.psychologist?.user.name || 'Não atribuído'}`,
        );
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

  private async generatePsychologistList(
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
    });

    // Cabeçalho
    doc.fontSize(20).text('Lista de Psicólogos', { align: 'center' });
    doc.moveDown();

    // Data do relatório
    doc.fontSize(12).text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, {
      align: 'right',
    });
    doc.moveDown();

    // Lista de psicólogos
    psychologists.forEach((psych) => {
      doc.fontSize(14).text(psych.user.name);
      doc
        .fontSize(10)
        .text(`Email: ${psych.user.email}`)
        .text(`Telefone: ${psych.user.phone || 'Não informado'}`)
        .text(`CRP: ${psych.crp}`)
        .text(`Clínica: ${psych.clinic?.name || 'Autônomo'}`)
        .text(`Total de pacientes: ${psych.patients.length}`);
      doc.moveDown();
    });

    // Rodapé
    doc
      .fontSize(10)
      .text(
        `Total de psicólogos: ${psychologists.length}`,
        50,
        doc.page.height - 50,
        { align: 'center' },
      );
  }

  private async generateClinicList(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    const clinics = await this.prisma.clinic.findMany({
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
        psychologists: {
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
    doc.fontSize(20).text('Lista de Clínicas', { align: 'center' });
    doc.moveDown();

    // Data do relatório
    doc.fontSize(12).text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, {
      align: 'right',
    });
    doc.moveDown();

    // Lista de clínicas
    clinics.forEach((clinic) => {
      doc.fontSize(14).text(clinic.name);
      doc
        .fontSize(10)
        .text(`Responsável: ${clinic.user.name}`)
        .text(`Email: ${clinic.user.email}`)
        .text(`Telefone: ${clinic.phone}`)
        .text(`CNPJ: ${clinic.cnpj || 'Não informado'}`)
        .text(`Total de psicólogos: ${clinic.psychologists.length}`);

      if (clinic.psychologists.length > 0) {
        doc.text('Psicólogos:');
        clinic.psychologists.forEach((psych) => {
          doc.text(`- ${psych.user.name}`);
        });
      }
      doc.moveDown();
    });

    // Rodapé
    doc
      .fontSize(10)
      .text(`Total de clínicas: ${clinics.length}`, 50, doc.page.height - 50, {
        align: 'center',
      });
  }

  private async generateMoodDiaryReport(
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

    // Registros de humor
    patient.moodDiaries.forEach((entry) => {
      doc
        .fontSize(12)
        .text(entry.date.toLocaleDateString('pt-BR'))
        .text(`Humor: ${entry.mood}/5`)
        .text(`Observações: ${entry.notes || 'Sem observações'}`);
      doc.moveDown();
    });

    // Estatísticas
    const avgMood =
      patient.moodDiaries.reduce((acc, curr) => acc + curr.mood, 0) /
      patient.moodDiaries.length;
    doc
      .fontSize(12)
      .text('Estatísticas:')
      .text(`Total de registros: ${patient.moodDiaries.length}`)
      .text(`Média de humor: ${avgMood.toFixed(2)}/5`);
  }

  private async generateFinancialReport(
    doc: PDFKit.PDFDocument,
    params: IDocumentGeneratorParams,
  ): Promise<void> {
    const startDate = params.filters?.startDate
      ? new Date(params.filters.startDate)
      : undefined;
    const endDate = params.filters?.endDate
      ? new Date(params.filters.endDate)
      : undefined;

    // Buscar pagamentos e despesas
    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
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
      }),
      this.prisma.expense.findMany({
        where: {
          tenantId: params.tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    // Cabeçalho
    doc.fontSize(20).text('Relatório Financeiro', { align: 'center' });
    doc.moveDown();

    // Período
    doc
      .fontSize(12)
      .text(
        `Período: ${startDate?.toLocaleDateString('pt-BR')} a ${endDate?.toLocaleDateString('pt-BR')}`,
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

    doc
      .fontSize(14)
      .text('Resumo:')
      .fontSize(12)
      .text(`Receitas: R$ ${totalReceitas.toFixed(2)}`)
      .text(`Despesas: R$ ${totalDespesas.toFixed(2)}`)
      .text(`Saldo: R$ ${saldo.toFixed(2)}`);
    doc.moveDown();

    // Detalhamento
    doc.fontSize(14).text('Receitas:');
    payments.forEach((payment) => {
      doc
        .fontSize(10)
        .text(
          `${payment.createdAt.toLocaleDateString('pt-BR')} - R$ ${Number(payment.amount).toFixed(2)}`,
        )
        .text(`Paciente: ${payment.appointment.patient.user.name}`)
        .text(`Psicólogo: ${payment.appointment.psychologist.user.name}`);
      doc.moveDown(0.5);
    });

    doc.fontSize(14).text('Despesas:');
    expenses.forEach((expense) => {
      doc
        .fontSize(10)
        .text(
          `${expense.createdAt.toLocaleDateString('pt-BR')} - R$ ${Number(expense.amount).toFixed(2)}`,
        )
        .text(`Categoria: ${expense.category}`)
        .text(`Descrição: ${expense.description}`);
      doc.moveDown(0.5);
    });
  }
}
