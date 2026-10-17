import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Seat } from './seat.entity.js';
import { SeatsController } from './seats.controller.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Seat])],
  controllers: [SeatsController],
  exports: [TypeOrmModule],
})
export class SeatsModule {}
