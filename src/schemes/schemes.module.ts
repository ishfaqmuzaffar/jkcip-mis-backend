import { Module } from '@nestjs/common';
import { SchemesController } from './schemes.controller';
import { SchemesService } from './schemes.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SchemesController],
  providers: [SchemesService, PrismaService],
  exports: [SchemesService],
})
export class SchemesModule {}
