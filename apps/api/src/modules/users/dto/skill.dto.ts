import { IsString, IsOptional, IsInt, Min, Max, IsIn, IsNotEmpty } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['technical', 'soft', 'language'])
  category: string;

  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  years?: number;
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['technical', 'soft', 'language'])
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  level?: number;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  years?: number;
}
