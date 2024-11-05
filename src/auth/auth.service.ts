// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Tokens } from './interfaces/tokens.interface';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Serviço responsável pela autenticação e autorização
 * Gerencia registro, login, logout e refresh de tokens
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Registra um novo usuário master
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    tenantId: string;
  }) {
    this.logger.debug(`Registrando novo usuário: ${data.email}`);

    // Verificar se o email já existe
    const existingUser = await this.usersService.findMasterByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Criar o usuário
    const user = await this.usersService.createMaster({
      name: data.name,
      email: data.email,
      password: data.password,
      tenantId: data.tenantId,
    });

    return user;
  }

  /**
   * Valida as credenciais do usuário
   */
  async validateUser(email: string, pass: string): Promise<any> {
    this.logger.debug(`Validando credenciais para: ${email}`);

    const user = await this.prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true, // Necessário para validação
        role: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
        notificationSettings: true,
      },
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }

    throw new UnauthorizedException('Credenciais inválidas');
  }

  /**
   * Realiza o login do usuário
   */
  async login(user: any): Promise<Tokens> {
    this.logger.debug(`Realizando login para usuário ID: ${user.id}`);

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Realiza o logout do usuário
   */
  async logout(userId: number): Promise<boolean> {
    this.logger.debug(`Realizando logout para usuário ID: ${userId}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
      },
    });
    return true;
  }

  /**
   * Atualiza os tokens de acesso usando o refresh token
   */
  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    this.logger.debug(`Atualizando tokens para usuário ID: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
      },
    });

    if (!user || !user.refreshToken)
      throw new UnauthorizedException('Acesso negado');

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) throw new UnauthorizedException('Acesso negado');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Gera novos tokens de acesso e refresh
   */
  private async getTokens(
    userId: number,
    email: string,
    role: string,
  ): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Atualiza o refresh token do usuário
   */
  private async updateRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        tenantId: true,
      },
    });
  }
}
