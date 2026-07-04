import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDashboardData,
  Evento,
  Publicacion,
  User,
} from '../models/ticketflow.models';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/eventos`;

  list(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.base, { headers: { 'Cache-Control': 'no-store' } });
  }

  detalle(id: string): Observable<Evento> {
    return this.http.get<Evento>(`${this.base}/${id}/detalle`);
  }

  asistir(id: string): Observable<{ asistiendo: boolean; totalAsistentes: number; asistentes: string[] }> {
    return this.http.post<{ asistiendo: boolean; totalAsistentes: number; asistentes: string[] }>(`${this.base}/${id}/asistir`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/social`;

  publicaciones(): Observable<Publicacion[]> {
    return this.http.get<Publicacion[]>(`${this.base}/publicaciones`);
  }

  crear(texto: string, media_urls?: string[]): Observable<Publicacion> {
    return this.http.post<Publicacion>(`${this.base}/publicaciones`, { texto, media_urls });
  }
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  dashboard(): Observable<AdminDashboardData> {
    return this.http.get<AdminDashboardData>(`${this.base}/dashboard`);
  }

  usuarios(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/usuarios`);
  }

  eventos(): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.base}/eventos`);
  }

  eventoDetalle(id: string): Observable<{ evento: Evento; asistentes: User[] }> {
    return this.http.get<{ evento: Evento; asistentes: User[] }>(`${this.base}/eventos/${id}/detalle`);
  }

  createEvento(payload: {
    titulo: string;
    descripcion?: string;
    categoria: string;
    ciudad: string;
    fecha_evento: string;
    flyer_url?: string;
  }): Observable<Evento & { mensaje?: string }> {
    return this.http.post<Evento & { mensaje?: string }>(`${this.base}/eventos`, payload);
  }
}