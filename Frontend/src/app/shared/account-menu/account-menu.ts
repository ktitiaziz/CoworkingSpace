import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CurrentUser } from '../../core/services/auth.service';

@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenu implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  isLoggedIn = false;
  user: CurrentUser | null = null;
  open = false;

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.isLoggedIn = !!this.auth.getToken();
    this.user = this.auth.getCurrentUser();
  }

  // Tokens issued before names were added only carry the email.
  get displayName(): string {
    const name = [this.user?.firstName, this.user?.lastName].filter(Boolean).join(' ');
    return name || this.user?.email?.split('@')[0] || 'Account';
  }

  get initials(): string {
    const { firstName, lastName } = this.user ?? {};
    const letters = firstName ? `${firstName[0]}${lastName?.[0] ?? ''}` : this.displayName[0];
    return (letters ?? '?').toUpperCase();
  }

  toggle(): void { this.refresh(); this.open = !this.open; }

  logout(): void {
    this.auth.logout();
    this.isLoggedIn = false;
    this.user = null;
    this.open = false;
    void this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  closeOutside(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.account-menu')) this.open = false;
  }
}
