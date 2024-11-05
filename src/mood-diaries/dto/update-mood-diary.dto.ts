// src/mood-diaries/dto/update-mood-diary.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateMoodDiaryDto } from './create-mood-diary.dto';

export class UpdateMoodDiaryDto extends PartialType(CreateMoodDiaryDto) {}
