// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Serviço responsável pelo gerenciamento de usuários
 * Lida com criação, atualização, busca e remoção de usuários master
 * Mantém a integridade dos dados e regras de negócio relacionadas a usuários
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Gera um novo ID de tenant
   */
  private generateTenantId(): string {
    return uuidv4();
  }

  /**
   * Cria um novo usuário master
   * Inclui configurações de notificação padrão
   */
  async createMaster(data: {
    email: string;
    name: string;
    password: string;
    tenantId: string;
  }): Promise<Omit<User, 'password'>> {
    this.logger.debug(`Criando usuário master para tenant ${data.tenantId}`);

    // Verificar se já existe um usuário com este email
    const existingUser = await this.findMasterByEmail(data.email);
    if (existingUser) {
      throw new ForbiddenException('Email já está em uso');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const finalTenantId = data.tenantId || this.generateTenantId();

    const user = await this.prisma.$transaction(async (prisma) => {
      return await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          role: Role.MASTER,
          tenantId: finalTenantId,
          notificationSettings: {
            create: {
              emailNotifications: true,
              smsNotifications: false,
              pushNotifications: false,
              reminderTimeMinutes: 1440,
            },
          },
          master: {
            create: {
              tenantId: finalTenantId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          refreshToken: true,
          createdAt: true,
          updatedAt: true,
          phone: true,
          tenantId: true,
          notificationSettings: true,
          master: true,
        },
      });
    });

    return user;
  }

  /**
   * Busca um usuário master pelo email
   */
  async findMasterByEmail(
    email: string,
    tenantId?: string,
  ): Promise<Omit<User, 'password'> | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        role: Role.MASTER,
        ...(tenantId && { tenantId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
        notificationSettings: true,
        master: true,
      },
    });
  }

  /**
   * Busca um usuário master pelo ID
   */
  async findMasterById(
    id: number,
    tenantId: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.MASTER,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
        notificationSettings: true,
        master: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário master com ID ${id} não encontrado`);
    }

    return user;
  }

  /**
   * Lista todos os usuários master de um tenant
   */
  async findAllMasters(tenantId: string): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      where: {
        role: Role.MASTER,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
        notificationSettings: true,
        master: true,
      },
    });
  }

  /**
   * Atualiza um usuário master
   */
  async updateMaster(
    id: number,
    data: Prisma.UserUpdateInput,
    tenantId: string,
  ): Promise<Omit<User, 'password'>> {
    // Verificar se o usuário existe no tenant
    await this.findMasterById(id, tenantId);

    // Se estiver atualizando o email, verificar se já existe
    if (data.email) {
      const existingUser = await this.findMasterByEmail(
        data.email as string,
        tenantId,
      );
      if (existingUser && existingUser.id !== id) {
        throw new ForbiddenException('Email já está em uso');
      }
    }

    // Se houver senha, fazer hash
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    }

    return this.prisma.user.update({
      where: {
        id,
        tenantId,
      },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
        notificationSettings: true,
        master: true,
      },
    });
  }

  /**
   * Remove um usuário master
   */
  async deleteMaster(
    id: number,
    tenantId: string,
  ): Promise<Omit<User, 'password'>> {
    // Verificar se o usuário existe no tenant
    await this.findMasterById(id, tenantId);

    return this.prisma.user.delete({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
        notificationSettings: true,
        master: true,
      },
    });
  }

  /**
   * Obtém as configurações de notificação de um usuário
   */
  async getNotificationSettings(userId: number, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
        notificationSettings: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    return user?.notificationSettings || null;
  }

  /**
   * Atualiza as configurações de notificação de um usuário
   */
  async updateNotificationSettings(
    userId: number,
    tenantId: string,
    data: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      pushNotifications?: boolean;
      reminderTimeMinutes?: number;
    },
  ) {
    // Verificar se o usuário existe no tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    const existingSettings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (existingSettings) {
      return this.prisma.notificationSettings.update({
        where: { userId },
        data,
      });
    } else {
      return this.prisma.notificationSettings.create({
        data: {
          ...data,
          userId,
        },
      });
    }
  }
}
