import { IsOptional, IsString, MaxLength, IsArray } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
