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
import { ClinicsService } from './clinics.service';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @Roles(Role.MASTER)
  create(@Body() createClinicDto: Prisma.ClinicCreateInput) {
    return this.clinicsService.createClinic(createClinicDto);
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC)
  findAll() {
    return this.clinicsService.clinics({});
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC)
  findOne(@Param('id') id: string) {
    return this.clinicsService.clinic({ id: Number(id) });
  }

  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC)
  update(
    @Param('id') id: string,
    @Body() updateClinicDto: Prisma.ClinicUpdateInput,
  ) {
    return this.clinicsService.updateClinic({
      where: { id: Number(id) },
      data: updateClinicDto,
    });
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  remove(@Param('id') id: string) {
    return this.clinicsService.deleteClinic({ id: Number(id) });
  }
}
