
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum SpaceType {
  OPEN_SPACE = 'OPEN_SPACE',
  PRIVATE_OFFICE = 'PRIVATE_OFFICE',
  MEETING_ROOM = 'MEETING_ROOM',
}

export class CreateSpaceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(SpaceType)
  type!: SpaceType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location!: string;

  @IsString()
  city!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsNumber()
  @Min(0)
  pricePerDay!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
