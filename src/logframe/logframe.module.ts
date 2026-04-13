import { Module } from '@nestjs/common';
import { LogframeController } from './logframe.controller';
import { LogframeService } from './logframe.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LogframeController],
  providers: [LogframeService, PrismaService],
})
export class LogframeModule {}
