
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  AuthService,
  VerificationPurpose,
} from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  mode: 'login' | 'signup' | 'verify' = 'login';

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  code = '';

  purpose: VerificationPurpose = 'REGISTRATION';

  message = '';
  error = '';
  busy = false;
  resendBusy = false;

  constructor() {
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (mode === 'signup') {
      this.mode = 'signup';
    }
  }

  switchMode(mode: 'login' | 'signup'): void {
    this.mode = mode;
    this.resetMessages();
    this.code = '';
  }

  submitSignup(): void {
    this.resetMessages();

    if (
      !this.firstName.trim() ||
      !this.lastName.trim() ||
      !this.email.trim() ||
      !this.password
    ) {
      this.error = 'Please complete every field.';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Your password must contain at least 8 characters.';
      return;
    }

    this.busy = true;

    this.auth
      .register(
        this.firstName.trim(),
        this.lastName.trim(),
        this.email.trim(),
        this.password,
      )
      .pipe(finalize(() => (this.busy = false)))
      .subscribe({
        next: (response) => {
          this.startVerification(
            response.email,
            response.purpose,
            response.message,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
        },
      });
  }

  submitLogin(): void {
    this.resetMessages();

    if (!this.email.trim() || !this.password) {
      this.error = 'Enter your email and password.';
      return;
    }

    this.busy = true;

    this.auth
      .login(this.email.trim(), this.password)
      .pipe(finalize(() => (this.busy = false)))
      .subscribe({
        next: (response) => {
          this.startVerification(
            response.email,
            response.purpose,
            response.message,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
        },
      });
  }

  submitCode(): void {
    this.resetMessages();

    if (!/^\d{6}$/.test(this.code)) {
      this.error = 'Enter the six-digit code from your email.';
      return;
    }

    this.busy = true;

    this.auth
      .verifyCode(this.email.trim(), this.code, this.purpose)
      .pipe(finalize(() => (this.busy = false)))
      .subscribe({
        next: (response) => {
          if (response.accessToken) {
            this.message = 'Verified successfully. Redirecting…';

            const requestedReturnUrl =
              this.route.snapshot.queryParamMap.get('returnUrl') || '/spaces';
            // Only allow in-app absolute paths; reject protocol-relative URLs.
            const returnUrl =
              requestedReturnUrl.startsWith('/') && !requestedReturnUrl.startsWith('//')
                ? requestedReturnUrl
                : '/spaces';

            void this.router.navigateByUrl(returnUrl);
            return;
          }

          this.mode = 'login';
          this.password = '';
          this.code = '';
          this.purpose = 'LOGIN';
          this.message =
            response.message || 'Email verified. You can now log in.';
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
        },
      });
  }

  resendCode(): void {
    this.resetMessages();

    if (!this.email.trim()) {
      this.error = 'Enter your email address first.';
      return;
    }

    this.resendBusy = true;

    this.auth
      .resendCode(this.email.trim(), this.purpose)
      .pipe(finalize(() => (this.resendBusy = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
        },
      });
  }

  private startVerification(
    email: string,
    purpose: VerificationPurpose,
    message: string,
  ): void {
    this.email = email;
    this.purpose = purpose;
    this.code = '';
    this.mode = 'verify';
    this.message = message;
    this.error = '';
  }

  private resetMessages(): void {
    this.error = '';
    this.message = '';
  }

  private handleError(error: HttpErrorResponse): void {
    const body = error.error as
      | { message?: string | string[] }
      | null;

    const detail = body?.message;

    this.error = Array.isArray(detail)
      ? detail.join(' ')
      : detail ||
        'Request failed. Check that the backend is running and try again.';
  }
}
