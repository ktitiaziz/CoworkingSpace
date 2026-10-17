import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { VerificationPurpose } from '../../users/entities/user.entity.js';

export class ResendCodeDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsEnum(VerificationPurpose)
  purpose: VerificationPurpose;
}
