import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateIndicatorDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  baseline?: number;

  @IsOptional()
  @IsNumber()
  midTarget?: number;

  @IsOptional()
  @IsNumber()
  endTarget?: number;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  responsibility?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Breakdown flags
  @IsOptional()
  @IsBoolean()
  supportsGenderBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsYouthBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsIndigenousBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsHouseholdBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsBlockBreakdown?: boolean;

  @IsNumber()
  logframeNodeId: number;
}