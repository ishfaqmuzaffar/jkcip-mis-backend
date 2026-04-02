import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  fullName: string;

  @IsString()
  referenceNumber: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  age?: number;

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
  @IsBoolean()
  isYouth?: boolean;

  @IsOptional()
  @IsBoolean()
  isWoman?: boolean;

  @IsOptional()
  @IsBoolean()
  isBpl?: boolean;

  @IsOptional()
  @IsBoolean()
  isGeneral?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sanctionedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  schemeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}
