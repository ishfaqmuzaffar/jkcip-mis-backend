import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SchemeStatus } from '@prisma/client';

export class UpdateSchemeStatusDto {
  @IsEnum(SchemeStatus)
  status: SchemeStatus;

  @IsOptional()
  @IsString()
  description?: string;
}
