import { Module } from '@nestjs/common';
import { PsychologistsService } from './psychologists.service';
import { PsychologistsController } from './psychologists.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PsychologistsService],
  controllers: [PsychologistsController],
})
export class PsychologistsModule {}
