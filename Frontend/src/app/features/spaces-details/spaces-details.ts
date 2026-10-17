import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';

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
  imports: [RouterLink, Navbar],
  templateUrl: './spaces-details.html',
  styleUrl: './spaces-details.scss'
})
export class SpaceDetails {

  space: CoworkingSpace | undefined;

  // Space photos are optional: show the gradient placeholder when one is missing.
  imageFailed = false;

  // Controls the authentication popup
  showAuthModal = false;

  // Controls whether we show Login or Sign Up
  authMode: 'login' | 'signup' = 'login';

  // Validation message displayed inside the modal
  authError = '';

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

  constructor(private route: ActivatedRoute, private router: Router) {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.space = this.spaces.find(space => space.id === id);
  }

  openLogin(): void {
    void this.router.navigate(['/auth'], { queryParams: { mode: 'login', returnUrl: this.space ? `/spaces/${this.space.id}/reserve` : '/spaces' } });
  }

  openSignup(): void {
    void this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl: this.space ? `/spaces/${this.space.id}/reserve` : '/spaces' } });
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
    this.authError = '';
  }

  clearAuthError(): void {
    this.authError = '';
  }

  login(email: string, password: string): void {

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Both fields empty
    if (!cleanEmail && !cleanPassword) {
      this.authError = 'Please enter your email and password.';
      return;
    }

    // Email empty
    if (!cleanEmail) {
      this.authError = 'Please enter your email.';
      return;
    }

    // Password empty
    if (!cleanPassword) {
      this.authError = 'Please enter your password.';
      return;
    }

    // Basic email validation
    if (!this.isValidEmail(cleanEmail)) {
      this.authError = 'Please enter a valid email address.';
      return;
    }

    console.log('Login submitted');

    // Only navigate when validation succeeds
    this.closeAuthModal();

    this.goToReservation();
  }

  signup(
    fullName: string,
    email: string,
    password: string
  ): void {

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Check all fields
    if (!cleanName && !cleanEmail && !cleanPassword) {
      this.authError = 'Please complete all the fields.';
      return;
    }

    if (!cleanName) {
      this.authError = 'Please enter your full name.';
      return;
    }

    if (!cleanEmail) {
      this.authError = 'Please enter your email.';
      return;
    }

    if (!cleanPassword) {
      this.authError = 'Please enter your password.';
      return;
    }

    if (!this.isValidEmail(cleanEmail)) {
      this.authError = 'Please enter a valid email address.';
      return;
    }

    if (cleanPassword.length < 6) {
      this.authError = 'Password must contain at least 6 characters.';
      return;
    }

    console.log('Signup submitted');

    // Only navigate when validation succeeds
    this.closeAuthModal();

    this.goToReservation();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private goToReservation(): void {

    if (!this.space) {
      return;
    }

    window.location.href = `/spaces/${this.space.id}/reserve`;
  }
}