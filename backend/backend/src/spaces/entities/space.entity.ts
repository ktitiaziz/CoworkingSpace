import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Reservation } from '../../reservations/entities/reservations.entity.js';
import { Seat } from '../../seats/seat.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum SpaceType {
  OPEN_SPACE = 'OPEN_SPACE',
  PRIVATE_OFFICE = 'PRIVATE_OFFICE',
  MEETING_ROOM = 'MEETING_ROOM',
}

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({
    type: 'enum',
    enum: SpaceType,
    default: SpaceType.OPEN_SPACE,
  })
  type: SpaceType;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 150 })
  location: string;

  @Column({ length: 100 })
  city: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  pricePerDay: string;

  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  amenities: string[];

  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  images: string[];

  @ManyToOne(() => User, (user) => user.spaces, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<User>;

  @OneToMany(() => Seat, (seat) => seat.space)
  seats: Relation<Seat[]>;

  @OneToMany(() => Reservation, (reservation) => reservation.space)
  reservations: Relation<Reservation[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
