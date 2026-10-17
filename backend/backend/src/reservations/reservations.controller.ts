
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationsService } from './reservations.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
  };
}

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateReservationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservationsService.create(
      dto,
      request.user.sub,
    );
  }

  // Public, read-only endpoint used to display seat availability before login.
  // The service returns a deliberately limited DTO without user information.
  @Get('space/:spaceId')
  findBySpace(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reservationsService.findBySpace(spaceId, startDate, endDate);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.reservationsService.findAll(
      request.user.sub,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservationsService.cancel(
      id,
      request.user.sub,
    );
  }
}
