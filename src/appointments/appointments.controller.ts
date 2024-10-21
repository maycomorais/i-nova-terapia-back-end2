import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.MASTER, Role.PSYCHOLOGIST)
  async create(@Body() createAppointmentDto: Prisma.AppointmentCreateInput) {
    try {
      return await this.appointmentsService.createAppointment(
        createAppointmentDto,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível criar o agendamento.');
    }
  }

  @Patch(':id/cancel')
  @Roles(Role.MASTER, Role.PSYCHOLOGIST, Role.PATIENT)
  async cancelAppointment(
    @Param('id') id: string,
    @Body('cancelledBy') cancelledBy: 'PATIENT' | 'PROFESSIONAL',
  ) {
    try {
      return await this.appointmentsService.cancelAppointment(
        Number(id),
        cancelledBy,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':id/complete')
  @Roles(Role.MASTER, Role.PSYCHOLOGIST)
  async completeAppointment(@Param('id') id: string) {
    try {
      return await this.appointmentsService.completeAppointment(Number(id));
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  findAll() {
    return this.appointmentsService.appointments({});
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  findOne(@Param('id') id: string) {
    return this.appointmentsService.appointment({ id: Number(id) });
  }

  @Get('psychologist/:id')
  @Roles(Role.MASTER, Role.PSYCHOLOGIST)
  findByPsychologist(@Param('id') id: string) {
    return this.appointmentsService.findAppointmentsByPsychologist(+id);
  }

  @Get('patient/:id')
  @Roles(Role.MASTER, Role.PSYCHOLOGIST, Role.PATIENT)
  findByPatient(@Param('id') id: string) {
    return this.appointmentsService.findAppointmentsByPatient(+id);
  }

  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: Prisma.AppointmentUpdateInput,
  ) {
    return this.appointmentsService.updateAppointment({
      where: { id: Number(id) },
      data: updateAppointmentDto,
    });
  }

  @Delete(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  remove(@Param('id') id: string) {
    return this.appointmentsService.deleteAppointment({ id: Number(id) });
  }
}
