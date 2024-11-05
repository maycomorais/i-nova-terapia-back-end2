// src/clinics/dto/create-clinic.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsPhoneNumber,
} from 'class-validator';

export class CreateClinicDto {
  @ApiProperty({
    description: 'Nome da clínica',
    example: 'Clínica Exemplo',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'CNPJ da clínica',
    example: '12.345.678/0001-90',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX',
  })
  cnpj?: string;

  @ApiProperty({
    description: 'Endereço da clínica',
    example: 'Rua Exemplo, 123',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Telefone da clínica',
    example: '(11) 99999-9999',
  })
  @IsPhoneNumber('BR')
  phone: string;

  @ApiProperty({
    description: 'ID do usuário associado à clínica',
    example: 1,
  })
  @IsNotEmpty()
  userId: number;
}
