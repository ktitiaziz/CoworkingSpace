import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Spaces } from './spaces';

describe('Spaces', () => {
  let component: Spaces;
  let fixture: ComponentFixture<Spaces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Spaces],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Spaces);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
