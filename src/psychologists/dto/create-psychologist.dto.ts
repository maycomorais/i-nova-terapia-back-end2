import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  Matches,
  IsNumber,
  IsPhoneNumber,
} from 'class-validator';
import { BaseDTO } from 'src/common/dto/base.dto';
import { IsCPF } from 'src/common/validators/cpf.validator';
import { IsCRP } from 'src/common/validators/crp.validator';

export class CreatePsychologistDto extends BaseDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF inválido. Use o formato: XXX.XXX.XXX-XX',
  })
  @IsCPF()
  cpf: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{2}\/\d{3,5}$/, {
    message: 'CRP inválido. Use o formato: XX/XXXXX',
  })
  @IsCRP()
  crp: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone inválido. Use o formato: (XX) XXXXX-XXXX',
  })
  @IsPhoneNumber('BR')
  phone: string;

  @IsOptional()
  @IsNumber()
  clinicId?: number;
  password: string;
}
