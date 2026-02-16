import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
