
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService } from './users.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  deleteMyAccount(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.deleteMyAccount(
      request.user.sub,
    );
  }
}
