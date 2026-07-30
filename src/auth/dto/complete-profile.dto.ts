import { IsString, IsOptional, IsUrl, IsArray, ArrayMaxSize } from 'class-validator';

export class CompleteProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20) // évite un abus (payload de test envoie déjà 20 items)
  expertise?: string[];
}