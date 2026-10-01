import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Myreserv } from './myreserv';

describe('Myreserv', () => {
  let component: Myreserv;
  let fixture: ComponentFixture<Myreserv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Myreserv],
    }).compileComponents();

    fixture = TestBed.createComponent(Myreserv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
