import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'resetToken is invalid' })
  resetToken: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
