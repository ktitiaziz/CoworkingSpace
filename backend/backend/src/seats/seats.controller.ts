import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Seat } from './entities/seat.entity.js';

@Controller('seats')
export class SeatsController {
  constructor(
    @InjectRepository(Seat)
    private readonly seatsRepository: Repository<Seat>,
  ) {}

  @Get()
  async findBySpace(@Query('spaceId', ParseIntPipe) spaceId: number) {
    const seats = await this.seatsRepository.find({
      where: { space: { id: spaceId } },
      order: { seatNumber: 'ASC' },
    });

    // Public endpoint: return only fields needed to draw the floor plan.
    // Never expose owner/user details through public availability APIs.
    return seats.map(({ id, seatNumber }) => ({ id, seatNumber }));
  }
}
