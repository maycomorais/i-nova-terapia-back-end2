// src/mood-diaries/mood-diaries.module.ts
import { Module } from '@nestjs/common';
import { MoodDiariesService } from './mood-diaries.service';
import { MoodDiariesController } from './mood-diaries.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MoodDiariesController],
  providers: [MoodDiariesService],
  exports: [MoodDiariesService],
})
export class MoodDiariesModule {}
