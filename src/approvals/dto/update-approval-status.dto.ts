import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus, PriorityLevel } from '@prisma/client';

export class UpdateApprovalStatusDto {
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @IsString()
  remarks?: string;
}
