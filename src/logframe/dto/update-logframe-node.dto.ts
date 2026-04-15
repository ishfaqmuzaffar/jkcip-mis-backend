import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { LogframeLevel } from '@prisma/client';

export class UpdateLogframeNodeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(LogframeLevel)
  level?: LogframeLevel;

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
