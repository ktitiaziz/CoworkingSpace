import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpacesDetails } from './spaces-details';

describe('SpacesDetails', () => {
  let component: SpacesDetails;
  let fixture: ComponentFixture<SpacesDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacesDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(SpacesDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
