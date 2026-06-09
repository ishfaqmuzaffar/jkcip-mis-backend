import { Module } from '@nestjs/common';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SurveyController],
  providers: [SurveyService, PrismaService],
  exports: [SurveyService],
})
export class SurveyModule {}
