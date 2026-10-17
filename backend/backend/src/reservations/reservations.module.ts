import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { User } from '../users/entities/user.entity.js';
import { Seat } from '../seats/seat.entity.js';
import { Space } from '../spaces/entities/space.entity.js';
import { Reservation } from './entities/reservations.entity.js';

import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Reservation,
      Space,
      Seat,
      User,
    ]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
