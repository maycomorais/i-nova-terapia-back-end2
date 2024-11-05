// src/common/guards/permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;
    const action = this.reflector.get<string>('action', context.getHandler());

    if (!action || !resourceId) {
      return true;
    }

    // Verificações específicas por tipo de usuário e ação
    switch (user.role) {
      case Role.PSYCHOLOGIST:
        if (action === 'readAppointment') {
          const appointment = await this.prisma.appointment.findUnique({
            where: { id: Number(resourceId) },
            include: { psychologist: true },
          });
          return appointment?.psychologist.userId === user.id;
        }
        break;

      case Role.PATIENT:
        if (action === 'readAppointment') {
          const appointment = await this.prisma.appointment.findUnique({
            where: { id: Number(resourceId) },
            include: { patient: true },
          });
          return appointment?.patient.userId === user.id;
        }
        break;

      case Role.CLINIC:
        if (action === 'readPsychologist') {
          const psychologist = await this.prisma.psychologist.findUnique({
            where: { id: Number(resourceId) },
            include: { clinic: true },
          });
          return psychologist?.clinic.userId === user.id;
        }
        break;

      case Role.MASTER:
        return true;
    }

    throw new ForbiddenException('Sem permissão para acessar este recurso');
  }
}
