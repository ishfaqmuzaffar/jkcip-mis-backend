import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BeneficiaryStatus } from '@prisma/client';

export class UpdateBeneficiaryStatusDto {
  @IsEnum(BeneficiaryStatus)
  status: BeneficiaryStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
