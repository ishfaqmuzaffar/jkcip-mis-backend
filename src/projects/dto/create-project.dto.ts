import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PriorityLevel, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  department: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  utilizedBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  achievedCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  beneficiaryCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  schemeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
