import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  @IsNotEmpty()
  spaceId!: number;

  @IsOptional()
  @IsInt()
  seatId?: number | null;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
