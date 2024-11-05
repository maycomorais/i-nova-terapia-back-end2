// src/clinics/dto/update-clinic.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateClinicDto } from './create-clinic.dto';

export class UpdateClinicDto extends PartialType(CreateClinicDto) {}
