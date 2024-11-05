// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  SwaggerRoute,
  SwaggerResponse,
} from '../common/decorators/swagger.decorators';
import { CurrentTenant } from 'src/common/decorators/tenant.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Controller responsável pelas rotas de autenticação
 * Gerencia registro, login, logout e refresh de tokens
 */
@Controller('auth')
@ApiTags('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * Registra um novo usuário master no sistema
   */
  @Post('register')
  @ApiTags('auth', 'register')
  @SwaggerRoute(
    'Registrar usuário master',
    'Cria um novo usuário master no sistema',
  )
  @SwaggerResponse(201, 'Usuário criado com sucesso')
  @SwaggerResponse(400, 'Dados inválidos')
  @SwaggerResponse(409, 'Email já está em uso')
  async register(
    @Body()
    registerDto: RegisterDto,
    @CurrentTenant() tenantId: string,
  ) {
    this.logger.debug(`Tentativa de registro para email: ${registerDto.email}`);

    const user = await this.authService.register({
      ...registerDto,
      tenantId,
    });

    // O usuário já vem sem campos sensíveis do service
    return user;
  }

  /**
   * Realiza o login do usuário
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiTags('auth', 'login')
  @SwaggerRoute(
    'Login de usuário',
    'Autentica um usuário e retorna tokens de acesso',
  )
  @SwaggerResponse(200, 'Login realizado com sucesso')
  @SwaggerResponse(401, 'Credenciais inválidas')
  @SwaggerResponse(
    429,
    'Muitas tentativas de login - aguarde antes de tentar novamente',
  )
  async login(@Body() loginDto: LoginDto) {
    this.logger.debug(`Tentativa de login para email: ${loginDto.email}`);

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.authService.login(user);
  }

  /**
   * Realiza o logout do usuário
   */
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Post('logout')
  @ApiTags('auth', 'logout')
  @SwaggerRoute('Logout de usuário', 'Invalida o token atual do usuário')
  @SwaggerResponse(200, 'Logout realizado com sucesso')
  @SwaggerResponse(401, 'Não autorizado - Token inválido ou expirado')
  async logout(@Req() req: any) {
    this.logger.debug(`Logout para usuário ID: ${req.user.id}`);

    await this.authService.logout(req.user.id);
    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * Atualiza o token de acesso usando refresh token
   */
  @Post('refresh')
  @SkipThrottle()
  @ApiTags('auth', 'token')
  @SwaggerRoute(
    'Atualizar token',
    'Gera um novo token de acesso usando o refresh token',
  )
  @SwaggerResponse(200, 'Novo token gerado com sucesso')
  @SwaggerResponse(401, 'Refresh token inválido ou expirado')
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: any,
  ) {
    this.logger.debug(`Refresh token para usuário ID: ${req.user.id}`);

    return this.authService.refreshTokens(
      req.user.id,
      refreshTokenDto.refreshToken,
    );
  }
}
