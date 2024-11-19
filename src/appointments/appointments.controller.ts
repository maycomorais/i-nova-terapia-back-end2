// src/appointments/appointments.controller.ts
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
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Prisma, Role } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
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

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.MASTER, Role.PSYCHOLOGIST)
  @ApiTags('appointments', 'create')
  @SwaggerRoute('Criar novo agendamento', 'Cria uma nova consulta no sistema')
  @SwaggerResponse(201, 'Agendamento criado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(409, 'Conflito de horário')
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.createAppointment(
      {
        patient: { connect: { id: createAppointmentDto.patientId } },
        psychologist: { connect: { id: createAppointmentDto.psychologistId } },
        dateTime: new Date(createAppointmentDto.dateTime),
        duration: createAppointmentDto.duration,
        value: createAppointmentDto.value,
        status: createAppointmentDto.status,
        notes: createAppointmentDto.notes,
        tenantId,
        endTime: '',
      },
      user.id,
      tenantId,
    );
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @ApiTags('appointments', 'list')
  @SwaggerRoute('Listar agendamentos', 'Retorna lista paginada de agendamentos')
  @SwaggerResponse(200, 'Lista de agendamentos retornada com sucesso')
  findAll(
    @Query() query: PaginationDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    const where = {
      tenantId,
      ...(user.role === Role.PSYCHOLOGIST ? { psychologistId: user.id } : {}),
    };

    return this.appointmentsService.findAll({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      where,
      tenantId,
    });
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('appointments', 'read')
  @SwaggerRoute('Buscar agendamento por ID')
  @SwaggerResponse(200, 'Agendamento encontrado')
  @SwaggerResponse(404, 'Agendamento não encontrado')
  @Resource('appointment')
  @RequirePermission('readAppointment')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.appointmentsService.findOne(Number(id), tenantId);
  }

  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('appointments', 'update')
  @SwaggerRoute(
    'Atualizar agendamento',
    'Atualiza os dados de uma consulta existente',
  )
  @SwaggerResponse(200, 'Agendamento atualizado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(404, 'Agendamento não encontrado')
  @SwaggerResponse(409, 'Conflito de horário')
  @Resource('appointment')
  @RequirePermission('updateAppointment')
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    const updateData: Prisma.AppointmentUpdateInput = {};

    if (updateAppointmentDto.patientId) {
      updateData.patient = { connect: { id: updateAppointmentDto.patientId } };
    }
    if (updateAppointmentDto.psychologistId) {
      updateData.psychologist = {
        connect: { id: updateAppointmentDto.psychologistId },
      };
    }
    if (updateAppointmentDto.dateTime) {
      updateData.dateTime = new Date(updateAppointmentDto.dateTime);
    }
    if (updateAppointmentDto.duration) {
      updateData.duration = updateAppointmentDto.duration;
    }
    if (updateAppointmentDto.value) {
      updateData.value = updateAppointmentDto.value;
    }
    if (updateAppointmentDto.status) {
      updateData.status = updateAppointmentDto.status;
    }
    if (updateAppointmentDto.notes) {
      updateData.notes = updateAppointmentDto.notes;
    }
    return this.appointmentsService.updateAppointment(
      Number(id),
      updateAppointmentDto,
      user.id,
      tenantId,
    );
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('appointments', 'delete')
  @SwaggerRoute('Remover agendamento', 'Remove um agendamento do sistema')
  @SwaggerResponse(200, 'Agendamento removido com sucesso')
  @SwaggerResponse(404, 'Agendamento não encontrado')
  @Resource('appointment')
  @RequirePermission('deleteAppointment')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.appointmentsService.delete(Number(id), tenantId);
  }

  @Get('psychologist/:id')
  @Roles(Role.MASTER, Role.PSYCHOLOGIST)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('appointments', 'psychologist')
  @SwaggerRoute(
    'Listar agendamentos por psicólogo',
    'Retorna todos os agendamentos de um psicólogo específico',
  )
  @SwaggerResponse(
    200,
    'Lista de agendamentos do psicólogo retornada com sucesso',
  )
  @SwaggerResponse(404, 'Psicólogo não encontrado')
  @Resource('psychologist')
  @RequirePermission('readPsychologistAppointments')
  findByPsychologist(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.findAll({
      where: {
        psychologistId: Number(id),
        tenantId,
      },
      tenantId,
    });
  }

  @Get('patient/:id')
  @Roles(Role.MASTER, Role.PSYCHOLOGIST, Role.PATIENT)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('appointments', 'patient')
  @SwaggerRoute(
    'Listar agendamentos por paciente',
    'Retorna todos os agendamentos de um paciente específico',
  )
  @SwaggerResponse(
    200,
    'Lista de agendamentos do paciente retornada com sucesso',
  )
  @SwaggerResponse(404, 'Paciente não encontrado')
  @Resource('patient')
  @RequirePermission('readPatientAppointments')
  findByPatient(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.appointmentsService.findAll({
      where: {
        patientId: Number(id),
        tenantId,
      },
      tenantId,
    });
  }
}
