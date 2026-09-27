import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface Seat {
  id: number;
  number: number;
  status: 'available' | 'reserved' | 'mine';
  position: {
    top: string;
    left?: string;
    right?: string;
  };
}

@Component({
  selector: 'app-reservation',
  imports: [RouterLink],
  templateUrl: './reservation.html',
  styleUrl: './reservation.scss'
})
export class Reservation {

  // =====================================================
  // SPACE
  // =====================================================

  spaceId: number | null = null;
  workspaceName = 'Downtown Workspace';
  workspacePrice = 15;


  // =====================================================
  // SEAT SELECTION
  // =====================================================

  selectedSeat: Seat | null = null;


  // =====================================================
  // CONFIRMATION POPUP
  // =====================================================

  showConfirmation = false;
  confirmationNumber = '';
  reservationDate = 'Today';
  reservationDuration = '1 day';
  price = 15;


  // =====================================================
  // SEATS
  // =====================================================

  seats: Seat[] = [

    { id: 1, number: 1, status: 'available', position: { top: '18%', left: '10%' } },
    { id: 2, number: 2, status: 'reserved', position: { top: '18%', left: '18%' } },
    { id: 3, number: 3, status: 'available', position: { top: '18%', left: '26%' } },
    { id: 4, number: 4, status: 'available', position: { top: '18%', right: '10%' } },

    { id: 5, number: 5, status: 'available', position: { top: '28%', left: '10%' } },
    { id: 6, number: 6, status: 'reserved', position: { top: '28%', left: '18%' } },
    { id: 7, number: 7, status: 'available', position: { top: '28%', left: '26%' } },
    { id: 8, number: 8, status: 'available', position: { top: '28%', right: '10%' } },

    { id: 9, number: 9, status: 'reserved', position: { top: '38%', left: '10%' } },
    { id: 10, number: 10, status: 'available', position: { top: '38%', left: '18%' } },
    { id: 11, number: 11, status: 'available', position: { top: '38%', left: '26%' } },
    { id: 12, number: 12, status: 'reserved', position: { top: '38%', right: '10%' } },

    { id: 13, number: 13, status: 'available', position: { top: '48%', left: '10%' } },
    { id: 14, number: 14, status: 'available', position: { top: '48%', left: '18%' } },
    { id: 15, number: 15, status: 'reserved', position: { top: '48%', left: '26%' } },
    { id: 16, number: 16, status: 'available', position: { top: '48%', right: '10%' } },

    { id: 17, number: 17, status: 'available', position: { top: '58%', left: '10%' } },
    { id: 18, number: 18, status: 'available', position: { top: '58%', left: '18%' } },
    { id: 19, number: 19, status: 'reserved', position: { top: '58%', left: '26%' } },
    { id: 20, number: 20, status: 'available', position: { top: '58%', right: '10%' } },

    { id: 21, number: 21, status: 'available', position: { top: '68%', left: '10%' } },
    { id: 22, number: 22, status: 'reserved', position: { top: '68%', left: '18%' } },
    { id: 23, number: 23, status: 'available', position: { top: '68%', left: '26%' } },
    { id: 24, number: 24, status: 'available', position: { top: '68%', right: '10%' } },

    { id: 25, number: 25, status: 'reserved', position: { top: '78%', left: '10%' } },
    { id: 26, number: 26, status: 'available', position: { top: '78%', left: '18%' } },
    { id: 27, number: 27, status: 'available', position: { top: '78%', left: '26%' } },
    { id: 28, number: 28, status: 'reserved', position: { top: '78%', right: '10%' } },

    { id: 29, number: 29, status: 'available', position: { top: '88%', left: '10%' } },
    { id: 30, number: 30, status: 'available', position: { top: '88%', left: '18%' } },
    { id: 31, number: 31, status: 'reserved', position: { top: '88%', left: '26%' } },
    { id: 32, number: 32, status: 'available', position: { top: '88%', right: '10%' } }

  ];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {

    this.spaceId = Number(
      this.route.snapshot.paramMap.get('id')
    );

  }


  // =====================================================
  // SELECT SEAT
  // =====================================================

  isSelected(seat: Seat): boolean {
    return this.selectedSeat?.id === seat.id;
  }

  selectSeat(seat: Seat): void {

    // Reserved seats cannot be selected
    if (seat.status === 'reserved') {
      return;
    }

    // Select the seat
    this.selectedSeat = seat;

  }


  // =====================================================
  // CONFIRM RESERVATION
  // =====================================================

  confirmReservation(): void {

    // User must select a seat first
    if (!this.selectedSeat) {
      return;
    }

    /*
     * FRONTEND ONLY
     *
     * Later, this is where we will send the
     * reservation to the backend.
     */

    // Change selected seat to user's reservation
    this.selectedSeat.status = 'mine';

    // Generate confirmation number
    this.confirmationNumber =
      this.generateConfirmationNumber();

    // Open confirmation popup
    this.showConfirmation = true;

  }


  // =====================================================
  // GENERATE CONFIRMATION NUMBER
  // =====================================================

  private generateConfirmationNumber(): string {

    const randomNumber =
      Math.floor(
        100000 + Math.random() * 900000
      );

    return `CW-${randomNumber}`;

  }


  // =====================================================
  // CLOSE POPUP
  // =====================================================

  closeConfirmation(): void {

    this.showConfirmation = false;

  }


  // =====================================================
  // BACK TO SPACES
  // =====================================================

  backToSpaces(): void {

    this.showConfirmation = false;

    this.router.navigate(['/spaces']);

  }


  // =====================================================
  // CONTINUE BROWSING
  // =====================================================

  continueBrowsing(): void {

    this.showConfirmation = false;

  }

}