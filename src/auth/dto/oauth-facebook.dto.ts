import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthFacebookDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
