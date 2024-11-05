// src/clinics/clinics.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  SwaggerRoute,
  SwaggerResponse,
} from '../common/decorators/swagger.decorators';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantResourceGuard } from '../common/guards/tenant-resource.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { Resource } from '../common/decorators/resource.decorator';
import { RequirePermission } from '../common/decorators/permission.decorator';

/**
 * Controller responsável pelo gerenciamento de clínicas
 */
@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('clinics')
export class ClinicsController {
  private readonly logger = new Logger(ClinicsController.name);

  constructor(private readonly clinicsService: ClinicsService) {}

  /**
   * Cria uma nova clínica
   */
  @Post()
  @Roles(Role.MASTER)
  @ApiTags('clinics', 'create')
  @SwaggerRoute('Criar clínica', 'Cria uma nova clínica no sistema')
  @SwaggerResponse(201, 'Clínica criada com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  async create(
    @Body() createClinicDto: CreateClinicDto,
    @CurrentTenant() tenantId: string,
  ) {
    this.logger.debug(
      `Criando clínica: ${createClinicDto.name} para tenant ${tenantId}`,
    );

    return this.clinicsService.createClinic(
      {
        name: createClinicDto.name,
        cnpj: createClinicDto.cnpj,
        address: createClinicDto.address,
        phone: createClinicDto.phone,
        user: {
          connect: { id: createClinicDto.userId },
        },
        tenantId,
      },
      tenantId,
    );
  }

  /**
   * Lista todas as clínicas
   */
  @Get()
  @Roles(Role.MASTER, Role.CLINIC)
  @ApiTags('clinics', 'list')
  @SwaggerRoute('Listar clínicas', 'Retorna lista de todas as clínicas')
  @SwaggerResponse(200, 'Lista de clínicas retornada com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  async findAll(@CurrentTenant() tenantId: string, @CurrentUser() user: any) {
    this.logger.debug(`Listando clínicas para tenant ${tenantId}`);

    const where = user.role === Role.CLINIC ? { userId: user.id } : {};

    return this.clinicsService.clinics({
      where,
      tenantId,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Busca uma clínica específica por ID
   */
  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('clinics', 'read')
  @SwaggerRoute(
    'Buscar clínica por ID',
    'Retorna os dados de uma clínica específica',
  )
  @SwaggerResponse(200, 'Clínica encontrada')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Clínica não encontrada')
  @Resource('clinic')
  @RequirePermission('readClinic')
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Buscando clínica ${id} para tenant ${tenantId}`);

    // Verificar se o usuário é da clínica
    if (user.role === Role.CLINIC && user.clinicId !== Number(id)) {
      throw new ForbiddenException('Acesso negado a esta clínica');
    }

    return this.clinicsService.clinic({ id: Number(id) }, tenantId);
  }

  /**
   * Atualiza uma clínica existente
   */
  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('clinics', 'update')
  @SwaggerRoute(
    'Atualizar clínica',
    'Atualiza os dados de uma clínica existente',
  )
  @SwaggerResponse(200, 'Clínica atualizada com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Clínica não encontrada')
  @Resource('clinic')
  @RequirePermission('updateClinic')
  async update(
    @Param('id') id: string,
    @Body() updateClinicDto: UpdateClinicDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Atualizando clínica ${id} para tenant ${tenantId}`);

    // Verificar se o usuário é da clínica
    if (user.role === Role.CLINIC && user.clinicId !== Number(id)) {
      throw new ForbiddenException('Acesso negado a esta clínica');
    }

    return this.clinicsService.updateClinic({
      where: { id: Number(id) },
      data: updateClinicDto,
      tenantId,
    });
  }

  /**
   * Remove uma clínica do sistema
   */
  @Delete(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('clinics', 'delete')
  @SwaggerRoute('Remover clínica', 'Remove uma clínica do sistema')
  @SwaggerResponse(200, 'Clínica removida com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(404, 'Clínica não encontrada')
  @SwaggerResponse(409, 'Não é possível excluir clínica com vínculos ativos')
  @Resource('clinic')
  @RequirePermission('deleteClinic')
  async remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    this.logger.debug(`Removendo clínica ${id} do tenant ${tenantId}`);

    return this.clinicsService.deleteClinic({ id: Number(id) }, tenantId);
  }
}
