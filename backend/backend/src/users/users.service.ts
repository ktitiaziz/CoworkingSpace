
import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity.js';
import { Reservation } from '../reservations/entities/reservations.entity.js';
import { Space } from '../spaces/entities/space.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly usersRepository: Repository<User> | null,

    @Optional()
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation> | null,

    @Optional()
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space> | null,
  ) {}

  async deleteMyAccount(userId: number) {
    if (!this.usersRepository || !this.reservationsRepository || !this.spacesRepository) {
      throw new Error('User repositories are not configured');
    }

    const user = await this.usersRepository.findOneBy({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reservationCount =
      await this.reservationsRepository.count({
        where: {
          user: { id: userId },
        },
      });

    if (reservationCount > 0) {
      throw new ConflictException(
        'Cancel or remove your reservations before deleting your account',
      );
    }

    const ownedSpacesCount =
      await this.spacesRepository.count({
        where: {
          owner: { id: userId },
        },
      });

    if (ownedSpacesCount > 0) {
      throw new ConflictException(
        'Your account owns coworking spaces and cannot be deleted yet',
      );
    }

    await this.usersRepository.remove(user);

    return {
      message: 'Your account has been deleted successfully',
    };
  }
}
