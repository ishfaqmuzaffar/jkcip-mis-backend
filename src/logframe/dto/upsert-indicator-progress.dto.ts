import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertIndicatorProgressDto {
  @IsInt()
  reportYear: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  annualTarget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  annualResult?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cumulativeTarget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cumulativeResult?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maleValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  femaleValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  youthValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  indigenousValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  householdValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  womenHeadedHouseholdValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bplValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  generalValue?: number;

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
  @IsObject()
  dimensionValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  evidenceSource?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsInt()
  reportingMonth?: number;

  @IsOptional()
  @IsString()
  lastReportedAt?: string;
}
