import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateEducationDto {
  @IsString()
  @MaxLength(100)
  school: string;

  @IsString()
  @MaxLength(50)
  degree: string;

  @IsString()
  @MaxLength(100)
  major: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateEducationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  school?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  degree?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  major?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
