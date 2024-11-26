import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClinicsModule } from './clinics/clinics.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PsychologistsModule } from './psychologists/psychologists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';
import { AsaasModule } from './asaas/asaas.module';
import { TenantResourceGuard } from './common/guards/tenant-resource.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { HealthModule } from './health/health.module';
import { ConfigModule } from '@nestjs/config';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { MoodDiariesModule } from './mood-diaries/mood-diaries.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './health/interceptors/metrics.interceptor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    PrismaModule,
    AuthModule,
    ClinicsModule,
    PsychologistsModule,
    PatientsModule,
    AppointmentsModule,
    NotificationsModule,
    TasksModule,
    AsaasModule,
    HealthModule,
    MoodDiariesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TenantResourceGuard,
    PermissionGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [TenantResourceGuard, PermissionGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
