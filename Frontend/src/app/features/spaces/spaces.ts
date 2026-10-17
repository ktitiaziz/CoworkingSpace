import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  selector: 'app-spaces',
  imports: [RouterLink, Navbar],
  templateUrl: './spaces.html',
  styleUrl: './spaces.scss'
})
export class Spaces {

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

  readonly search = signal('');
  readonly type = signal('');
  readonly location = signal('');

  readonly types = [...new Set(this.spaces.map((s) => s.type))];
  readonly locations = [...new Set(this.spaces.map((s) => s.location))];

  readonly filteredSpaces = computed(() => {
    const query = this.search().trim().toLowerCase();

    return this.spaces.filter((space) =>
      (!query || `${space.name} ${space.location} ${space.description}`.toLowerCase().includes(query)) &&
      (!this.type() || space.type === this.type()) &&
      (!this.location() || space.location === this.location())
    );
  });

  // Space photos are optional: fall back to the gradient placeholder when one is missing.
  failedImages = new Set<number>();

  onImageError(id: number): void {
    this.failedImages.add(id);
  }

  resetFilters(): void {
    this.search.set('');
    this.type.set('');
    this.location.set('');
  }

  typeClass(type: string): string {
    return type.toLowerCase().replace(/\s+/g, '-');
  }

}