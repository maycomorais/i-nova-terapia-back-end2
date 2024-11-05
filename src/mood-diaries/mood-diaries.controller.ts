// src/mood-diaries/mood-diaries.controller.ts
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MoodDiariesService } from './mood-diaries.service';
import { CreateMoodDiaryDto } from './dto/create-mood-diary.dto';
import { UpdateMoodDiaryDto } from './dto/update-mood-diary.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantResourceGuard } from '../common/guards/tenant-resource.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { Resource } from '../common/decorators/resource.decorator';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  SwaggerRoute,
  SwaggerResponse,
} from '../common/decorators/swagger.decorators';

/**
 * Controller responsável pelo gerenciamento do diário de humor
 */
@Controller('mood-diaries')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('mood-diaries')
export class MoodDiariesController {
  private readonly logger = new Logger(MoodDiariesController.name);

  constructor(private readonly moodDiariesService: MoodDiariesService) {}

  /**
   * Cria um novo registro no diário
   */
  @Post()
  @Roles(Role.PATIENT)
  @UseGuards(TenantResourceGuard)
  @ApiTags('mood-diaries', 'create')
  @SwaggerRoute('Criar registro', 'Cria um novo registro no diário de humor')
  @SwaggerResponse(201, 'Registro criado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas pacientes')
  @SwaggerResponse(409, 'Já existe um registro para hoje')
  async create(
    @Body() createMoodDiaryDto: CreateMoodDiaryDto,
    @CurrentTenant() tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @CurrentUser() user: any,
  ) {
    this.logger.debug(
      `Criando registro de humor para paciente ${createMoodDiaryDto.patientId}`,
    );

    return this.moodDiariesService.create(createMoodDiaryDto, tenantId);
  }

  /**
   * Lista todos os registros do diário
   */
  @Get()
  @Roles(Role.MASTER, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard)
  @ApiTags('mood-diaries', 'list')
  @SwaggerRoute(
    'Listar registros',
    'Retorna lista paginada de registros de humor',
  )
  @SwaggerResponse(200, 'Lista de registros retornada com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  async findAll(
    @Query() query: PaginationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Listando registros de humor para tenant ${tenantId}`);

    const where =
      user.role === Role.PSYCHOLOGIST
        ? { patient: { psychologistId: user.id } }
        : {};

    return this.moodDiariesService.findAll({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      where,
      tenantId,
    });
  }

  /**
   * Busca registros de um paciente específico
   */
  @Get('patient/:patientId')
  @Roles(Role.PATIENT, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('mood-diaries', 'patient')
  @SwaggerRoute('Buscar registros por paciente')
  @SwaggerResponse(200, 'Registros encontrados')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente não encontrado')
  @Resource('patient')
  @RequirePermission('readMoodDiaries')
  async findByPatient(
    @Param('patientId') patientId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Buscando registros de humor do paciente ${patientId}`);

    return this.moodDiariesService.findByPatient(
      Number(patientId),
      tenantId,
      user.id,
    );
  }

  /**
   * Busca um registro específico
   */
  @Get(':id')
  @Roles(Role.PATIENT, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('mood-diaries', 'read')
  @SwaggerRoute('Buscar registro por ID')
  @SwaggerResponse(200, 'Registro encontrado')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Registro não encontrado')
  @Resource('moodDiary')
  @RequirePermission('readMoodDiary')
  async findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    this.logger.debug(`Buscando registro de humor ${id}`);

    return this.moodDiariesService.findOne(Number(id), tenantId);
  }

  /**
   * Atualiza um registro do diário
   */
  @Patch(':id')
  @Roles(Role.PATIENT)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('mood-diaries', 'update')
  @SwaggerRoute('Atualizar registro', 'Atualiza um registro do diário de humor')
  @SwaggerResponse(200, 'Registro atualizado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Registro não encontrado')
  @Resource('moodDiary')
  @RequirePermission('updateMoodDiary')
  async update(
    @Param('id') id: string,
    @Body() updateMoodDiaryDto: UpdateMoodDiaryDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Atualizando registro de humor ${id}`);

    return this.moodDiariesService.update(
      Number(id),
      updateMoodDiaryDto,
      tenantId,
      user.id,
    );
  }

  /**
   * Remove um registro do diário
   */
  @Delete(':id')
  @Roles(Role.PATIENT)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('mood-diaries', 'delete')
  @SwaggerRoute('Remover registro', 'Remove um registro do diário de humor')
  @SwaggerResponse(200, 'Registro removido com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Registro não encontrado')
  @Resource('moodDiary')
  @RequirePermission('deleteMoodDiary')
  async remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`Removendo registro de humor ${id}`);

    return this.moodDiariesService.delete(Number(id), tenantId, user.id);
  }
}
