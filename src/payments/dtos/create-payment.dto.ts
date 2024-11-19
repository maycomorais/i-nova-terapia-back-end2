// src/payments/dtos/create-payment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PaymentSplitDto {
  @ApiProperty({ description: 'ID do recebedor (psicólogo ou clínica)' })
  @IsNumber()
  receiverId: number;

  @ApiProperty({
    description: 'Porcentagem do split',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  percentage: number;
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsNumber()
  appointmentId: number;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  installments?: number;

  @ApiProperty({ required: false, type: [PaymentSplitDto] })
  @IsOptional()
  @IsArray()
  splits?: PaymentSplitDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  notes?: string;
}
