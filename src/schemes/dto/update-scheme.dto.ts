// src/schemes/dto/update-scheme.dto.ts
import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { SchemeStatus } from '@prisma/client';

export class UpdateSchemeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SchemeStatus)
  status?: SchemeStatus;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsNumber()
  utilizedBudget?: number;

  @IsOptional()
  @IsNumber()
  targetBeneficiaries?: number;

  @IsOptional()
  @IsNumber()
  achievedBeneficiaries?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  subComponentId?: number;   // ← assign/change sub-component
}