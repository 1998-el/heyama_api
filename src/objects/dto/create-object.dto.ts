import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateObjectDto {
  @IsString()
  @IsNotEmpty({ message: 'le titre est obligatoire' })
  @MaxLength(120)
  title: string;

  // optionnel, on met une chaine vide par défaut si rien n'est envoyé
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
