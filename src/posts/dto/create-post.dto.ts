import { IsOptional, IsString, MaxLength, IsArray, IsEnum } from 'class-validator';
import { PostStatus } from '../schemas/post.schema';

export class CreatePostDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
