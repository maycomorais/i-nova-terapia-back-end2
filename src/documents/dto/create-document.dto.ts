// src/documents/dto/create-document.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { DocumentType, DocumentFormat, DocumentPermission } from '../enums';
import { BaseDTO } from 'src/common/dto/base.dto';

export class CreateDocumentDto extends BaseDTO {
  @ApiProperty({
    description: 'Tipo do documento',
    enum: DocumentType,
    example: DocumentType.PATIENT_LIST,
  })
  @IsNotEmpty()
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({
    description: 'Formato do documento',
    enum: DocumentFormat,
    example: DocumentFormat.PDF,
  })
  @IsNotEmpty()
  @IsEnum(DocumentFormat)
  format: DocumentFormat;

  @ApiProperty({
    description: 'Nível de permissão do documento',
    enum: DocumentPermission,
    example: DocumentPermission.PRIVATE,
    default: DocumentPermission.PRIVATE,
  })
  @IsOptional()
  @IsEnum(DocumentPermission)
  permission?: DocumentPermission;

  @ApiProperty({
    description: 'Filtros e configurações para geração do documento',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      includeMoodGraph: true,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
