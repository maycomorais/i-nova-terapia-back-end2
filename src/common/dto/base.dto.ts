import { IsNotEmpty, IsString } from 'class-validator';

export class BaseDTO {
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
