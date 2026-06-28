import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DemoLoginInfo, LoginResponse, Session, User, UserRole } from '../models/ticketflow.models';

const AUTH_KEY = 'ticketflow_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  getSession(): Session | null {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.getSession()?.token ?? null;
  }

  getUser(): User | null {
    return this.getSession()?.user ?? null;
  }

  saveSession(data: Session): void {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  }

  clearSession(): void {
    localStorage.removeItem(AUTH_KEY);
  }

  isJwtToken(token: string | null | undefined): boolean {
    return typeof token === 'string' && token.split('.').length === 3;
  }

  redirectForRole(user?: User | null): string {
    return ['admin', 'organizador'].includes(user?.rol ?? '') ? '/admin' : '/usuario';
  }

  login(login: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { login, password }).pipe(
      tap((data) => {
        if (!data.token || !this.isJwtToken(data.token)) {
          throw new Error('Respuesta de login invalida');
        }
        this.saveSession({ token: data.token, user: data.user });
      })
    );
  }

  validateSession(): Observable<boolean> {
    const token = this.getToken();
    if (!token || !this.isJwtToken(token)) {
      this.clearSession();
      return of(false);
    }
    return this.http.get<User>(`${this.base}/auth/me`).pipe(
      tap((user) => this.saveSession({ token: token!, user })),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.getUser();
    return !!user && roles.includes(user.rol);
  }

  getDemoInfo(): Observable<DemoLoginInfo> {
    return this.http.get<DemoLoginInfo>(`${this.base}/demo/login-info`);
  }

  checkHealth(): Observable<boolean> {
    return this.http.get<{ status: string }>(`${this.base}/health`, { headers: { 'Cache-Control': 'no-store' } }).pipe(
      map((r) => r.status === 'ok'),
      catchError(() => of(false))
    );
  }
}
