// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from 'src/common/repositories/payments.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AsaasModule } from '../asaas/asaas.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, AsaasModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: 'IPaymentsRepository',
      useClass: PaymentsRepository,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
