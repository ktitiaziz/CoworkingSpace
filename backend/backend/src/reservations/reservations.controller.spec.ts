import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  const reservationsService = {
    create: vi.fn(),
    findAll: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        { provide: ReservationsService, useValue: reservationsService },
        { provide: JwtService, useValue: { verifyAsync: vi.fn() } },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('creates a reservation for the authenticated user', async () => {
    const dto: CreateReservationDto = {
      spaceId: 10,
      startDate: '2026-10-20',
      endDate: '2026-10-21',
    };
    const reservation = { id: 1 };
    reservationsService.create.mockResolvedValue(reservation);

    await expect(
      controller.create(
        dto,
        { user: { sub: 7 } } as Parameters<typeof controller.create>[1],
      ),
    ).resolves.toBe(reservation);
    expect(reservationsService.create).toHaveBeenCalledWith(dto, 7);
  });

  it('lists only reservations for the authenticated user', async () => {
    const reservations = [{ id: 1 }];
    reservationsService.findAll.mockResolvedValue(reservations);

    await expect(
      controller.findAll(
        { user: { sub: 7 } } as Parameters<typeof controller.findAll>[0],
      ),
    ).resolves.toBe(reservations);
    expect(reservationsService.findAll).toHaveBeenCalledWith(7);
  });
});
