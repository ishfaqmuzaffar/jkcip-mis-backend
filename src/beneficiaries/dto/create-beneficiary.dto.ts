import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  fullName: string;

  @IsString()
  referenceNumber: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsNumber()
  sanctionedAmount?: number;

  @IsOptional()
  @IsNumber()
  schemeId?: number;

  @IsOptional()
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}
