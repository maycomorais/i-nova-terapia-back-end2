import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { MetricsInterceptor } from './health/interceptors/metrics.interceptor';
import { MetricsService } from './health/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Clínica API')
    .setDescription('API para gestão de clínicas psicológicas')
    .setVersion('1.0')
    .addTag('auth', 'Endpoints de autenticação')
    .addTag('appointments', 'Gestão de consultas')
    .addTag('patients', 'Gestão de pacientes')
    .addTag('psychologists', 'Gestão de psicólogos')
    .addTag('clinics', 'Gestão de clínicas')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Configuração do ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //Remove propriedades não decoradas com validadores
      transform: true, // Transforma tipos automaticamente
      forbidNonWhitelisted: true, // Lança erro se houver propriedades não permitidas
      transformOptions: {
        enableImplicitConversion: true, // Permite conversão implícita de tipos
      },
    }),
  );

  // Filtro de exceções global
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Interceptors globais
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Middleware do Tenant
  const tenantMiddleware = new TenantMiddleware();
  app.use(tenantMiddleware.use.bind(tenantMiddleware));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
