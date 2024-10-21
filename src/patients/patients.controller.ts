import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  create(@Body() createPatientDto: Prisma.PatientCreateInput) {
    return this.patientsService.createPatient(createPatientDto);
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  findAll() {
    return this.patientsService.patients({});
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  findOne(@Param('id') id: string) {
    return this.patientsService.patient({ id: Number(id) });
  }

  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: Prisma.PatientUpdateInput,
  ) {
    return this.patientsService.updatePatient({
      where: { id: Number(id) },
      data: updatePatientDto,
    });
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  remove(@Param('id') id: string) {
    return this.patientsService.deletePatient({ id: Number(id) });
  }
}
