import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateLogframeNodeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsIn(['OUTREACH','GOAL','DEVELOPMENT_OBJECTIVE','OUTCOME','OUTPUT','SUB_OUTPUT','INDICATOR_GROUP'])
  level?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
