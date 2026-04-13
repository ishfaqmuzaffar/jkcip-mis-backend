import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateIndicatorDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  logframeNodeId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseline?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  midTarget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  endTarget?: number;

  @IsOptional()
  @IsIn(['MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','BIENNIAL','MID_TERM','END_TERM','AD_HOC'])
  frequency?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  responsibility?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  crop?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  dimensionConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  supportsDistrictBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsBlockBreakdown?: boolean;

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
  active?: boolean;
}
