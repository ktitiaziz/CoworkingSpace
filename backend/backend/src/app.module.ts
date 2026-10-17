import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { SeatsModule } from './seats/seats.module.js';
import { UsersModule } from './users/users.module.js';
import { SpacesModule } from './spaces/spaces.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      
      synchronize: true,
    }),

    AuthModule,
    UsersModule,
    SpacesModule,
    SeatsModule,
    ReservationsModule,
  ],
})
export class AppModule {}
