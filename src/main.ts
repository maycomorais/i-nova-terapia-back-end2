import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantMiddleware } from './middlewares/tenant.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const tenantMiddleware = new TenantMiddleware();
  app.use(tenantMiddleware.use.bind(tenantMiddleware));
  await app.listen(3000);
}
bootstrap();
