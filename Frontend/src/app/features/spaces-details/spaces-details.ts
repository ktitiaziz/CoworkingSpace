import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface CoworkingSpace {
  id: number;
  name: string;
  location: string;
  type: string;
  description: string;
  capacity: number;
  price: number;
  image: string;
}

@Component({
  selector: 'app-space-details',
  imports: [RouterLink],
  templateUrl: './spaces-details.html',
  styleUrl: './spaces-details.scss'
})
export class SpaceDetails {

  space: CoworkingSpace | undefined;

  // Controls the authentication popup
  showAuthModal = false;

  // Controls whether we show Login or Sign Up
  authMode: 'login' | 'signup' = 'login';

  spaces: CoworkingSpace[] = [
    {
      id: 1,
      name: 'Downtown Workspace',
      location: 'Tunis Centre',
      type: 'Open Space',
      description: 'A modern and comfortable workspace in the heart of Tunis.',
      capacity: 20,
      price: 15,
      image: 'assets/spaces/downtown.jpg'
    },
    {
      id: 2,
      name: 'Creative Hub',
      location: 'Lac 1',
      type: 'Private Office',
      description: 'A quiet private office designed for focused work.',
      capacity: 6,
      price: 35,
      image: 'assets/spaces/creative.jpg'
    },
    {
      id: 3,
      name: 'Business Meeting Room',
      location: 'Les Berges du Lac',
      type: 'Meeting Room',
      description: 'Professional meeting room equipped for teams and presentations.',
      capacity: 12,
      price: 25,
      image: 'assets/spaces/meeting.jpg'
    },
    {
      id: 4,
      name: 'Startup Hub',
      location: 'Centre Urbain Nord',
      type: 'Open Space',
      description: 'A collaborative environment for startups and freelancers.',
      capacity: 30,
      price: 12,
      image: 'assets/spaces/startup.jpg'
    },
    {
      id: 5,
      name: 'Executive Office',
      location: 'Lac 2',
      type: 'Private Office',
      description: 'Premium private office for professionals and small teams.',
      capacity: 4,
      price: 45,
      image: 'assets/spaces/executive.jpg'
    },
    {
      id: 6,
      name: 'Focus Room',
      location: 'El Menzah',
      type: 'Meeting Room',
      description: 'A quiet room perfect for meetings, interviews and presentations.',
      capacity: 8,
      price: 20,
      image: 'assets/spaces/focus.jpg'
    }
  ];

  constructor(private route: ActivatedRoute) {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.space = this.spaces.find(space => space.id === id);
  }

  openLogin(): void {
    this.authMode = 'login';
    this.showAuthModal = true;
  }

  openSignup(): void {
    this.authMode = 'signup';
    this.showAuthModal = true;
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
  }

  login(): void {
    console.log('Login submitted');
    this.closeAuthModal();
    this.goToReservation();
  }

  signup(): void {
    console.log('Signup submitted');
    this.closeAuthModal();
    this.goToReservation();
  }

  private goToReservation(): void {
    if (!this.space) {
      return;
    }

    window.location.href = `/spaces/${this.space.id}/reserve`;
  }
}