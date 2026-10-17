import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';

import { ClientVerificationPurpose, User, VerificationPurpose } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyCodeDto } from './dto/verify-code.dto.js';
import { ResendCodeDto } from './dto/resend-code.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { MailService } from './mail.service.js';

const BCRYPT_SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const EMAIL_ALREADY_REGISTERED_MESSAGE = 'Email is already registered';
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const INVALID_RESET_MESSAGE = 'This password reset link is invalid or has expired. Please start again.';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (!user?.password || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!user.emailVerified) {
      await this.issueCode(user, VerificationPurpose.REGISTRATION);
      return {
        message: 'Your email is not verified. A verification code has been sent.',
        requiresVerification: true,
        purpose: VerificationPurpose.REGISTRATION,
        email: user.email,
      };
    }

    // Email ownership is proven once at sign-up, so verified users log in with
    // their password alone instead of waiting for an emailed code each time.
    return {
      message: 'Logged in successfully.',
      requiresVerification: false,
      accessToken: await this.signAccessToken(user),
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findOneBy({ email });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        await this.issueCode(existingUser, VerificationPurpose.REGISTRATION);
        return {
          message: 'This account exists but its email is not verified. A new code has been sent.',
          requiresVerification: true,
          purpose: VerificationPurpose.REGISTRATION,
          email,
        };
      }
      throw new ConflictException(EMAIL_ALREADY_REGISTERED_MESSAGE);
    }

    const user = this.usersRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      password: await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS),
      emailVerified: false,
    });

    let savedUser: User;
    try {
      savedUser = await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException(EMAIL_ALREADY_REGISTERED_MESSAGE);
      }
      throw error;
    }

    await this.issueCode(savedUser, VerificationPurpose.REGISTRATION);
    return {
      message: 'Account created. Check your email for a verification code.',
      requiresVerification: true,
      purpose: VerificationPurpose.REGISTRATION,
      email: savedUser.email,
    };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.verificationCodeHash',
        'user.verificationCodeExpiresAt',
        'user.verificationPurpose',
        'user.verificationAttempts',
      ])
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (!user) throw new BadRequestException('Invalid or expired verification code.');
    if (user.verificationPurpose !== dto.purpose || !user.verificationCodeHash || !user.verificationCodeExpiresAt) {
      throw new BadRequestException('Invalid or expired verification code.');
    }
    if (user.verificationAttempts >= MAX_CODE_ATTEMPTS) {
      throw new HttpException('Too many incorrect attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (user.verificationCodeExpiresAt.getTime() <= Date.now()) {
      await this.clearCode(user);
      throw new BadRequestException('Verification code expired. Request a new code.');
    }

    const submittedHash = this.hashCode(dto.code);
    if (submittedHash !== user.verificationCodeHash) {
      user.verificationAttempts += 1;
      await this.usersRepository.save(user);
      throw new BadRequestException('Invalid verification code.');
    }

    if (dto.purpose === VerificationPurpose.PASSWORD_RESET) {
      // Swap the 6-digit code for a long random single-use token that authorizes
      // exactly one password change for this account within a short window.
      const resetToken = randomBytes(32).toString('hex');
      user.verificationCodeHash = this.hashCode(resetToken);
      user.verificationCodeExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      user.verificationPurpose = VerificationPurpose.PASSWORD_RESET_APPROVED;
      user.verificationAttempts = 0;
      await this.usersRepository.save(user);
      return { message: 'Code verified. You can now choose a new password.', resetToken };
    }

    await this.clearCode(user);

    if (dto.purpose === VerificationPurpose.REGISTRATION) {
      user.emailVerified = true;
      await this.usersRepository.save(user);
      return { message: 'Email verified successfully.', accessToken: await this.signAccessToken(user) };
    }

    if (!user.emailVerified) {
      throw new BadRequestException('Verify your email address before logging in.');
    }

    return { message: 'Login verified successfully.', accessToken: await this.signAccessToken(user) };
  }

  async resendCode(dto: ResendCodeDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOneBy({ email });
    // Use a generic response for missing users to reduce account enumeration.
    if (!user) return { message: 'If the account is eligible, a verification code will be sent.' };

    if (dto.purpose === VerificationPurpose.LOGIN && !user.emailVerified) {
      return { message: 'If the account is eligible, a verification code will be sent.' };
    }
    if (dto.purpose === VerificationPurpose.REGISTRATION && user.emailVerified) {
      return { message: 'If the account is eligible, a verification code will be sent.' };
    }

    const fresh = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.verificationLastSentAt')
      .where('user.id = :id', { id: user.id })
      .getOne();

    if (fresh?.verificationLastSentAt && Date.now() - fresh.verificationLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException('Please wait 60 seconds before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.issueCode(user, dto.purpose, true);
    return { message: 'If the account is eligible, a verification code will be sent.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) throw new NotFoundException('No account found with this email address.');

    await this.issueCode(user, VerificationPurpose.PASSWORD_RESET);
    return {
      message: 'A password reset code has been sent to your email.',
      requiresVerification: true,
      purpose: VerificationPurpose.PASSWORD_RESET,
      email: user.email,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.verificationCodeHash',
        'user.verificationCodeExpiresAt',
        'user.verificationPurpose',
        'user.verificationAttempts',
      ])
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (
      !user ||
      user.verificationPurpose !== VerificationPurpose.PASSWORD_RESET_APPROVED ||
      !user.verificationCodeHash ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt.getTime() <= Date.now() ||
      !timingSafeEqual(Buffer.from(this.hashCode(dto.resetToken)), Buffer.from(user.verificationCodeHash))
    ) {
      throw new BadRequestException(INVALID_RESET_MESSAGE);
    }

    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    // Receiving the reset code proves ownership of the address.
    user.emailVerified = true;
    await this.clearCode(user);

    return {
      message: 'Your password has been changed.',
      accessToken: await this.signAccessToken(user),
    };
  }

  private async issueCode(user: User, purpose: ClientVerificationPurpose, force = false) {
    if (!force && user.verificationLastSentAt && Date.now() - user.verificationLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      // Login/register attempts should not send repeated emails during the cooldown.
      throw new HttpException(
        'A verification code was sent recently. Please wait 60 seconds before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    user.verificationCodeHash = this.hashCode(code);
    user.verificationCodeExpiresAt = new Date(Date.now() + CODE_TTL_MS);
    user.verificationPurpose = purpose;
    user.verificationAttempts = 0;
    user.verificationLastSentAt = new Date();
    await this.usersRepository.save(user);
    // Send in the background so the response is not held up by SMTP. Failures are
    // logged by MailService; the user can request a new code with "Resend code".
    void this.mailService.sendVerificationCode(user.email, code, purpose).catch(() => undefined);
  }

  private signAccessToken(user: User) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      // Display-only profile fields so the UI can greet the user without another request.
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  private async clearCode(user: User) {
    user.verificationCodeHash = null;
    user.verificationCodeExpiresAt = null;
    user.verificationPurpose = null;
    user.verificationAttempts = 0;
    await this.usersRepository.save(user);
  }

  private hashCode(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null && 'code' in driverError && driverError.code === '23505';
  }
}
