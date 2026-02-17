import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Prisma } from '@prisma/client';

export enum JobSourceType {
  TEXT = 'text',
  LINK = 'link',
  SCREENSHOT = 'screenshot',
}

export class CreateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(JobSourceType)
  sourceType: JobSourceType;

  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  requirements?: Prisma.InputJsonValue;
}

export class ParseJobTextDto {
  @IsString()
  text: string;
}

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  requirements?: Prisma.InputJsonValue;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export interface ParsedJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  experience?: string;
  education?: string;
  description?: string;
  requirements: string[];
  niceToHave: string[];
  skills: string[];
  confidence: number;
}
