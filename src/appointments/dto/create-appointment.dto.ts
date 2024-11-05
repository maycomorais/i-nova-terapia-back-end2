// src/appointments/dto/create-appointment.dto.ts
import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID do paciente',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  patientId: number;

  @ApiProperty({
    description: 'ID do psicólogo',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  psychologistId: number;

  @ApiProperty({
    description: 'Data e hora da consulta',
    example: '2024-01-01T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  dateTime: string;

  @ApiProperty({
    description: 'Duração da consulta em minutos',
    minimum: 15,
    maximum: 240,
    example: 50,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  @Max(240)
  @Transform(({ value }) => Number(value))
  duration: number;

  @ApiProperty({
    description: 'Valor da consulta',
    minimum: 0,
    example: 200.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  value: number;

  @ApiProperty({
    description: 'Status do agendamento',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus = AppointmentStatus.SCHEDULED;

  @ApiProperty({
    description: 'Observações sobre a consulta',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
