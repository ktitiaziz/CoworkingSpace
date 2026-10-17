import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

function createUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 42,
    firstName: 'Taylor',
    lastName: 'User',
    email: 'taylor@example.com',
    password: 'hashed-password',
    role: UserRole.USER,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findOne: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    usersRepository = {
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };
    jwtService = { signAsync: vi.fn().mockResolvedValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: '  TAYLOR@EXAMPLE.COM ',
      password: 'correct-password',
    };

    it('loads the hidden password hash and returns a signed access token', async () => {
      usersRepository.findOne.mockResolvedValue(createUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(service.login(loginDto)).resolves.toEqual({
        accessToken: 'signed-token',
      });

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'taylor@example.com' },
        select: { id: true, email: true, password: true, role: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct-password',
        'hashed-password',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 42,
        email: 'taylor@example.com',
        role: UserRole.USER,
      });
    });

    it('rejects unknown email addresses without comparing a password', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects an incorrect password', async () => {
      usersRepository.findOne.mockResolvedValue(createUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      firstName: ' Taylor ',
      lastName: ' User ',
      email: ' TAYLOR@EXAMPLE.COM ',
      password: 'strong-password',
    };

    it('normalizes account details, hashes the password, and excludes it from the response', async () => {
      const user = createUser({
        firstName: 'Taylor',
        lastName: 'User',
        password: 'hashed-password',
      });
      usersRepository.findOneBy.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(user);
      usersRepository.save.mockResolvedValue(user);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      await expect(service.register(registerDto)).resolves.toEqual({
        id: 42,
        firstName: 'Taylor',
        lastName: 'User',
        email: 'taylor@example.com',
        role: UserRole.USER,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({
        email: 'taylor@example.com',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('strong-password', 10);
      expect(usersRepository.create).toHaveBeenCalledWith({
        firstName: 'Taylor',
        lastName: 'User',
        email: 'taylor@example.com',
        password: 'hashed-password',
      });
    });

    it('rejects an email that is already registered', async () => {
      usersRepository.findOneBy.mockResolvedValue(createUser());

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('converts a database unique-constraint race into a conflict response', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(createUser());
      usersRepository.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT INTO users',
          [],
          Object.assign(new Error('Unique constraint violation'), {
            code: '23505',
          }),
        ),
      );
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows database errors other than unique-constraint violations', async () => {
      const databaseError = new Error('Database unavailable');
      usersRepository.findOneBy.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(createUser());
      usersRepository.save.mockRejectedValue(databaseError);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      await expect(service.register(registerDto)).rejects.toBe(databaseError);
    });
  });
});
