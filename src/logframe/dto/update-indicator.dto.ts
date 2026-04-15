import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateIndicatorDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

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

  @IsOptional()
  @IsNumber()
  logframeNodeId?: number;
}