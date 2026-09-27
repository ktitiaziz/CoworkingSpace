import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Reservation {
  id: number;
  confirmationNumber: string;
  spaceName: string;
  location: string;
  type: string;
  seatNumber: number;
  date: string;
  duration: string;
  price: number;
  status: 'confirmed' | 'cancelled';
}

@Component({
  selector: 'app-my-reservations',
  imports: [RouterLink],
  templateUrl: './myreserv.html',
  styleUrl: './myreserv.scss'
})
export class MyReservations {

  reservations: Reservation[] = [

    {
      id: 1,
      confirmationNumber: 'CW-830232',
      spaceName: 'Downtown Workspace',
      location: 'Tunis Centre',
      type: 'Open Space',
      seatNumber: 8,
      date: 'Today',
      duration: '1 day',
      price: 15,
      status: 'confirmed'
    },

    {
      id: 2,
      confirmationNumber: 'CW-741925',
      spaceName: 'Creative Hub',
      location: 'Lac 1',
      type: 'Private Office',
      seatNumber: 3,
      date: '28 Sep 2026',
      duration: '1 day',
      price: 35,
      status: 'confirmed'
    },

    {
      id: 3,
      confirmationNumber: 'CW-615482',
      spaceName: 'Business Meeting Room',
      location: 'Les Berges du Lac',
      type: 'Meeting Room',
      seatNumber: 5,
      date: '30 Sep 2026',
      duration: '1 day',
      price: 25,
      status: 'confirmed'
    }

  ];


  get activeReservations(): Reservation[] {

    return this.reservations.filter(
      reservation => reservation.status === 'confirmed'
    );

  }


  get cancelledReservations(): Reservation[] {

    return this.reservations.filter(
      reservation => reservation.status === 'cancelled'
    );

  }


  cancelReservation(reservation: Reservation): void {

    reservation.status = 'cancelled';

  }


  getTotal(): number {

    return this.activeReservations.reduce(
      (total, reservation) => total + reservation.price,
      0
    );

  }

}