import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PriorityLevel, ProjectStatus } from '@prisma/client';

export class UpdateProjectStatusDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @IsString()
  description?: string;
}
