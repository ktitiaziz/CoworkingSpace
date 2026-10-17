import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AccountMenu } from '../../shared/account-menu/account-menu';

interface ApiReservation {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
  space?: {
    id?: number;
    name?: string;
    type?: string;
    location?: string;
    city?: string;
    pricePerDay?: string | number;
  } | null;
  seat?: { id?: number; seatNumber?: number } | null;
}

interface Reservation {
  id: number;
  confirmationNumber: string;
  spaceName: string;
  location: string;
  type: string;
  seatNumber: number | null;
  date: string;
  duration: string;
  price: number;
  status: 'confirmed' | 'cancelled';
  startDate: string;
  endDate: string;
  busy?: boolean;
}

@Component({
  selector: 'app-my-reservations',
  imports: [RouterLink, AccountMenu],
  templateUrl: './myreserv.html',
  styleUrl: './myreserv.scss',
})
export class MyReservations implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  reservations: Reservation[] = [];
  loading = false;
  error = '';
  notice = '';

  ngOnInit(): void {
    this.loadReservations();
  }

  get activeReservations(): Reservation[] {
    return this.reservations.filter((r) => r.status === 'confirmed');
  }

  get cancelledReservations(): Reservation[] {
    return this.reservations.filter((r) => r.status === 'cancelled');
  }

  loadReservations(): void {
    const token = typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem('coworking_access_token');

    if (!token) {
      this.error = 'Please log in to see your reservations.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.http.get<ApiReservation[]>(`${this.apiUrl}/reservations`, {
      headers: { Authorization: `Bearer ${token}` },
    }).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (items) => {
        this.reservations = (Array.isArray(items) ? items : []).map((item) => this.toReservation(item));
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.status === 401
          ? 'Your session has expired. Please log in again to view your reservations.'
          : 'Could not load reservations. Check that the backend is running and try again.';
      },
    });
  }

  cancelReservation(reservation: Reservation): void {
    const token = typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem('coworking_access_token');

    if (!token) {
      this.error = 'Please log in to cancel a reservation.';
      return;
    }
    if (reservation.busy || reservation.status !== 'confirmed') return;
    if (!confirm(`Cancel reservation ${reservation.confirmationNumber}?`)) return;

    reservation.busy = true;
    this.error = '';
    this.notice = '';
    this.http.delete<ApiReservation>(`${this.apiUrl}/reservations/${reservation.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).pipe(finalize(() => (reservation.busy = false))).subscribe({
      next: () => {
        // Reload the source of truth from the API; cancellation must persist in PostgreSQL.
        this.notice = 'Reservation cancelled successfully.';
        this.loadReservations();
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.status === 401
          ? 'Your session has expired. Please log in again.'
          : err.error?.message || 'Could not cancel this reservation. Please try again.';
      },
    });
  }

  getTotal(): number {
    return this.activeReservations.reduce((total, r) => total + r.price, 0);
  }

  private toReservation(item: ApiReservation): Reservation {
    const startDate = this.dateOnly(item.startDate);
    const endDate = this.dateOnly(item.endDate);
    const days = Math.max(1, Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1);
    const spaceType = (item.space?.type || 'OPEN_SPACE').replaceAll('_', ' ').toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const status = String(item.status).toUpperCase() === 'CANCELLED' ? 'cancelled' : 'confirmed';
    return {
      id: item.id,
      confirmationNumber: `CW-${String(item.id).padStart(6, '0')}`,
      spaceName: item.space?.name || `Workspace ${item.space?.id ?? ''}`.trim(),
      location: [item.space?.location, item.space?.city].filter(Boolean).join(', ') || 'Location not provided',
      type: spaceType,
      seatNumber: item.seat?.seatNumber ?? null,
      date: startDate === endDate ? this.formatDate(startDate) : `${this.formatDate(startDate)} – ${this.formatDate(endDate)}`,
      duration: `${days} ${days === 1 ? 'day' : 'days'}`,
      price: Number(item.space?.pricePerDay ?? 0) * days,
      status,
      startDate,
      endDate,
    };
  }

  private dateOnly(value: string): string {
    return String(value).slice(0, 10);
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
