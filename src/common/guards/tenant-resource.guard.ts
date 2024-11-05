// src/common/guards/tenant-resource.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantResourceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // const user = request.user;
    const resourceId = request.params.id;
    const tenantId = request.headers['x-tenant-id'];
    const resource = this.reflector.get<string>(
      'resource',
      context.getHandler(),
    );

    if (!resource || !resourceId) {
      return true;
    }

    // Verificar se o recurso pertence ao tenant do usuário
    let resourceExists = false;

    switch (resource) {
      case 'appointment':
        resourceExists =
          (await this.prisma.appointment.findFirst({
            where: { id: Number(resourceId), tenantId },
          })) !== null;
        break;
      case 'patient':
        resourceExists =
          (await this.prisma.patient.findFirst({
            where: { id: Number(resourceId), tenantId },
          })) !== null;
        break;
      case 'psychologist':
        resourceExists =
          (await this.prisma.psychologist.findFirst({
            where: { id: Number(resourceId), tenantId },
          })) !== null;
        break;
      case 'clinic':
        resourceExists =
          (await this.prisma.clinic.findFirst({
            where: { id: Number(resourceId), tenantId },
          })) !== null;
        break;
      default:
        return true;
    }

    if (!resourceExists) {
      throw new ForbiddenException('Recurso não pertence ao tenant atual');
    }

    return true;
  }
}
