// src/documents/dto/document-filters.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsBoolean, IsNumber } from 'class-validator';

export class DocumentFiltersDto {
  @ApiProperty({
    description: 'Data inicial para relatórios',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Data final para relatórios',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'ID do paciente para relatórios específicos',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  patientId?: number;

  @ApiProperty({
    description: 'ID da clínica para relatórios específicos',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  clinicId?: number;

  @ApiProperty({
    description: 'ID do psicólogo para relatórios específicos',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  psychologistId?: number;

  @ApiProperty({
    description: 'Incluir gráfico de humor no relatório',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeMoodGraph?: boolean;
}
