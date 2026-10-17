
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Reservation, ReservationStatus } from './entities/reservations.entity.js';
import { Space } from '../spaces/entities/space.entity.js';
import { Seat } from '../seats/seat.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';

@Injectable()
export class ReservationsService {
  constructor(
    @Optional()
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation> | null,

    @Optional()
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space> | null,

    @Optional()
    @InjectRepository(Seat)
    private readonly seatsRepository: Repository<Seat> | null,

    @Optional()
    @InjectRepository(User)
    private readonly usersRepository: Repository<User> | null,
  ) {}

  async findAll(userId: number): Promise<Reservation[]> {
    if (!this.reservationsRepository) {
      throw new Error('Reservation repository is not configured');
    }

    return this.reservationsRepository.find({
      where: { user: { id: userId } },
      relations: { user: true, space: true, seat: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySpace(spaceId: number, startDate?: string, endDate?: string): Promise<Array<{
    id: number;
    status: ReservationStatus;
    startDate: string;
    endDate: string;
    seat: { id: number; seatNumber: number } | null;
  }>> {
    if (!this.spacesRepository || !this.reservationsRepository) {
      throw new Error('Reservation repositories are not configured');
    }

    const space = await this.spacesRepository.findOneBy({ id: spaceId });
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new BadRequestException('Both startDate and endDate are required for date-specific availability');
    }
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const query = this.reservationsRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.seat', 'seat')
      .where('reservation.spaceId = :spaceId', { spaceId })
      .andWhere('reservation.status != :cancelled', { cancelled: ReservationStatus.CANCELLED })
      .orderBy('reservation.createdAt', 'DESC');

    // Inclusive date ranges: any booking that overlaps the selected range
    // makes its seat unavailable for those dates.
    if (startDate && endDate) {
      query
        .andWhere('reservation.startDate <= :endDate', { endDate })
        .andWhere('reservation.endDate >= :startDate', { startDate });
    }

    const reservations = await query.getMany();

    // This endpoint is public. Expose only booking dates/status and seat
    // identifiers needed for availability; never return users or full entities.
    return reservations.map((reservation) => ({
      id: reservation.id,
      status: reservation.status,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      seat: reservation.seat
        ? {
            id: reservation.seat.id,
            seatNumber: reservation.seat.seatNumber,
          }
        : null,
    }));
  }

  async create(
    dto: CreateReservationDto,
    userId: number,
  ): Promise<Reservation> {
    if (!this.reservationsRepository || !this.spacesRepository || !this.usersRepository || !this.seatsRepository) {
      throw new Error('Reservation repositories are not configured');
    }

    if (!dto.startDate || !dto.endDate || dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const space = await this.spacesRepository.findOneBy({ id: dto.spaceId });
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    let seat: Seat | null = null;

    if (dto.seatId !== undefined && dto.seatId !== null) {
      seat = await this.seatsRepository.findOne({
        where: { id: dto.seatId },
        relations: { space: true },
      });

      if (!seat) {
        throw new NotFoundException('Seat not found');
      }

      if (seat.space.id !== space.id) {
        throw new BadRequestException('The selected seat does not belong to this space');
      }

      const overlappingReservation = await this.reservationsRepository
        .createQueryBuilder('reservation')
        .where('reservation.seatId = :seatId', { seatId: dto.seatId })
        .andWhere('reservation.status != :cancelled', { cancelled: ReservationStatus.CANCELLED })
        .andWhere('reservation.startDate <= :endDate', { endDate: dto.endDate })
        .andWhere('reservation.endDate >= :startDate', { startDate: dto.startDate })
        .getOne();

      if (overlappingReservation) {
        throw new ConflictException('This seat is already booked for the selected dates');
      }
    }

    const reservation = this.reservationsRepository.create({
      user,
      space,
      seat,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: ReservationStatus.CONFIRMED,
    });

    return this.reservationsRepository.save(reservation);
  }

  async cancel(reservationId: number, userId: number): Promise<Reservation> {
    if (!this.reservationsRepository) {
      throw new Error('Reservation repository is not configured');
    }

    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId, user: { id: userId } },
      relations: { user: true, space: true, seat: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('This reservation is already cancelled');
    }

    reservation.status = ReservationStatus.CANCELLED;
    return this.reservationsRepository.save(reservation);
  }
}
