import { Module } from '@nestjs/common';
import { AWPBController } from './awpb.controller';
import { AWPBService } from './awpb.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AWPBController],
  providers: [AWPBService, PrismaService],
})
export class AWPBModule {}
