import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MprController } from './mpr.controller';
import { MprService } from './mpr.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MprController],
  providers: [MprService, PrismaService],
  exports: [MprService],
})
export class MprModule {}
