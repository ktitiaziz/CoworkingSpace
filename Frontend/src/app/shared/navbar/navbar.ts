import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AccountMenu } from '../account-menu/account-menu';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, AccountMenu],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  scrolled = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 8;
  }
}
