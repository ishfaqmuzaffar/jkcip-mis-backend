import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { SchemeStatus } from '@prisma/client';

export class CreateSchemeDto {
  @IsString()
  title: string;

  @IsString()
  code: string;

  @IsString()
  department: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsNumber()
  targetBeneficiaries?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  subComponentId?: number;   // ← NEW: links scheme to a sub-component
}
