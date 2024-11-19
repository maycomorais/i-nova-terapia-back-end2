// src/reports/financial/financial-reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FinancialReportsService } from './financial-reports.service';
import { FinancialReportFiltersDto } from './dto/report-filters.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import {
  SwaggerRoute,
  SwaggerResponse,
} from '../../common/decorators/swagger.decorators';
import {
  AggregatedResult,
  DashboardResponse,
  OverviewResponse,
  RevenueByMethodResponse,
  RevenueByStatusResponse,
} from './interfaces/financial-reports.interfaces';

/**
 * Controller responsável pelos endpoints de relatórios financeiros
 */
@Controller('reports/financial')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('financial-reports')
export class FinancialReportsController {
  constructor(
    private readonly financialReportsService: FinancialReportsService,
  ) {}

  /**
   * Retorna relatório de receitas agrupado conforme filtros
   */
  @Get('revenue')
  @Roles(Role.MASTER, Role.CLINIC)
  @SwaggerRoute(
    'Relatório de receitas',
    'Retorna análise detalhada de receitas',
  )
  @SwaggerResponse(200, 'Relatório gerado com sucesso')
  async getRevenueReport(
    @Query() filters: FinancialReportFiltersDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<AggregatedResult[]> {
    return this.financialReportsService.getRevenueReport(
      filters,
      user,
      tenantId,
    );
  }

  /**
   * Retorna lista detalhada de pagamentos
   */
  @Get('payments')
  @Roles(Role.MASTER, Role.CLINIC)
  @SwaggerRoute('Lista de pagamentos', 'Retorna pagamentos detalhados')
  @SwaggerResponse(200, 'Lista de pagamentos retornada com sucesso')
  async getPaymentsReport(
    @Query() filters: FinancialReportFiltersDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.financialReportsService.getPaymentsReport(
      filters,
      user,
      tenantId,
    );
  }

  /**
   * Retorna análise de divisões de pagamentos
   */
  @Get('splits')
  @Roles(Role.MASTER, Role.CLINIC)
  @SwaggerRoute(
    'Análise de splits',
    'Retorna análise de divisões de pagamentos',
  )
  @SwaggerResponse(200, 'Análise retornada com sucesso')
  async getSplitsReport(
    @Query() filters: FinancialReportFiltersDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.financialReportsService.getSplitsReport(
      filters,
      user,
      tenantId,
    );
  }

  /**
   * Retorna dados consolidados para dashboard
   */
  @Get('dashboard')
  @Roles(Role.MASTER, Role.CLINIC)
  @SwaggerRoute('Dashboard financeiro', 'Retorna dados consolidados')
  @SwaggerResponse(200, 'Dados do dashboard retornados com sucesso')
  async getDashboard(
    @Query() filters: FinancialReportFiltersDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<DashboardResponse> {
    const dashboard = await this.financialReportsService.getDashboard(
      filters,
      user,
      tenantId,
    );

    return {
      overview: dashboard.overview as OverviewResponse,
      revenueByMethod: dashboard.revenueByMethod as RevenueByMethodResponse[],
      revenueByStatus: dashboard.revenueByStatus as RevenueByStatusResponse[],
      topPsychologists: dashboard.topPsychologists,
    };
  }
}
