import { IsEmail, IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { VerificationPurpose } from '../../users/entities/user.entity.js';

export class VerifyCodeDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;

  @IsEnum(VerificationPurpose)
  purpose: VerificationPurpose;
}
