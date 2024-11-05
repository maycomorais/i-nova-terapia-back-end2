// src/psychologists/psychologists.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PsychologistsService } from './psychologists.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  SwaggerRoute,
  SwaggerResponse,
} from '../common/decorators/swagger.decorators';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantResourceGuard } from '../common/guards/tenant-resource.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { Resource } from '../common/decorators/resource.decorator';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePsychologistDto } from './dto/create-psychologist.dto';
import { UpdatePsychologistDto } from './dto/update-psychologist.dto';

/**
 * Controller responsável pelo gerenciamento de psicólogos
 */
@Controller('psychologists')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('psychologists')
export class PsychologistsController {
  private readonly logger = new Logger(PsychologistsController.name);

  constructor(private readonly psychologistsService: PsychologistsService) {}

  /**
   * Cria um novo psicólogo
   */
  @Post()
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard)
  @ApiTags('psychologists', 'create')
  @SwaggerRoute('Criar psicólogo', 'Cria um novo psicólogo no sistema')
  @SwaggerResponse(201, 'Psicólogo criado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER e CLINIC')
  @SwaggerResponse(409, 'CRP já cadastrado')
  async create(
    @Body() createPsychologistDto: CreatePsychologistDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Criando psicólogo com CRP ${createPsychologistDto.crp}`);

    // Se for uma clínica criando, verificar se está criando para ela mesma
    if (
      user.role === Role.CLINIC &&
      createPsychologistDto.clinicId !== user.clinicId
    ) {
      throw new ForbiddenException(
        'Clínica só pode criar psicólogos para si mesma',
      );
    }

    return this.psychologistsService.createPsychologist({
      cpf: createPsychologistDto.cpf,
      crp: createPsychologistDto.crp,
      address: createPsychologistDto.address,
      phone: createPsychologistDto.phone,
      tenantId,
      user: {
        create: {
          email: createPsychologistDto.email,
          name: createPsychologistDto.name,
          password: createPsychologistDto.password,
          role: Role.PSYCHOLOGIST,
          tenantId,
        },
      },
      ...(createPsychologistDto.clinicId && {
        clinic: {
          connect: { id: createPsychologistDto.clinicId },
        },
      }),
    });
  }

  /**
   * Lista todos os psicólogos
   */
  @Get()
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard)
  @ApiTags('psychologists', 'list')
  @SwaggerRoute('Listar psicólogos', 'Retorna lista paginada de psicólogos')
  @SwaggerResponse(200, 'Lista de psicólogos retornada com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER e CLINIC')
  async findAll(
    @Query() query: PaginationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Listando psicólogos para tenant ${tenantId}`);

    const where = {
      ...(user.role === Role.CLINIC ? { clinicId: user.clinicId } : {}),
    };

    return this.psychologistsService.psychologists({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      where,
      tenantId,
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Busca um psicólogo específico
   */
  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('psychologists', 'read')
  @SwaggerRoute('Buscar psicólogo por ID')
  @SwaggerResponse(200, 'Psicólogo encontrado')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Psicólogo não encontrado')
  @Resource('psychologist')
  @RequirePermission('readPsychologist')
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Buscando psicólogo ${id} no tenant ${tenantId}`);

    // Se for um psicólogo, só pode ver seus próprios dados
    if (user.role === Role.PSYCHOLOGIST && user.id !== Number(id)) {
      throw new ForbiddenException('Psicólogo só pode ver seus próprios dados');
    }

    return this.psychologistsService.psychologist(Number(id), tenantId);
  }

  /**
   * Atualiza um psicólogo
   */
  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('psychologists', 'update')
  @SwaggerRoute(
    'Atualizar psicólogo',
    'Atualiza os dados de um psicólogo existente',
  )
  @SwaggerResponse(200, 'Psicólogo atualizado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Psicólogo não encontrado')
  @SwaggerResponse(409, 'CRP já cadastrado')
  @Resource('psychologist')
  @RequirePermission('updatePsychologist')
  async update(
    @Param('id') id: string,
    @Body() updatePsychologistDto: UpdatePsychologistDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Atualizando psicólogo ${id} no tenant ${tenantId}`);

    return this.psychologistsService.updatePsychologist({
      id: Number(id),
      data: updatePsychologistDto,
      tenantId,
      userId: user.id,
    });
  }

  /**
   * Remove um psicólogo
   */
  @Delete(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('psychologists', 'delete')
  @SwaggerRoute('Remover psicólogo', 'Remove um psicólogo do sistema')
  @SwaggerResponse(200, 'Psicólogo removido com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(404, 'Psicólogo não encontrado')
  @SwaggerResponse(
    409,
    'Não é possível excluir psicólogo com pacientes vinculados',
  )
  @Resource('psychologist')
  @RequirePermission('deletePsychologist')
  async remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    this.logger.debug(`Removendo psicólogo ${id} do tenant ${tenantId}`);

    return this.psychologistsService.deletePsychologist(Number(id), tenantId);
  }

  /**
   * Vincula psicólogo a uma clínica
   */
  @Patch(':id/link-clinic/:clinicId')
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('psychologists', 'clinic')
  @SwaggerRoute(
    'Vincular psicólogo à clínica',
    'Vincula um psicólogo a uma clínica específica',
  )
  @SwaggerResponse(200, 'Psicólogo vinculado com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Psicólogo ou clínica não encontrado')
  @Resource('psychologist')
  @RequirePermission('linkClinic')
  async linkToClinic(
    @Param('id') id: string,
    @Param('clinicId') clinicId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Vinculando psicólogo ${id} à clínica ${clinicId}`);

    // Se for uma clínica, só pode vincular a si mesma
    if (user.role === Role.CLINIC && user.clinicId !== Number(clinicId)) {
      throw new ForbiddenException(
        'Clínica só pode vincular psicólogos a si mesma',
      );
    }

    return this.psychologistsService.linkToClinic(
      Number(id),
      Number(clinicId),
      tenantId,
    );
  }

  /**
   * Remove vínculo com clínica
   */
  @Patch(':id/unlink-clinic')
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('psychologists', 'clinic')
  @SwaggerRoute(
    'Desvincular psicólogo da clínica',
    'Remove o vínculo entre psicólogo e clínica',
  )
  @SwaggerResponse(200, 'Psicólogo desvinculado com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Psicólogo não encontrado')
  @Resource('psychologist')
  @RequirePermission('unlinkClinic')
  async unlinkFromClinic(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Desvinculando psicólogo ${id} de clínica`);

    // Se for uma clínica, verificar se o psicólogo está vinculado a ela
    if (user.role === Role.CLINIC) {
      const psychologist = await this.psychologistsService.psychologist(
        Number(id),
        tenantId,
      );
      if (psychologist.clinicId !== user.clinicId) {
        throw new ForbiddenException(
          'Clínica só pode desvincular seus próprios psicólogos',
        );
      }
    }

    return this.psychologistsService.unlinkFromClinic(Number(id), tenantId);
  }
}
