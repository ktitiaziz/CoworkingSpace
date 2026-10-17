import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountMenu } from '../../shared/account-menu/account-menu';

/* =====================================================
   TYPES
===================================================== */

type SeatStatus = 'available' | 'reserved' | 'mine' | 'unconfigured';
type SeatKind = 'desk' | 'chair';

interface Seat {
  id: number;
  number: number;
  status: SeatStatus;
  kind: SeatKind; // 'desk' = desk + chair, 'chair' = chair only (meeting tables)
  x: number;
  y: number;
  rot: number;    // 0 = chair on the right, 90 = below, 180 = left, 270 = above
  databaseId?: number;
  reservationId?: number;
}

type FurnitureType =
  | 'table'
  | 'meeting-table'
  | 'round-table'
  | 'sofa'
  | 'counter'
  | 'plant'
  | 'rug'
  | 'board'
  | 'pouf'
  | 'zone'
  | 'stairs'
  | 'window'
  | 'chair'
  | 'label'
  | 'tag';

interface Furniture {
  type: FurnitureType;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  rot?: number;
}

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  glass?: boolean;
}

interface Door {
  gap: string;
  leaf: string;
  arc: string;
}

interface SpaceLayout {
  name: string;
  type: string;
  price: number;
  seats: Seat[];
  furniture: Furniture[];
  walls: Wall[];
  doors: Door[];
}

interface Sides {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/* =====================================================
   LAYOUT BUILDER
   Canvas = 1000 x 640. Outer wall is drawn by the template.
   Seats (desk + chair) are created from helpers so they
   always line up. Seat numbers follow creation order.
===================================================== */

class LayoutBuilder {
  seats: Seat[] = [];
  furniture: Furniture[] = [];
  walls: Wall[] = [];
  doors: Door[] = [];

  private count = 0;

  constructor(
    private reserved: number[] = [],
    private mine: number[] = []
  ) {}

  /* ---------- furniture ---------- */

  add(type: FurnitureType, x: number, y: number, w: number, h: number, label?: string, rot?: number): this {
    this.furniture.push({ type, x, y, w, h, label, rot });
    return this;
  }

  /** centred text */
  label(x: number, y: number, text: string): this {
    return this.add('label', x, y, 0, 0, text);
  }

  /** text anchored at its left (room names) */
  tag(x: number, y: number, text: string): this {
    return this.add('tag', x, y, 0, 0, text);
  }

  window(x: number, y: number, w = 44, h = 8): this {
    return this.add('window', x, y, w, h);
  }

  /** decorative (not reservable) chair, same rot rules as seats */
  chair(x: number, y: number, rot: number): this {
    return this.add('chair', x, y, 0, 0, undefined, rot);
  }

  /* ---------- architecture ---------- */

  wall(x1: number, y1: number, x2: number, y2: number, glass = false): this {
    this.walls.push({ x1, y1, x2, y2, glass });
    return this;
  }

  /** closed room (4 walls) with its name in the top-left corner */
  room(x: number, y: number, w: number, h: number, name?: string): this {
    this.wall(x, y, x + w, y)
      .wall(x + w, y, x + w, y + h)
      .wall(x + w, y + h, x, y + h)
      .wall(x, y + h, x, y);
    if (name) {
      this.tag(x + 10, y + 18, name);
    }
    return this;
  }

  /**
   * Door cut into a wall.
   * o: 'h' = horizontal wall, 'v' = vertical wall
   * dir: 1 / -1 = which side the door swings to
   */
  door(x: number, y: number, s: number, o: 'h' | 'v', dir: 1 | -1): this {
    if (o === 'h') {
      this.doors.push({
        gap: `M${x} ${y} L${x + s} ${y}`,
        leaf: `M${x} ${y} L${x} ${y + dir * s}`,
        arc: `M${x} ${y + dir * s} A${s} ${s} 0 0 ${dir > 0 ? 0 : 1} ${x + s} ${y}`
      });
    } else {
      this.doors.push({
        gap: `M${x} ${y} L${x} ${y + s}`,
        leaf: `M${x} ${y} L${x + dir * s} ${y}`,
        arc: `M${x + dir * s} ${y} A${s} ${s} 0 0 ${dir > 0 ? 1 : 0} ${x} ${y + s}`
      });
    }
    return this;
  }

  /** small private booth: room + table + chair + door */
  booth(x: number, y: number, w: number, h: number, name: string, side: 'bottom' | 'left' = 'bottom'): this {
    this.room(x, y, w, h, name);
    this.add('table', x + w / 2 - 26, y + 36, 52, 22);
    this.chair(x + w / 2, y + 71, 90);

    return side === 'bottom'
      ? this.door(x + 8, y + h, 34, 'h', 1)
      : this.door(x, y + h - 44, 34, 'v', -1);
  }

  /* ---------- seats ---------- */

  /** one reservable seat. x,y = centre of the desk (or of the chair) */
  seat(x: number, y: number, rot: number, kind: SeatKind = 'desk'): this {
    const id = ++this.count;

    // Initial status is always neutral; the real status is loaded from the backend.
    this.seats.push({ id, number: id, status: 'available', kind, x, y, rot });
    return this;
  }

  /** vertical column of desks */
  col(cx: number, cy: number, n: number, rot: number, step?: number): this {
    const s = step ?? (rot % 180 === 0 ? 46 : 32);
    for (let i = 0; i < n; i++) {
      this.seat(cx, cy + i * s, rot);
    }
    return this;
  }

  /** horizontal row of desks */
  row(cx: number, cy: number, n: number, rot: number, step?: number): this {
    const s = step ?? (rot % 180 === 0 ? 32 : 46);
    for (let i = 0; i < n; i++) {
      this.seat(cx + i * s, cy, rot);
    }
    return this;
  }

  /** two columns of desks back to back, chairs on the outside */
  pair(cx: number, cy: number, n: number): this {
    return this.col(cx - 14, cy, n, 180).col(cx + 14, cy, n, 0);
  }

  /** chairs around a table. reservable = false -> decoration only */
  chairsAround(x: number, y: number, w: number, h: number, sides: Sides, reservable = true): this {
    const g = 13;

    const put = (px: number, py: number, rot: number) =>
      reservable ? this.seat(px, py, rot, 'chair') : this.chair(px, py, rot);

    for (let i = 0; i < (sides.top ?? 0); i++) put(x + ((i + 0.5) * w) / sides.top!, y - g, -90);
    for (let i = 0; i < (sides.bottom ?? 0); i++) put(x + ((i + 0.5) * w) / sides.bottom!, y + h + g, 90);
    for (let i = 0; i < (sides.left ?? 0); i++) put(x - g, y + ((i + 0.5) * h) / sides.left!, 180);
    for (let i = 0; i < (sides.right ?? 0); i++) put(x + w + g, y + ((i + 0.5) * h) / sides.right!, 0);
    return this;
  }

  build(name: string, type: string, price: number): SpaceLayout {
    return {
      name,
      type,
      price,
      seats: this.seats,
      furniture: this.furniture,
      walls: this.walls,
      doors: this.doors
    };
  }
}

/* =====================================================
   COMPONENT
===================================================== */

@Component({
  selector: 'app-reservation',
  imports: [RouterLink, AccountMenu],
  templateUrl: './reservation.html',
  styleUrl: './reservation.scss'
})
export class Reservation implements OnInit {
  private readonly apiUrl = 'http://localhost:3000';
  loadingSeats = false;
  savingReservation = false;
  reservationError = '';
  reservationStartDate = this.todayISO();
  reservationEndDate = this.todayISO();
  private pendingSeatNumber: number | null = null;

  spaceId: number | null = null;
  selectedSeat: Seat | null = null;
  currentLayout!: SpaceLayout;

  // confirmation popup
  showConfirmation = false;
  confirmedSeat: Seat | null = null;
  confirmationNumber = '';

  /*
   new LayoutBuilder([reserved seat numbers], [your seat numbers])
  */
  layouts: Record<number, SpaceLayout> = {

    /* =================================================
       1 — DOWNTOWN WORKSPACE · open office · 20 seats
       Balcony, collab room, kitchen, toilets,
       2 meeting rooms, lounge, boardroom, reception
    ================================================= */
    1: new LayoutBuilder([3, 6, 10, 13, 16, 19], [5, 12])

      // balcony
      .add('zone', 250, 13, 420, 46, 'BALCONY')
      .wall(250, 59, 670, 59).wall(250, 13, 250, 59).wall(670, 13, 670, 59)
      .door(440, 59, 40, 'h', -1)
      .window(120, 9, 60, 8).window(720, 9, 44, 8)

      // collab room
      .room(13, 13, 80, 250, 'COLLAB')
      .add('sofa', 30, 70, 46, 62).add('sofa', 30, 145, 46, 62)
      .add('plant', 40, 225, 26, 26)
      .door(93, 100, 40, 'v', 1)

      // kitchen
      .room(790, 13, 197, 150, 'KITCHEN')
      .add('counter', 805, 40, 165, 22)
      .add('round-table', 850, 95, 50, 50)
      .door(830, 163, 44, 'h', -1)

      // toilets
      .add('zone', 890, 175, 97, 165, 'TOILET')
      .wall(890, 175, 987, 175).wall(890, 175, 890, 340)
      .door(890, 230, 36, 'v', 1)

      // workstations (seats 1-20)
      .pair(200, 130, 4)
      .pair(400, 130, 4)
      .col(630, 130, 4, 180)
      .label(400, 325, 'WORKSTATION AREA')

      // main corridor wall
      .wall(13, 350, 987, 350)

      // MR-1
      .room(13, 350, 180, 130, 'MR - 1')
      .add('round-table', 78, 390, 60, 60)
      .chair(108, 457, 90).chair(71, 420, 180).chair(145, 420, 0)
      .door(135, 350, 40, 'h', 1)

      // MR-2
      .room(193, 350, 160, 130, 'MR - 2')
      .add('table', 238, 395, 76, 34)
      .chair(255, 378, -90).chair(297, 378, -90)
      .chair(255, 446, 90).chair(297, 446, 90)
      .door(310, 350, 36, 'h', 1)

      // lounge
      .room(13, 480, 340, 147, 'LOUNGE')
      .add('rug', 30, 500, 300, 110)
      .add('sofa', 45, 570, 160, 38)
      .add('round-table', 230, 525, 50, 50)
      .add('plant', 300, 575, 30, 30)
      .door(353, 520, 44, 'v', -1)

      // reception + stairs
      .add('stairs', 390, 370, 220, 80, 'STAIRS')
      .add('counter', 420, 535, 160, 24, 'RECEPTION')
      .add('plant', 385, 580, 30, 30).add('plant', 590, 580, 30, 30)

      // boardroom
      .room(620, 350, 367, 277, 'BOARDROOM')
      .add('board', 760, 365, 100, 10)
      .add('meeting-table', 700, 440, 220, 100, 'MEETING')
      .chairsAround(700, 440, 220, 100, { top: 4, bottom: 4, left: 1, right: 1 }, false)
      .add('zone', 880, 575, 100, 45, 'STORE')
      .door(640, 350, 50, 'h', 1)

      .build('Downtown Workspace', 'Open Space', 15),


    /* =================================================
       2 — CREATIVE HUB · private studio · 6 seats
       Back-to-back studio pod, idea room, phone booths
    ================================================= */
    2: new LayoutBuilder([2, 5], [3])

      .window(150, 9, 60, 8).window(330, 9, 60, 8).window(700, 9, 70, 8)

      // open studio
      .room(13, 13, 500, 380, 'OPEN STUDIO')
      .add('counter', 25, 60, 24, 200)
      .add('plant', 460, 40, 34, 34)
      .row(180, 250, 3, 270, 70)   // seats 1-3 (chairs above)
      .row(180, 278, 3, 90, 70)    // seats 4-6 (chairs below)
      .label(250, 345, 'STUDIO PODS')
      .door(300, 393, 50, 'h', 1)

      // idea room
      .room(513, 13, 474, 250, 'CREATIVE ROOM')
      .add('board', 620, 25, 180, 10)
      .add('meeting-table', 600, 90, 220, 90, 'IDEA TABLE')
      .chairsAround(600, 90, 220, 90, { top: 3, bottom: 3 }, false)
      .add('sofa', 900, 70, 44, 110)
      .add('plant', 940, 215, 30, 30)
      .door(513, 150, 46, 'v', 1)

      // phone booths
      .booth(513, 263, 150, 100, 'PHONE 1')
      .booth(663, 263, 150, 100, 'PHONE 2')

      // lounge
      .add('rug', 30, 430, 360, 185)
      .add('sofa', 50, 565, 200, 42)
      .add('sofa', 50, 450, 42, 90)
      .add('round-table', 150, 490, 56, 56)
      .add('pouf', 280, 480, 36, 36).add('pouf', 320, 520, 36, 36)
      .label(220, 445, 'LOUNGE')

      // coffee
      .add('counter', 700, 590, 250, 26, 'COFFEE BAR')
      .add('round-table', 760, 500, 50, 50)
      .add('pouf', 840, 510, 34, 34)
      .add('plant', 940, 420, 34, 34)

      .build('Creative Hub', 'Private Office', 35),


    /* =================================================
       3 — BUSINESS MEETING ROOM · 12 seats
       Glass boardroom, presentation screen, waiting
       area, coffee bar
    ================================================= */
    3: new LayoutBuilder([1, 5, 7, 10], [4])

      .window(300, 9, 60, 8).window(640, 9, 60, 8)

      // booth + storage in the corners
      .booth(13, 13, 170, 100, 'BOOTH')
      .add('zone', 817, 13, 170, 100, 'STORE')
      .wall(817, 13, 817, 113).wall(817, 113, 987, 113)
      .door(830, 113, 34, 'h', 1)

      // glass meeting room
      .wall(200, 130, 800, 130, true)
      .wall(200, 130, 200, 450, true)
      .wall(800, 130, 800, 450, true)
      .wall(200, 450, 420, 450, true)
      .wall(580, 450, 800, 450, true)
      .add('board', 350, 142, 300, 10)
      .label(500, 185, 'PRESENTATION SCREEN')
      .add('meeting-table', 300, 230, 400, 120, 'MEETING TABLE')
      .chairsAround(300, 230, 400, 120, { top: 5, bottom: 5, left: 1, right: 1 }) // seats 1-12

      // waiting area
      .add('rug', 30, 470, 240, 145)
      .add('sofa', 50, 568, 170, 40)
      .add('round-table', 110, 510, 50, 50)
      .label(150, 485, 'WAITING AREA')

      // coffee bar
      .add('counter', 700, 590, 270, 26, 'COFFEE BAR')
      .add('round-table', 780, 500, 56, 56)
      .add('pouf', 870, 515, 34, 34)
      .add('plant', 940, 480, 34, 34)
      .add('plant', 400, 560, 34, 34)

      .build('Business Meeting Room', 'Meeting Room', 25),


    /* =================================================
       4 — STARTUP HUB · open office · 18 seats
       4 team pods, project table, kitchen, lounge,
       phone booths, stairs, lift, store
    ================================================= */
    4: new LayoutBuilder([2, 6, 9, 12, 15], [4, 17])

      .window(110, 9, 60, 8).window(300, 9, 60, 8)

      // team pods (seats 1-16)
      .pair(110, 150, 2).label(110, 238, 'TEAM A')
      .pair(300, 150, 2).label(300, 238, 'TEAM B')
      .pair(110, 300, 2).label(110, 388, 'TEAM C')
      .pair(300, 300, 2).label(300, 388, 'TEAM D')

      // project table (seats 17-18)
      .add('round-table', 180, 450, 100, 100, 'PROJECT')
      .seat(230, 437, -90, 'chair')
      .seat(230, 563, 90, 'chair')
      .chair(167, 500, 180).chair(293, 500, 0)

      // kitchen
      .room(560, 13, 427, 150, 'KITCHEN')
      .add('counter', 580, 40, 380, 22)
      .add('round-table', 700, 92, 52, 52).add('round-table', 820, 92, 52, 52)
      .door(600, 163, 50, 'h', 1)

      // lounge
      .add('rug', 520, 230, 300, 190)
      .add('sofa', 540, 370, 200, 40)
      .add('pouf', 540, 255, 36, 36).add('pouf', 600, 270, 36, 36).add('pouf', 720, 255, 36, 36)
      .add('round-table', 640, 310, 56, 56)
      .label(670, 243, 'LOUNGE')

      // phone booths
      .booth(840, 230, 147, 100, 'PHONE 1', 'left')
      .booth(840, 330, 147, 100, 'PHONE 2', 'left')

      // stairs / lift / store
      .add('stairs', 590, 520, 140, 100, 'STAIRS')
      .add('zone', 760, 520, 90, 100, 'LIFT')
      .add('zone', 850, 520, 137, 100, 'STORE')

      .add('plant', 440, 60, 34, 34)
      .add('plant', 420, 520, 34, 34)

      .build('Startup Hub', 'Open Space', 40),


    /* =================================================
       5 — EXECUTIVE OFFICE · 10 seats
       Corner office, assistant desk, board meeting room,
       private room, lounge
    ================================================= */
    5: new LayoutBuilder([3, 6, 9], [2])

      .window(150, 9, 70, 8).window(330, 9, 70, 8).window(700, 9, 70, 8)

      // executive office
      .room(13, 13, 520, 300, 'EXECUTIVE OFFICE')
      .add('counter', 22, 50, 22, 220)
      .add('sofa', 470, 50, 44, 110)
      .add('plant', 440, 260, 30, 30)
      .add('table', 120, 110, 300, 80, 'EXECUTIVE DESK')
      .chairsAround(120, 110, 300, 80, { top: 1, bottom: 2 })   // seats 1-3
      .door(250, 313, 50, 'h', 1)

      // assistant desk (seat 4)
      .seat(170, 390, 0)
      .label(170, 435, 'ASSISTANT')

      // board meeting room (seats 5-10)
      .room(533, 13, 454, 300, 'BOARD MEETING')
      .add('board', 700, 25, 180, 10)
      .add('meeting-table', 610, 110, 300, 90, 'MEETING')
      .chairsAround(610, 110, 300, 90, { top: 3, bottom: 3 })
      .door(533, 150, 46, 'v', 1)
      .door(700, 313, 50, 'h', 1)

      // private room
      .room(600, 420, 387, 207, 'PRIVATE ROOM')
      .add('sofa', 630, 570, 160, 42)
      .add('round-table', 850, 500, 60, 60)
      .chair(837, 530, 180).chair(923, 530, 0)
      .door(600, 470, 46, 'v', 1)

      // lounge
      .add('rug', 40, 470, 330, 140)
      .add('sofa', 60, 565, 200, 42)
      .add('sofa', 52, 490, 42, 70)
      .add('round-table', 150, 510, 50, 50)
      .label(250, 485, 'LOUNGE')
      .add('plant', 380, 570, 30, 30)

      .build('Executive Office', 'Private Office', 45),


    /* =================================================
       6 — FOCUS ROOM · 8 seats
       4 glass cubicles, focus table, phone booths,
       quiet area, coffee
    ================================================= */
    6: new LayoutBuilder([2, 6], [3])

      .window(110, 9, 60, 8).window(250, 9, 60, 8).window(390, 9, 60, 8).window(530, 9, 60, 8)

      // glass cubicles (seats 1-4)
      .wall(80, 13, 80, 125, true)
      .wall(220, 13, 220, 125, true)
      .wall(360, 13, 360, 125, true)
      .wall(500, 13, 500, 125, true)
      .wall(640, 13, 640, 125, true)
      .row(150, 55, 4, 90, 140)
      .label(360, 148, 'FOCUS CUBICLES')

      // phone booths
      .booth(700, 13, 95, 100, 'BOOTH 1')
      .booth(795, 13, 95, 100, 'BOOTH 2')
      .booth(890, 13, 97, 100, 'BOOTH 3')

      // focus table (seats 5-8)
      .add('table', 300, 230, 400, 110, 'FOCUS TABLE')
      .chairsAround(300, 230, 400, 110, { top: 2, bottom: 2 })
      .chair(287, 285, 180).chair(713, 285, 0)
      .add('board', 330, 385, 340, 10)
      .label(500, 415, 'WHITEBOARD WALL')

      // glass divider
      .wall(13, 440, 420, 440, true)
      .wall(580, 440, 987, 440, true)

      // quiet area
      .add('rug', 30, 470, 330, 145)
      .add('sofa', 50, 560, 170, 42)
      .add('sofa', 280, 500, 44, 90)
      .add('plant', 240, 570, 30, 30)
      .label(190, 485, 'QUIET AREA')

      // coffee
      .add('counter', 700, 590, 270, 26, 'COFFEE')
      .add('round-table', 790, 510, 50, 50)
      .add('pouf', 870, 520, 34, 34)

      .build('Focus Room', 'Meeting Room', 20)
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.spaceId = Number(this.route.snapshot.paramMap.get('id'));
    this.currentLayout = this.layouts[this.spaceId] ?? this.layouts[1];
  }

  ngOnInit(): void {
    // Restore the requested booking context after login/signup/email verification.
    // These query parameters affect selection only; they never alter the floor layout.
    const query = this.route.snapshot.queryParamMap;
    const startDate = query.get('startDate');
    const endDate = query.get('endDate');
    const seatNumber = Number(query.get('seatNumber'));

    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      this.reservationStartDate = startDate;
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      this.reservationEndDate = endDate;
    }
    if (this.reservationEndDate < this.reservationStartDate) {
      this.reservationEndDate = this.reservationStartDate;
    }
    if (query.has('seatNumber') && Number.isInteger(seatNumber) && seatNumber > 0) {
      this.pendingSeatNumber = seatNumber;
    }

    void this.loadSeatStatus();
  }

  private todayISO(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }


  private async loadSeatStatus(): Promise<void> {
    if (!this.spaceId || !Number.isFinite(this.spaceId)) {
      this.reservationError = 'Invalid coworking space.';
      return;
    }

    this.loadingSeats = true;
    this.reservationError = '';

    try {
      // Both GET endpoints are public and return only the fields needed to
      // render seat availability. Browsing and seat selection do not require login.
      const seats = await firstValueFrom(
        this.http.get<Array<{ id: number; seatNumber: number }>>(
          `${this.apiUrl}/seats?spaceId=${this.spaceId}`
        )
      );

      const reservations = await firstValueFrom(
        this.http.get<Array<{
          id: number;
          status: string;
          startDate: string;
          endDate: string;
          seat?: { id: number; seatNumber: number } | null;
        }>>(`${this.apiUrl}/reservations/space/${this.spaceId}`, {
          params: {
            startDate: this.reservationStartDate,
            endDate: this.reservationEndDate
          }
        })
      );

      const active = reservations.filter(r =>
        r.status !== 'CANCELLED' && !!r.seat
      );

      // The public endpoint intentionally hides user identities. When signed in,
      // compare it with the authenticated user's own reservation list so their
      // bookings render green while bookings belonging to other accounts render red.
      let myReservations: Array<{ id: number; status: string; startDate: string; endDate: string; seat?: { id: number } | null }> = [];
      const token = localStorage.getItem('coworking_access_token');
      if (token) {
        try {
          myReservations = await firstValueFrom(this.http.get<typeof myReservations>(`${this.apiUrl}/reservations`, {
            headers: { Authorization: `Bearer ${token}` }
          }));
        } catch (error) {
          // Public availability remains usable if a stale token exists.
          if ((error as HttpErrorResponse).status === 401) {
            localStorage.removeItem('coworking_access_token');
          }
        }
      }
      const overlapsSelectedDates = (booking: { startDate: string; endDate: string }) =>
        String(booking.startDate).slice(0, 10) <= this.reservationEndDate &&
        String(booking.endDate).slice(0, 10) >= this.reservationStartDate;
      const myActive = myReservations.filter(r =>
        r.status !== 'CANCELLED' && r.status !== 'cancelled' && !!r.seat && overlapsSelectedDates(r)
      );

      // Seat mapping contract: visual seat N maps only to database seatNumber N
      // inside the current space. Never map by array position or assume that a
      // database ID equals the visual number. Ambiguous/missing mappings fail closed.
      const dbSeatsByNumber = new Map<number, Array<{ id: number; seatNumber: number }>>();
      for (const dbSeat of seats) {
        const number = Number(dbSeat.seatNumber);
        const matches = dbSeatsByNumber.get(number) ?? [];
        matches.push(dbSeat);
        dbSeatsByNumber.set(number, matches);
      }

      let unmappedSeatCount = 0;
      for (const visualSeat of this.currentLayout.seats) {
        const matches = dbSeatsByNumber.get(visualSeat.number) ?? [];
        const dbSeat = matches.length === 1 ? matches[0] : undefined;
        visualSeat.databaseId = dbSeat?.id;
        visualSeat.reservationId = undefined;

        if (!dbSeat) {
          // Do not let a visually available seat submit an incorrect seat ID.
          visualSeat.status = 'unconfigured';
          unmappedSeatCount++;
          continue;
        }

        visualSeat.status = 'available';
        const booking = active.find(r => Number(r.seat?.id) === Number(dbSeat.id));
        if (booking) {
          const mine = myActive.find(r => Number(r.seat?.id) === Number(dbSeat.id));
          visualSeat.status = mine ? 'mine' : 'reserved';
          visualSeat.reservationId = mine?.id ?? booking.id;
        }
      }

      if (unmappedSeatCount > 0) {
        this.reservationError = `${unmappedSeatCount} seat(s) in this space do not have a unique database mapping. They are disabled until the seat records are corrected.`;
      }

      // Re-select the same visual seat only after fresh availability is loaded.
      // Never restore a seat that is reserved or lacks a unique database mapping.
      if (this.pendingSeatNumber !== null) {
        const requestedNumber = this.pendingSeatNumber;
        this.pendingSeatNumber = null;
        const requestedSeat = this.currentLayout.seats.find(
          seat => seat.number === requestedNumber
        );
        if (requestedSeat?.status === 'available' && requestedSeat.databaseId) {
          this.selectedSeat = requestedSeat;
          this.reservationError = '';
        } else {
          this.selectedSeat = null;
          this.reservationError = requestedSeat
            ? `Seat ${requestedNumber} is no longer available for those dates. Please choose another seat.`
            : `Seat ${requestedNumber} could not be restored for this space. Please choose a seat again.`;
        }
      }
    } catch {
      this.reservationError =
        'Could not load live seat availability. Check that the backend is running and the space has seats configured.';
    } finally {
      this.loadingSeats = false;
    }
  }

  onStartDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;

    this.reservationStartDate = value;
    if (this.reservationEndDate < value) {
      this.reservationEndDate = value;
    }
    this.selectedSeat = null;
    void this.loadSeatStatus();
  }

  onEndDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;

    this.reservationEndDate = value;
    this.selectedSeat = null;
    if (this.reservationEndDate < this.reservationStartDate) {
      this.reservationError = 'End date must be on or after start date.';
      return;
    }
    void this.loadSeatStatus();
  }

  get availableCount(): number {
    return this.currentLayout.seats.filter(s => s.status === 'available').length;
  }

  selectSeat(seat: Seat): void {
    if (seat.status === 'reserved' || seat.status === 'mine' || seat.status === 'unconfigured' || this.loadingSeats) {
      if (seat.status === 'unconfigured') {
        this.reservationError = `Seat ${seat.number} has no unique database mapping and cannot be reserved.`;
      }
      return;
    }
    this.reservationError = '';
    this.selectedSeat = seat;
  }

  /* ---------- confirmation popup ---------- */

  async confirmReservation(): Promise<void> {
    if (!this.selectedSeat || this.savingReservation) return;

    const token = localStorage.getItem('coworking_access_token');
    if (!token) {
      const returnUrl = this.router.createUrlTree(
        ['/spaces', this.spaceId, 'reserve'],
        {
          queryParams: {
            startDate: this.reservationStartDate,
            endDate: this.reservationEndDate,
            seatNumber: this.selectedSeat.number,
          },
        },
      ).toString();
      void this.router.navigate(['/auth'], {
        queryParams: {
          mode: 'login',
          returnUrl,
        },
      });
      return;
    }
    if (!this.selectedSeat.databaseId) {
      this.reservationError = 'This seat has no matching database seat for this space.';
      return;
    }
    if (this.reservationEndDate < this.reservationStartDate) {
      this.reservationError = 'End date must be on or after start date.';
      return;
    }

    this.savingReservation = true;
    this.reservationError = '';

    try {
      const reservation = await firstValueFrom(
        this.http.post<{ id: number }>(
          `${this.apiUrl}/reservations`,
          {
            spaceId: this.spaceId,
            seatId: this.selectedSeat.databaseId,
            startDate: this.reservationStartDate,
            endDate: this.reservationEndDate
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      this.selectedSeat.status = 'mine';
      this.selectedSeat.reservationId = reservation.id;
      this.confirmedSeat = this.selectedSeat;
      this.confirmationNumber = 'CW-' + String(reservation.id).padStart(6, '0');
      this.showConfirmation = true;
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      this.reservationError =
        httpError.status === 409
          ? 'This seat is already booked for those dates. Availability has been refreshed.'
          : httpError.status === 401
            ? 'Your session expired. Please log in again.'
            : (httpError.error?.message ?? 'Could not complete the reservation.');
      await this.loadSeatStatus();
    } finally {
      this.savingReservation = false;
    }
  }

  @HostListener('document:keydown.escape')
  closeConfirmation(): void {
    if (!this.showConfirmation) {
      return;
    }
    this.showConfirmation = false;
    this.selectedSeat = null; // the seat now shows green (your reservation)
  }

  goToSpaces(): void {
    this.closeConfirmation();
    this.router.navigate(['/spaces']);
  }
}