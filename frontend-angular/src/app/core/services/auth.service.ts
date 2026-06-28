import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DemoLoginInfo, LoginResponse, RegisterPayload, Session, User, UserRole } from '../models/ticketflow.models';
import { FavoritesService } from './favorites.service';
import { EventosStateService } from './eventos-state.service';

const AUTH_KEY = 'ticketflow_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly favorites = inject(FavoritesService);
  private readonly eventosState = inject(EventosStateService);
  private readonly base = environment.apiUrl;
  private readonly sessionChange = new Subject<string | null>();
  private activeUserId: string | null = null;

  onSessionChange(): Observable<string | null> {
    return this.sessionChange.asObservable();
  }

  syncStoredSession(): void {
    const user = this.getUser();
    if (user?._id) {
      this.applyUserContext(user._id);
    }
  }

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
      tap((data) => this.persistLogin(data))
    );
  }

  register(payload: RegisterPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/register`, payload).pipe(
      tap((data) => this.persistLogin(data))
    );
  }

  registerOrganizer(payload: RegisterPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/register-organizer`, payload).pipe(
      tap((data) => this.persistLogin(data))
    );
  }

  private persistLogin(data: LoginResponse): void {
    if (!data.token || !this.isJwtToken(data.token)) {
      throw new Error('Respuesta de autenticacion invalida');
    }
    this.saveSession({ token: data.token, user: data.user });
    this.applyUserContext(data.user._id);
  }

  private applyUserContext(userId: string): void {
    const id = String(userId);
    if (id === this.activeUserId) {
      this.favorites.setUser(id);
      return;
    }
    this.activeUserId = id;
    this.favorites.setUser(id);
    this.eventosState.resetUserPreferences();
    this.sessionChange.next(id);
  }

  private clearUserContext(): void {
    if (!this.activeUserId) {
      this.favorites.clear();
      return;
    }
    this.activeUserId = null;
    this.favorites.clear();
    this.eventosState.resetUserPreferences();
    this.sessionChange.next(null);
  }

  validateSession(): Observable<boolean> {
    const token = this.getToken();
    if (!token || !this.isJwtToken(token)) {
      this.clearSession();
      this.clearUserContext();
      return of(false);
    }
    return this.http.get<User>(`${this.base}/auth/me`).pipe(
      tap((user) => {
        this.saveSession({ token: token!, user });
        this.applyUserContext(user._id);
      }),
      map(() => true),
      catchError(() => {
        this.clearSession();
        this.clearUserContext();
        return of(false);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.clearUserContext();
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
