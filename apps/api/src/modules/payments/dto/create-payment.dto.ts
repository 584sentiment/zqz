import { IsString, IsIn, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsIn(['basic', 'pro'])
  plan: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  period?: number; // 购买月数，默认 1 个月
}
