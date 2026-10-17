import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';

import { User, VerificationPurpose } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyCodeDto } from './dto/verify-code.dto.js';
import { ResendCodeDto } from './dto/resend-code.dto.js';
import { MailService } from './mail.service.js';

const BCRYPT_SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const EMAIL_ALREADY_REGISTERED_MESSAGE = 'Email is already registered';
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

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

    await this.issueCode(user, VerificationPurpose.LOGIN);
    return {
      message: 'A login verification code has been sent to your email.',
      requiresVerification: true,
      purpose: VerificationPurpose.LOGIN,
      email: user.email,
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

    await this.clearCode(user);

    if (dto.purpose === VerificationPurpose.REGISTRATION) {
      user.emailVerified = true;
      await this.usersRepository.save(user);
      return { message: 'Email verified successfully. You can now log in.' };
    }

    if (!user.emailVerified) {
      throw new BadRequestException('Verify your email address before logging in.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { message: 'Login verified successfully.', accessToken };
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

  private async issueCode(user: User, purpose: VerificationPurpose, force = false) {
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
    await this.mailService.sendVerificationCode(user.email, code, purpose);
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
