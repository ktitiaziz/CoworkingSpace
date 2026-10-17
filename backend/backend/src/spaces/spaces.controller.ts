
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SpacesService } from './spaces.service.js';
import { CreateSpaceDto } from './dto/create-space.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() dto: CreateSpaceDto,
    @Req() req: any,
  ) {
    return this.spacesService.create(
      dto,
      Number(req.user.sub),
    );
  }

  @Get()
  findAll() {
    return this.spacesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.spacesService.findOne(id);
  }
}
