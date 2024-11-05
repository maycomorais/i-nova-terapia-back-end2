// src/patients/patients.controller.ts
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { Prisma, Role } from '@prisma/client';
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

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @ApiTags('patients', 'create')
  @SwaggerRoute('Criar paciente', 'Cria um novo paciente no sistema')
  @SwaggerResponse(201, 'Paciente criado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(409, 'CPF já cadastrado')
  create(
    @Body() createPatientDto: Prisma.PatientCreateInput,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.createPatient(createPatientDto, tenantId);
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard)
  @ApiTags('patients', 'list')
  @SwaggerRoute('Listar pacientes', 'Retorna lista paginada de pacientes')
  @SwaggerResponse(200, 'Lista de pacientes retornada com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  findAll(
    @Query() query: PaginationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.patients({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      tenantId,
      userId: user.id,
      userRole: user.role,
    });
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'read')
  @SwaggerRoute('Buscar paciente por ID')
  @SwaggerResponse(200, 'Paciente encontrado')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente não encontrado')
  @Resource('patient')
  @RequirePermission('readPatient')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.patientsService.patient(Number(id), tenantId);
  }

  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'update')
  @SwaggerRoute(
    'Atualizar paciente',
    'Atualiza os dados de um paciente existente',
  )
  @SwaggerResponse(200, 'Paciente atualizado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente não encontrado')
  @SwaggerResponse(409, 'CPF já cadastrado')
  @Resource('patient')
  @RequirePermission('updatePatient')
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: Prisma.PatientUpdateInput,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.updatePatient({
      id: Number(id),
      data: updatePatientDto,
      tenantId,
      userId: user.id,
      userRole: user.role,
    });
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'delete')
  @SwaggerRoute('Remover paciente', 'Remove um paciente do sistema')
  @SwaggerResponse(200, 'Paciente removido com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(404, 'Paciente não encontrado')
  @SwaggerResponse(
    409,
    'Não é possível excluir paciente com consultas registradas',
  )
  @Resource('patient')
  @RequirePermission('deletePatient')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.patientsService.deletePatient(Number(id), tenantId);
  }

  @Patch(':id/link-psychologist/:psychologistId')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'psychologist')
  @SwaggerRoute(
    'Vincular paciente a psicólogo',
    'Vincula um paciente a um psicólogo específico',
  )
  @SwaggerResponse(200, 'Paciente vinculado com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente ou psicólogo não encontrado')
  @Resource('patient')
  @RequirePermission('linkPsychologist')
  linkToPsychologist(
    @Param('id') id: string,
    @Param('psychologistId') psychologistId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.linkToPsychologist(
      Number(id),
      Number(psychologistId),
      tenantId,
    );
  }

  @Patch(':id/link-clinic/:clinicId')
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'clinic')
  @SwaggerRoute(
    'Vincular paciente a clínica',
    'Vincula um paciente a uma clínica específica',
  )
  @SwaggerResponse(200, 'Paciente vinculado com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente ou clínica não encontrado')
  @Resource('patient')
  @RequirePermission('linkClinic')
  linkToClinic(
    @Param('id') id: string,
    @Param('clinicId') clinicId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.linkToClinic(
      Number(id),
      Number(clinicId),
      tenantId,
    );
  }

  @Patch(':id/unlink-psychologist')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'psychologist')
  @SwaggerRoute(
    'Desvincular paciente de psicólogo',
    'Remove o vínculo entre paciente e psicólogo',
  )
  @SwaggerResponse(200, 'Paciente desvinculado com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente não encontrado')
  @Resource('patient')
  @RequirePermission('unlinkPsychologist')
  unlinkFromPsychologist(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.unlinkFromPsychologist(Number(id), tenantId);
  }

  @Patch(':id/unlink-clinic')
  @Roles(Role.MASTER, Role.CLINIC)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('patients', 'clinic')
  @SwaggerRoute(
    'Desvincular paciente de clínica',
    'Remove o vínculo entre paciente e clínica',
  )
  @SwaggerResponse(200, 'Paciente desvinculado com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente')
  @SwaggerResponse(404, 'Paciente não encontrado')
  @Resource('patient')
  @RequirePermission('unlinkClinic')
  unlinkFromClinic(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.patientsService.unlinkFromClinic(Number(id), tenantId);
  }
}
