import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cria um novo usuário master
   * @param data Dados do usuário master a ser criado
   * @returns O usuário master criado
   */
  async createMaster(data: {
    email: string;
    name: string;
    password: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: Role.MASTER,
        notificationSettings: {
          create: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: false,
            reminderTimeMinutes: 1440,
          },
        },
      },
      include: {
        notificationSettings: true,
      },
    });
  }

  /**
   * Busca um usuário master pelo e-mail
   * @param email E-mail do usuário master
   * @returns O usuário master encontrado ou null se não existir
   */
  async findMasterByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email, role: Role.MASTER },
      include: {
        notificationSettings: true,
      },
    });
  }

  /**
   * Busca um usuário master pelo ID
   * @param id ID do usuário master
   * @returns O usuário master encontrado ou null se não existir
   */
  async findMasterById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id, role: Role.MASTER },
      include: {
        notificationSettings: true,
      },
    });
  }

  /**
   * Busca todos os usuários master
   * @returns Array de usuários master
   */
  async findAllMasters(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role: Role.MASTER },
      include: {
        notificationSettings: true,
      },
    });
  }

  /**
   * Atualiza um usuário master
   * @param id ID do usuário master a ser atualizado
   * @param data Dados a serem atualizados
   * @returns O usuário master atualizado
   */
  async updateMaster(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id, role: Role.MASTER },
      data,
      include: {
        notificationSettings: true,
      },
    });
  }

  /**
   * Remove um usuário master
   * @param id ID do usuário master a ser removido
   * @returns O usuário master removido
   */
  async deleteMaster(id: number): Promise<User> {
    return this.prisma.user.delete({
      where: { id, role: Role.MASTER },
      include: {
        notificationSettings: true,
      },
    });
  }

  /**
   * Obtém as configurações de notificação de um usuário
   * @param userId ID do usuário
   * @returns As configurações de notificação do usuário ou null se não existirem
   */
  async getNotificationSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        notificationSettings: true,
      },
    });
    return user?.notificationSettings || null;
  }

  /**
   * Atualiza as configurações de notificação de um usuário
   * @param userId ID do usuário
   * @param data Novas configurações de notificação
   * @returns As configurações de notificação atualizadas
   */
  async updateNotificationSettings(
    userId: number,
    data: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      pushNotifications?: boolean;
      reminderTimeMinutes?: number;
    },
  ) {
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
