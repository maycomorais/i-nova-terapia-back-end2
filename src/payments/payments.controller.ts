// src/payments/payments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentResponseDto } from './dtos/payment-response.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentTenant() tenantId: string,
  ): Promise<PaymentResponseDto> {
    try {
      const payment = await this.paymentsService.create(
        createPaymentDto,
        tenantId,
      );

      return {
        id: payment.id,
        appointmentId: payment.appointmentId,
        amount: Number(payment.amount),
        discount: payment.discount ? Number(payment.discount) : null,
        method: payment.method,
        status: payment.status,
        dueDate: payment.dueDate,
        installments: payment.installments,
        notes: payment.notes,
        asaasPaymentId: payment.asaasPaymentId,
        asaasInvoiceUrl: payment.asaasInvoiceUrl,
        asaasPixCode: payment.asaasPixCode,
        asaasBoletoCode: payment.asaasBoletoCode,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Erro ao criar pagamento: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @ApiOperation({ summary: 'Lista todos os pagamentos' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async findAll(
    @Query() query: PaginationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Query('status') status?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PaymentResponseDto[]> {
    const where = {
      tenantId,
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    if (user.role === Role.PSYCHOLOGIST) {
      where['appointment'] = {
        psychologistId: user.psychologistId,
      };
    }

    const payments = await this.paymentsService.findAll({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      where,
      orderBy: {
        createdAt: 'desc',
      },
      tenantId,
    });

    return payments.map((payment) => ({
      id: payment.id,
      appointmentId: payment.appointmentId,
      amount: Number(payment.amount),
      discount: payment.discount ? Number(payment.discount) : null,
      method: payment.method,
      status: payment.status,
      dueDate: payment.dueDate,
      installments: payment.installments,
      notes: payment.notes,
      asaasPaymentId: payment.asaasPaymentId,
      asaasInvoiceUrl: payment.asaasInvoiceUrl,
      asaasPixCode: payment.asaasPixCode,
      asaasBoletoCode: payment.asaasBoletoCode,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @ApiOperation({ summary: 'Busca um pagamento por ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.findOne(+id, tenantId);

    return {
      id: payment.id,
      appointmentId: payment.appointmentId,
      amount: Number(payment.amount),
      discount: payment.discount ? Number(payment.discount) : null,
      method: payment.method,
      status: payment.status,
      dueDate: payment.dueDate,
      installments: payment.installments,
      notes: payment.notes,
      asaasPaymentId: payment.asaasPaymentId,
      asaasInvoiceUrl: payment.asaasInvoiceUrl,
      asaasPixCode: payment.asaasPixCode,
      asaasBoletoCode: payment.asaasBoletoCode,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook para receber notificações do ASAAS' })
  @ApiResponse({ status: 200, description: 'Webhook processado com sucesso' })
  async webhook(@Body() data: any) {
    try {
      await this.paymentsService.processWebhook(data);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`);
      throw new BadRequestException('Erro ao processar webhook');
    }
  }

  @Get('stats')
  @Roles(Role.MASTER, Role.CLINIC)
  @ApiOperation({ summary: 'Retorna estatísticas de pagamentos' })
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentTenant() tenantId: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const payments = await this.paymentsService.findAll({
      where: {
        tenantId,
        ...(start &&
          end && {
            createdAt: {
              gte: start,
              lte: end,
            },
          }),
      },
      tenantId,
    });

    return {
      total: payments.length,
      totalAmount: payments.reduce((acc, curr) => acc + Number(curr.amount), 0),
      byStatus: this.groupByStatus(payments),
      byMethod: this.groupByMethod(payments),
    };
  }

  @Get('report')
  @Roles(Role.MASTER, Role.CLINIC)
  @ApiOperation({ summary: 'Gera relatório de pagamentos' })
  async generateReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentTenant() tenantId: string,
  ) {
    const report = await this.paymentsService.findAll({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      tenantId,
    });

    return {
      period: {
        startDate,
        endDate,
      },
      data: report.map((payment) => ({
        id: payment.id,
        appointmentId: payment.appointmentId,
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      })),
      summary: {
        total: report.length,
        totalAmount: report.reduce((acc, curr) => acc + Number(curr.amount), 0),
        byStatus: this.groupByStatus(report),
        byMethod: this.groupByMethod(report),
      },
    };
  }

  private groupByStatus(payments: any[]) {
    return payments.reduce((acc, curr) => {
      acc[curr.status] = acc[curr.status] || {
        count: 0,
        amount: 0,
      };
      acc[curr.status].count++;
      acc[curr.status].amount += Number(curr.amount);
      return acc;
    }, {});
  }

  private groupByMethod(payments: any[]) {
    return payments.reduce((acc, curr) => {
      acc[curr.method] = acc[curr.method] || {
        count: 0,
        amount: 0,
      };
      acc[curr.method].count++;
      acc[curr.method].amount += Number(curr.amount);
      return acc;
    }, {});
  }
}
