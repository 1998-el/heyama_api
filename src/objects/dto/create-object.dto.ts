import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateObjectDto {
  @IsString()
  @IsNotEmpty({ message: 'le titre est obligatoire' })
  @MaxLength(120)
  title: string;

  // optional, defaults to an empty string if nothing is provided
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
