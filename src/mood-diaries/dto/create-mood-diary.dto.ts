// src/mood-diaries/dto/create-mood-diary.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { BaseDTO } from 'src/common/dto/base.dto';

export class CreateMoodDiaryDto extends BaseDTO {
  @ApiProperty({
    description: 'ID do paciente',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  patientId: number;

  @ApiProperty({
    description: 'Nível de humor (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  mood: number;

  @ApiProperty({
    description: 'Observações sobre o humor',
    example: 'Me senti mais disposto hoje.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
