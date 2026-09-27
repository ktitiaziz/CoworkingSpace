import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
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

}