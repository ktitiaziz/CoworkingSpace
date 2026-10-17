import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Reservation } from '../../reservations/entities/reservations.entity.js';
import { Space } from '../../spaces/entities/space.entity.js';

export enum UserRole {
  USER = 'USER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
}

export enum VerificationPurpose {
  REGISTRATION = 'REGISTRATION',
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  // Internal: the reset code was confirmed and a single-use reset token was issued.
  PASSWORD_RESET_APPROVED = 'PASSWORD_RESET_APPROVED',
}

// Purposes a client may submit codes for (the approved state is server-side only).
export const CLIENT_VERIFICATION_PURPOSES = [
  VerificationPurpose.REGISTRATION,
  VerificationPurpose.LOGIN,
  VerificationPurpose.PASSWORD_RESET,
] as const;
export type ClientVerificationPurpose = (typeof CLIENT_VERIFICATION_PURPOSES)[number];

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  verificationCodeHash: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  verificationCodeExpiresAt: Date | null;

  @Column({ type: 'enum', enum: VerificationPurpose, nullable: true, select: false })
  verificationPurpose: VerificationPurpose | null;

  @Column({ type: 'int', default: 0, select: false })
  verificationAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  verificationLastSentAt: Date | null;

  @OneToMany(() => Space, (space) => space.owner)
  spaces: Relation<Space[]>;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Relation<Reservation[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
