import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SpaceDetails } from './spaces-details';

describe('SpaceDetails', () => {
  let component: SpaceDetails;
  let fixture: ComponentFixture<SpaceDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceDetails],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SpaceDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
