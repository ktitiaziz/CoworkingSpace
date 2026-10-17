import { IsEmail, IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { CLIENT_VERIFICATION_PURPOSES } from '../../users/entities/user.entity.js';
import type { ClientVerificationPurpose } from '../../users/entities/user.entity.js';

export class VerifyCodeDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;

  @IsIn(CLIENT_VERIFICATION_PURPOSES)
  purpose: ClientVerificationPurpose;
}
