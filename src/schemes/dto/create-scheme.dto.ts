import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSchemeDto {
  @IsString()
  title: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  department: string;

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
  targetBeneficiaries?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  achievedBeneficiaries?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
