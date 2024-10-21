import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma, Role, NotificationSettings } from '@prisma/client';
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
    });
  }

  /**
   * Busca todos os usuários master
   * @returns Array de usuários master
   */
  async findAllMasters(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role: Role.MASTER },
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
    });
  }

  /**
   * Obtém as configurações de notificação de um usuário
   * @param userId ID do usuário
   * @returns As configurações de notificação do usuário ou null se não existirem
   */
  async getNotificationSettings(userId: number): Promise<NotificationSettings | null> {
    return this.prisma.notificationSettings.findUnique({
      where: { userId },
    });
  }

  /**
   * Atualiza as configurações de notificação de um usuário
   * @param userId ID do usuário
   * @param data Novas configurações de notificação
   * @returns As configurações de notificação atualizadas
   */
  async updateNotificationSettings(
    userId: number,
    data: Prisma.NotificationSettingsUpdateInput,
  ): Promise<NotificationSettings> {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: data,
      create: { ...data, userId },
    });
  }
}
