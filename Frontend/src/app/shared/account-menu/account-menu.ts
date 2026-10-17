import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
  open = false;

  ngOnInit(): void { this.refresh(); }

  refresh(): void { this.isLoggedIn = !!this.auth.getToken(); }

  toggle(): void { this.refresh(); this.open = !this.open; }

  logout(): void {
    this.auth.logout();
    this.isLoggedIn = false;
    this.open = false;
    void this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  closeOutside(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.account-menu')) this.open = false;
  }
}
