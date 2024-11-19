// src/documents/dto/generate-document.dto.ts
import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType, DocumentFormat } from '@prisma/client';

export class GenerateDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Tipo do documento a ser gerado',
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @ApiProperty({
    enum: DocumentFormat,
    description: 'Formato do documento',
    default: DocumentFormat.PDF,
  })
  @IsEnum(DocumentFormat)
  @IsNotEmpty()
  format: DocumentFormat = DocumentFormat.PDF;

  @ApiProperty({
    description: 'Filtros para geração do documento',
    required: false,
    // Corrigindo o tipo para Object
    type: Object,
    example: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      patientId: 1,
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
