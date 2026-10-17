import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { Relation } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { Space } from '../../spaces/entities/space.entity.js';
import { Seat } from '../../seats/seat.entity.js';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Space, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'spaceId' })
  space: Relation<Space>;

  @ManyToOne(() => Seat, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seatId' })
  seat: Relation<Seat> | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @CreateDateColumn()
  createdAt: Date;
}
