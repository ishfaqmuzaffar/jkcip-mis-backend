import { IsDateString, IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { PriorityLevel } from '@prisma/client';

export class CreateApprovalDto {
  @IsString()
  title: string;

  @IsString()
  referenceNo: string;

  @IsString()
  entityType: string;

  @IsString()
  department: string;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  entityId?: number;

  @IsOptional()
  @IsNumber()
  projectId?: number;
}
