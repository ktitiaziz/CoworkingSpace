import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { User } from '../users/entities/user.entity.js';
import { Seat } from '../seats/seat.entity.js';
import { Space } from './entities/space.entity.js';
import { SpacesController } from './spaces.controller.js';
import { SpacesService } from './spaces.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Space,
      Seat,
      User,
    ]),
  ],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
