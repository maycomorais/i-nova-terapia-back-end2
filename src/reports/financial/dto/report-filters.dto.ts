// src/reports/financial/dto/report-filters.dto.ts
import { IsDateString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum ReportGroupBy {
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  CLINIC = 'CLINIC',
  PAYMENT_METHOD = 'PAYMENT_METHOD',
  STATUS = 'STATUS',
}

export class FinancialReportFiltersDto {
  @ApiProperty({ enum: ReportPeriod })
  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, enum: ReportGroupBy })
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  psychologistId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  clinicId?: number;
}
