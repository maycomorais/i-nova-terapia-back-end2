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
import { UsersService } from './users.service';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('masters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.MASTER)
  createMaster(
    @Body() createMasterDto: { email: string; name: string; password: string },
  ) {
    return this.usersService.createMaster(createMasterDto);
  }

  @Get()
  @Roles(Role.MASTER)
  findAllMasters() {
    return this.usersService.findAllMasters();
  }

  @Get(':id')
  @Roles(Role.MASTER)
  findOneMaster(@Param('id') id: string) {
    return this.usersService.findMasterById(+id);
  }

  @Patch(':id')
  @Roles(Role.MASTER)
  updateMaster(
    @Param('id') id: string,
    @Body() updateMasterDto: Prisma.UserUpdateInput,
  ) {
    return this.usersService.updateMaster(+id, updateMasterDto);
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  removeMaster(@Param('id') id: string) {
    return this.usersService.deleteMaster(+id);
  }
}
