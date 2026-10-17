import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Reservation } from '../reservations/entities/reservations.entity.js';
import { Space } from '../spaces/entities/space.entity.js';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  seatNumber: number;

  @ManyToOne(() => Space, (space) => space.seats, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'spaceId' })
  space: Relation<Space>;

  @OneToMany(() => Reservation, (reservation) => reservation.seat)
  reservations: Relation<Reservation[]>;
}
