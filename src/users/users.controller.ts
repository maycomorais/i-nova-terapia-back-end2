// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
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

@Controller('masters')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('masters')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.MASTER)
  @ApiTags('masters', 'create')
  @SwaggerRoute(
    'Criar usuário master',
    'Cria um novo usuário com privilégios de master',
  )
  @SwaggerResponse(201, 'Usuário master criado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(409, 'Email já está em uso')
  createMaster(
    @Body() createMasterDto: { email: string; name: string; password: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.createMaster({
      ...createMasterDto,
      tenantId,
    });
  }

  @Get()
  @Roles(Role.MASTER)
  @ApiTags('masters', 'list')
  @SwaggerRoute(
    'Listar usuários master',
    'Retorna lista de todos os usuários master',
  )
  @SwaggerResponse(200, 'Lista de usuários master retornada com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  findAllMasters(@CurrentTenant() tenantId: string) {
    return this.usersService.findAllMasters(tenantId);
  }

  @Get(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('masters', 'read')
  @SwaggerRoute(
    'Buscar usuário master por ID',
    'Retorna os dados de um usuário master específico',
  )
  @SwaggerResponse(200, 'Usuário master encontrado')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(404, 'Usuário master não encontrado')
  @Resource('user')
  @RequirePermission('readMaster')
  findOneMaster(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.findMasterById(+id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('masters', 'update')
  @SwaggerRoute(
    'Atualizar usuário master',
    'Atualiza os dados de um usuário master existente',
  )
  @SwaggerResponse(200, 'Usuário master atualizado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(404, 'Usuário master não encontrado')
  @SwaggerResponse(409, 'Email já está em uso')
  @Resource('user')
  @RequirePermission('updateMaster')
  updateMaster(
    @Param('id') id: string,
    @Body() updateMasterDto: Prisma.UserUpdateInput,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    // Verificar se o usuário está tentando atualizar a si mesmo
    if (user.id === +id) {
      return this.usersService.updateMaster(+id, updateMasterDto, tenantId);
    }
    return this.usersService.updateMaster(+id, updateMasterDto, tenantId);
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  @UseGuards(TenantResourceGuard, PermissionGuard)
  @ApiTags('masters', 'delete')
  @SwaggerRoute('Remover usuário master', 'Remove um usuário master do sistema')
  @SwaggerResponse(200, 'Usuário master removido com sucesso')
  @SwaggerResponse(401, 'Não autorizado')
  @SwaggerResponse(403, 'Permissão insuficiente - Apenas MASTER')
  @SwaggerResponse(404, 'Usuário master não encontrado')
  @Resource('user')
  @RequirePermission('deleteMaster')
  removeMaster(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    // Impedir que um usuário delete a si mesmo
    if (user.id === +id) {
      throw new ForbiddenException(
        'Não é possível remover seu próprio usuário',
      );
    }
    return this.usersService.deleteMaster(+id, tenantId);
  }
}
