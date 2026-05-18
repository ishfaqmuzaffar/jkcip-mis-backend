import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

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
  utilizedBudget?: number;        // ← kept from original

  @IsOptional()
  @IsNumber()
  targetBeneficiaries?: number;

  @IsOptional()
  @IsNumber()
  achievedBeneficiaries?: number; // ← kept from original

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  subComponentId?: number;        // ← new field
}
