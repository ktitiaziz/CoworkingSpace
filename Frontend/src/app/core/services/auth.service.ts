import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type VerificationPurpose = 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET';

export interface AuthStepResponse {
  message: string;
  requiresVerification: true;
  purpose: VerificationPurpose;
  email: string;
}

export interface LoginSuccessResponse {
  message: string;
  requiresVerification: false;
  accessToken: string;
}

export interface VerifyResponse {
  message: string;
  accessToken?: string;
  // Returned instead of an access token when a password reset code is confirmed.
  resetToken?: string;
}

export interface CurrentUser {
  email: string;
  firstName?: string;
  lastName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/auth';
  private readonly tokenKey = 'coworking_access_token';

  register(firstName: string, lastName: string, email: string, password: string): Observable<AuthStepResponse> {
    return this.http.post<AuthStepResponse>(`${this.apiUrl}/register`, {
      firstName, lastName, email, password,
    });
  }

  login(email: string, password: string): Observable<AuthStepResponse | LoginSuccessResponse> {
    return this.http.post<AuthStepResponse | LoginSuccessResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response) => {
        if ('accessToken' in response && response.accessToken) {
          localStorage.setItem(this.tokenKey, response.accessToken);
        }
      }),
    );
  }

  verifyCode(email: string, code: string, purpose: VerificationPurpose): Observable<VerifyResponse> {
    return this.http.post<VerifyResponse>(`${this.apiUrl}/verify-code`, { email, code, purpose }).pipe(
      tap((response) => {
        if (response.accessToken) {
          localStorage.setItem(this.tokenKey, response.accessToken);
        }
      }),
    );
  }

  forgotPassword(email: string): Observable<AuthStepResponse> {
    return this.http.post<AuthStepResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(email: string, resetToken: string, newPassword: string): Observable<VerifyResponse> {
    return this.http.post<VerifyResponse>(`${this.apiUrl}/reset-password`, { email, resetToken, newPassword }).pipe(
      tap((response) => {
        if (response.accessToken) {
          localStorage.setItem(this.tokenKey, response.accessToken);
        }
      }),
    );
  }

  resendCode(email: string, purpose: VerificationPurpose): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/resend-code`, { email, purpose });
  }

  getToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(this.tokenKey);
  }

  // Reads the display fields from the stored token. This is for UI only; the
  // backend still verifies the token signature on every protected request.
  getCurrentUser(): CurrentUser | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(''),
      );
      const data = JSON.parse(json) as Partial<CurrentUser>;
      return data.email ? { email: data.email, firstName: data.firstName, lastName: data.lastName } : null;
    } catch {
      return null;
    }
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.tokenKey);
  }
}
