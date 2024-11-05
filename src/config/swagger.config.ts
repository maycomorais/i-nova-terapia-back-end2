// src/config/swagger.config.ts
import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Clínica API')
  .setDescription(
    `
    # API para Gestão de Clínicas Psicológicas

    ## Funcionalidades

    - Gestão de usuários e autenticação
    - Agendamento de consultas
    - Gestão de pacientes e psicólogos
    - Controle financeiro
    - Notificações automáticas
    
    ## Autenticação

    A API utiliza autenticação JWT. Para acessar endpoints protegidos:
    1. Faça login através do endpoint /auth/login
    2. Use o token retornado no header Authorization
  `,
  )
  .setVersion('1.0')
  .addBearerAuth()
  .build();
