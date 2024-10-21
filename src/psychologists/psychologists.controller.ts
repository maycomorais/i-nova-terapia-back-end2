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
import { PsychologistsService } from './psychologists.service';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('psychologists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PsychologistsController {
  constructor(private readonly psychologistsService: PsychologistsService) {}

  @Post()
  @Roles(Role.MASTER, Role.CLINIC)
  create(@Body() createPsychologistDto: Prisma.PsychologistCreateInput) {
    return this.psychologistsService.createPsychologist(createPsychologistDto);
  }

  @Get()
  @Roles(Role.MASTER, Role.CLINIC)
  findAll() {
    return this.psychologistsService.psychologists({});
  }

  @Get(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  findOne(@Param('id') id: string) {
    return this.psychologistsService.psychologist({ id: Number(id) });
  }

  @Patch(':id')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  update(
    @Param('id') id: string,
    @Body() updatePsychologistDto: Prisma.PsychologistUpdateInput,
  ) {
    return this.psychologistsService.updatePsychologist({
      where: { id: Number(id) },
      data: updatePsychologistDto,
    });
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  remove(@Param('id') id: string) {
    return this.psychologistsService.deletePsychologist({ id: Number(id) });
  }
}
