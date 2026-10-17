import {
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Space } from './entities/space.entity.js';
import { Seat } from '../seats/seat.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateSpaceDto } from './dto/create-space.dto.js';

@Injectable()
export class SpacesService {
  constructor(
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

  async create(dto: CreateSpaceDto, userId: number) {
    const { usersRepository, spacesRepository, seatsRepository } = this;

    if (!usersRepository || !spacesRepository || !seatsRepository) {
      throw new Error('Space repositories are not configured');
    }

    const owner = await usersRepository.findOneBy({
      id: userId,
    });

    if (!owner) {
      throw new NotFoundException('User not found');
    }

    const space = spacesRepository.create({
      name: dto.name,
      type: dto.type,
      description: dto.description,
      location: dto.location,
      city: dto.city,
      capacity: dto.capacity,
      pricePerDay: dto.pricePerDay.toString(),
      amenities: dto.amenities ?? [],
      images: dto.images ?? [],
      owner,
    });

    const savedSpace = await spacesRepository.save(space);

    const seats = Array.from(
      { length: dto.capacity },
      (_, index) =>
        seatsRepository.create({
          seatNumber: index + 1,
          space: savedSpace,
        }),
    );

    await seatsRepository.save(seats);

    return this.findOne(savedSpace.id);
  }

  async findAll() {
    if (!this.spacesRepository) {
      throw new Error('Space repository is not configured');
    }

    return this.spacesRepository.find({
      relations: {
        seats: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    if (!this.spacesRepository) {
      throw new Error('Space repository is not configured');
    }

    const space = await this.spacesRepository.findOne({
      where: { id },
      relations: {
        seats: true,
        owner: true,
      },
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    return space;
  }
}
