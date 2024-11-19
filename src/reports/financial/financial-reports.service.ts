// src/reports/financial/financial-reports.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import {
  FinancialReportFiltersDto,
  ReportPeriod,
  ReportGroupBy,
} from './dto/report-filters.dto';
import { Prisma, Role } from '@prisma/client';

// Interface que define a estrutura dos dados agrupados nos relatórios
interface GroupedData {
  total: number; // Total monetário
  count: number; // Quantidade de registros
}

// Interface para resultados agregados após processamento
interface AggregatedResult {
  key: string; // Chave de agrupamento (ex: id do psicólogo, método de pagamento)
  total: number; // Valor total agregado
  count: number; // Quantidade de registros
}

// Interface específica para dados agregados de psicólogos
interface TopPsychologistData {
  psychologist: {
    // Dados do psicólogo
    id: number;
    user: {
      name: string;
      email: string;
    };
  };
  total: number; // Total de receita gerada
  count: number; // Quantidade de atendimentos
}

@Injectable()
export class FinancialReportsService {
  // Logger para monitoramento e debug
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(
    private readonly prisma: PrismaService, // Serviço de acesso ao banco
    private readonly cacheService: CacheService, // Serviço de cache
  ) {}

  /**
   * Obtém visão geral financeira com métricas principais
   * @param filters Filtros de período e agrupamento
   * @param user Usuário atual
   * @param tenantId ID do tenant
   */
  async getOverview(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    // Chave única para cache dos dados
    const cacheKey = `financial:overview:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Obtém período e filtros
    const { startDate, endDate } = this.getDateRange(filters);
    const where = this.buildWhereClause(filters, user, tenantId);

    // Busca dados agregados em paralelo
    const [totalRevenue, totalReceived, totalPending, revenueByPeriod] =
      await Promise.all([
        // Total geral de receita
        this.prisma.payment.aggregate({
          where,
          _sum: { amount: true },
        }),

        // Total de pagamentos recebidos
        this.prisma.payment.aggregate({
          where: { ...where, status: 'PAID' },
          _sum: { amount: true },
        }),

        // Total de pagamentos pendentes
        this.prisma.payment.aggregate({
          where: { ...where, status: 'PENDING' },
          _sum: { amount: true },
        }),

        // Receita distribuída por período
        this.getRevenueByPeriod(startDate, endDate, where),
      ]);

    // Monta objeto de resposta com métricas calculadas
    const overview = {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalReceived: Number(totalReceived._sum.amount || 0),
      totalPending: Number(totalPending._sum.amount || 0),
      revenueByPeriod,
      metrics: {
        // Taxa de recebimento (percentual do total já recebido)
        receiptRate: totalRevenue._sum.amount
          ? (Number(totalReceived._sum.amount) /
              Number(totalRevenue._sum.amount)) *
            100
          : 0,
        // Ticket médio dos pagamentos
        avgTicket: await this.calculateAverageTicket(where),
      },
    };

    // Armazena em cache por 5 minutos
    await this.cacheService.set(cacheKey, overview, 300);
    return overview;
  }
  /**
   * Gera relatório de receitas com diferentes agrupamentos
   * @param filters Filtros de período e agrupamento
   * @param user Usuário atual
   * @param tenantId ID do tenant
   */
  async getRevenueReport(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const where = this.buildWhereClause(filters, user, tenantId);

    // Busca dados com seleção específica para otimização
    const result = await this.prisma.payment.findMany({
      where,
      select: {
        method: true,
        amount: true,
        appointment: {
          select: {
            psychologist: {
              select: {
                id: true,
                clinicId: true,
              },
            },
          },
        },
      },
    });

    return this.aggregateResults(result, filters.groupBy);
  }

  /**
   * Agrega resultados baseado no critério de agrupamento
   * @param data Dados a serem agregados
   * @param groupBy Critério de agrupamento
   */
  private aggregateResults(
    data: any[],
    groupBy?: ReportGroupBy,
  ): AggregatedResult[] {
    const groupedData: Record<string, GroupedData> = data.reduce(
      (acc: Record<string, GroupedData>, item) => {
        let key = 'total';

        // Define chave de agrupamento baseado no critério
        switch (groupBy) {
          case ReportGroupBy.PSYCHOLOGIST:
            key = String(item.appointment.psychologist.id);
            break;
          case ReportGroupBy.CLINIC:
            key = String(item.appointment.psychologist.clinicId);
            break;
          case ReportGroupBy.PAYMENT_METHOD:
            key = item.method;
            break;
          case ReportGroupBy.STATUS:
            key = item.status;
            break;
        }

        // Inicializa ou atualiza acumuladores
        if (!acc[key]) {
          acc[key] = {
            total: 0,
            count: 0,
          };
        }

        acc[key].total += Number(item.amount);
        acc[key].count++;
        return acc;
      },
      {},
    );

    // Converte objeto agrupado em array de resultados
    return Object.entries(groupedData).map(([key, value]) => ({
      key,
      total: value.total,
      count: value.count,
    }));
  }

  /**
   * Obtém relatório detalhado de pagamentos
   */
  async getPaymentsReport(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const where = this.buildWhereClause(filters, user, tenantId);

    return this.prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            patient: {
              include: { user: true },
            },
            psychologist: {
              include: { user: true },
            },
          },
        },
        paymentSplits: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtém relatório de divisões de pagamento
   */
  async getSplitsReport(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const where = this.buildWhereClause(filters, user, tenantId);

    return this.prisma.paymentSplit.groupBy({
      by: ['receiverId'],
      where: {
        payment: { ...where },
      },
      _sum: {
        percentage: true,
      },
      _count: true,
    });
  }

  /**
   * Obtém dados consolidados para dashboard
   */
  async getDashboard(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const [overview, revenueByMethod, revenueByStatus, topPsychologists] =
      await Promise.all([
        this.getOverview(filters, user, tenantId),
        this.getRevenueByPaymentMethod(filters, user, tenantId),
        this.getRevenueByStatus(filters, user, tenantId),
        this.getTopPsychologists(filters, user, tenantId),
      ]);

    return {
      overview,
      revenueByMethod,
      revenueByStatus,
      topPsychologists,
    };
  }
  /**
   * Calcula intervalo de datas baseado no período selecionado
   * @param filters Filtros contendo o período desejado
   */
  private getDateRange(filters: FinancialReportFiltersDto) {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (filters.period) {
      case ReportPeriod.DAILY:
        // Período do dia atual (00:00 até 23:59)
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case ReportPeriod.WEEKLY:
        // Período da semana atual (domingo a sábado)
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() + 6));
        break;
      case ReportPeriod.MONTHLY:
        // Período do mês atual
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case ReportPeriod.YEARLY:
        // Período do ano atual
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case ReportPeriod.CUSTOM:
        // Período personalizado definido pelo usuário
        startDate = filters.startDate
          ? new Date(filters.startDate)
          : new Date();
        endDate = filters.endDate ? new Date(filters.endDate) : new Date();
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Constrói a cláusula WHERE para filtrar pagamentos
   * @param filters Filtros aplicados
   * @param user Usuário atual
   * @param tenantId ID do tenant
   */
  private buildWhereClause(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);
    let where: Prisma.PaymentWhereInput = {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Adiciona filtros específicos baseado no papel do usuário
    if (user.role === Role.CLINIC) {
      where = {
        ...where,
        appointment: {
          is: {
            psychologist: {
              is: {
                clinic: {
                  is: {
                    id: user.clinicId,
                  },
                },
              },
            },
          },
        },
      };
    }

    // Filtro por psicólogo específico
    if (filters.psychologistId) {
      where = {
        ...where,
        appointment: {
          is: {
            psychologist: {
              is: {
                id: filters.psychologistId,
              },
            },
          },
        },
      };
    }

    // Filtro por clínica específica
    if (filters.clinicId) {
      where = {
        ...where,
        appointment: {
          is: {
            psychologist: {
              is: {
                clinic: {
                  is: {
                    id: filters.clinicId,
                  },
                },
              },
            },
          },
        },
      };
    }

    return where;
  }

  /**
   * Define campos para agrupamento baseado no tipo de relatório
   */
  private getGroupByFields(groupBy?: ReportGroupBy): string[] {
    switch (groupBy) {
      case ReportGroupBy.PSYCHOLOGIST:
        return ['p."psychologistId"'];
      case ReportGroupBy.CLINIC:
        return ['c.id'];
      case ReportGroupBy.PAYMENT_METHOD:
        return ['p."method"'];
      case ReportGroupBy.STATUS:
        return ['p."status"'];
      default:
        return ['p."createdAt"::date'];
    }
  }

  /**
   * Calcula o ticket médio dos pagamentos
   */
  private async calculateAverageTicket(
    where: Prisma.PaymentWhereInput,
  ): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where,
      _avg: { amount: true },
    });

    return Number(result._avg.amount || 0);
  }

  /**
   * Obtém receita distribuída por período
   * @param startDate Data inicial
   * @param endDate Data final
   * @param where Filtros adicionais
   */
  private async getRevenueByPeriod(
    startDate: Date,
    endDate: Date,
    where: Prisma.PaymentWhereInput,
  ) {
    const results = await this.prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return results.map((result) => ({
      date: result.createdAt,
      amount: Number(result._sum.amount || 0),
    }));
  }

  /**
   * Obtém receita agrupada por método de pagamento
   */
  private async getRevenueByPaymentMethod(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const where = this.buildWhereClause(filters, user, tenantId);

    return this.prisma.payment.groupBy({
      by: ['method'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });
  }

  /**
   * Obtém receita agrupada por status de pagamento
   */
  private async getRevenueByStatus(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ) {
    const where = this.buildWhereClause(filters, user, tenantId);

    return this.prisma.payment.groupBy({
      by: ['status'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });
  }

  /**
   * Obtém ranking dos psicólogos que mais geraram receita
   */
  private async getTopPsychologists(
    filters: FinancialReportFiltersDto,
    user: any,
    tenantId: string,
  ): Promise<TopPsychologistData[]> {
    const where = this.buildWhereClause(filters, user, tenantId);

    const results = await this.prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            psychologist: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Agrupa resultados por psicólogo
    const grouped: Record<number, TopPsychologistData> = results.reduce(
      (acc: Record<number, TopPsychologistData>, payment) => {
        const psychId = payment.appointment.psychologist.id;
        if (!acc[psychId]) {
          acc[psychId] = {
            psychologist: payment.appointment.psychologist,
            total: 0,
            count: 0,
          };
        }
        acc[psychId].total += Number(payment.amount);
        acc[psychId].count++;
        return acc;
      },
      {},
    );

    // Ordena por total e retorna os 5 maiores
    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }
}
