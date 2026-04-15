import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { LogframeLevel } from '@prisma/client';

export class CreateLogframeNodeDto {
  @IsString()
  title: string;

  @IsString()
  code: string;

  @IsEnum(LogframeLevel)
  level: LogframeLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
