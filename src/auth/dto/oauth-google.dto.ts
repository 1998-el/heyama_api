import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthGoogleDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
