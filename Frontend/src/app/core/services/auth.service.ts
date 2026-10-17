import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type VerificationPurpose = 'REGISTRATION' | 'LOGIN';

export interface AuthStepResponse {
  message: string;
  requiresVerification: true;
  purpose: VerificationPurpose;
  email: string;
}

export interface VerifyResponse {
  message: string;
  accessToken?: string;
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

  login(email: string, password: string): Observable<AuthStepResponse> {
    return this.http.post<AuthStepResponse>(`${this.apiUrl}/login`, { email, password });
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

  resendCode(email: string, purpose: VerificationPurpose): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/resend-code`, { email, purpose });
  }

  getToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(this.tokenKey);
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.tokenKey);
  }
}
