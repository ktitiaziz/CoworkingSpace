import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountMenu } from '../../shared/account-menu/account-menu';

@Component({
  selector: 'app-home',
  imports: [RouterLink, AccountMenu],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {}