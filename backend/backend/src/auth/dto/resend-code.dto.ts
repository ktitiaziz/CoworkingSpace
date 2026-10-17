import { IsEmail, IsIn, MaxLength } from 'class-validator';
import { CLIENT_VERIFICATION_PURPOSES } from '../../users/entities/user.entity.js';
import type { ClientVerificationPurpose } from '../../users/entities/user.entity.js';

export class ResendCodeDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsIn(CLIENT_VERIFICATION_PURPOSES)
  purpose: ClientVerificationPurpose;
}
