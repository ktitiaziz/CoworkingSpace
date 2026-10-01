import { Routes } from '@angular/router';

import { Home } from './features/home/home';
import { Spaces } from './features/spaces/spaces';
import { SpaceDetails } from './features/spaces-details/spaces-details';
import { Reservation } from './features/reservation/reservation';
import { MyReservations } from './features/myreserv/myreserv';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'spaces',
    component: Spaces
  },
  {
    path: 'spaces/:id',
    component: SpaceDetails
  },
  {
    path: 'spaces/:id/reserve',
    component: Reservation
  },
  {
    path: 'my-reservations',
    component: MyReservations
  }
];