// src/payments/dtos/payment-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  appointmentId: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  discount: number | null;

  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ required: false })
  installments?: number;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  asaasPaymentId?: string;

  @ApiProperty({ required: false })
  asaasInvoiceUrl?: string;

  @ApiProperty({ required: false })
  asaasPixCode?: string;

  @ApiProperty({ required: false })
  asaasBoletoCode?: string;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
