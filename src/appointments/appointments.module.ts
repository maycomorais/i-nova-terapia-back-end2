// src/appointments/appointments.module.ts
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from '../common/repositories/appointments.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [PrismaModule, NotificationsModule, CacheModule],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsRepository, // Adicionar o repository diretamente
    {
      provide: 'IAppointmentsRepository',
      useExisting: AppointmentsRepository, // Usar useExisting em vez de useClass
    },
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
