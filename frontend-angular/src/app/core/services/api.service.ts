import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDashboardData,
  Boleto,
  CompraResult,
  CupoEvento,
  Evento,
  EventoOrganizador,
  EventoOrganizadorDetalle,
  PoliticasResponse,
  Publicacion,
  Reembolso,
  ReembolsosPanelResponse,
  Venta,
  VentasPanelResponse,
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

  boletos(id: string): Observable<Boleto[]> {
    return this.http.get<Boleto[]>(`${this.base}/${id}/boletos`);
  }
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ventas`;

  cupo(eventoId: string): Observable<CupoEvento> {
    return this.http.get<CupoEvento>(`${this.base}/cupo/${eventoId}`);
  }

  misBoletos(): Observable<Boleto[]> {
    return this.http.get<Boleto[]>(`${this.base}/mis-boletos`);
  }

  misReembolsos(): Observable<Reembolso[]> {
    return this.http.get<Reembolso[]>(`${this.base}/mis-reembolsos`);
  }

  comprar(payload: { evento_id: string; boletos_ids: string[]; metodo_pago: string }): Observable<CompraResult> {
    return this.http.post<CompraResult>(this.base, payload);
  }

  reembolso(boleto_id: string, motivo: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.base}/reembolso`, { boleto_id, motivo });
  }
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/social`;

  publicaciones(): Observable<Publicacion[]> {
    return this.http.get<Publicacion[]>(`${this.base}/publicaciones`);
  }

  crear(texto: string): Observable<Publicacion> {
    return this.http.post<Publicacion>(`${this.base}/publicaciones`, { texto });
  }
}

@Injectable({ providedIn: 'root' })
export class PoliticasService {
  private readonly http = inject(HttpClient);
  private cache: PoliticasResponse | null = null;

  get(): Observable<PoliticasResponse> {
    if (this.cache) return new Observable((obs) => { obs.next(this.cache!); obs.complete(); });
    return this.http.get<PoliticasResponse>(`${environment.apiUrl}/politicas`).pipe(
      tap((data) => { this.cache = data; })
    );
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

  eventos(): Observable<EventoOrganizador[]> {
    return this.http.get<EventoOrganizador[]>(`${this.base}/eventos`);
  }

  eventoDetalle(id: string): Observable<EventoOrganizadorDetalle> {
    return this.http.get<EventoOrganizadorDetalle>(`${this.base}/eventos/${id}/detalle`);
  }

  ventas(): Observable<VentasPanelResponse> {
    return this.http.get<VentasPanelResponse>(`${this.base}/ventas`);
  }

  reembolsos(): Observable<ReembolsosPanelResponse> {
    return this.http.get<ReembolsosPanelResponse>(`${this.base}/reembolsos`);
  }

  createEvento(payload: {
    titulo: string;
    descripcion?: string;
    categoria: string;
    ciudad: string;
    fecha_evento: string;
    flyer_url?: string;
    precio_base?: number;
  }): Observable<Evento & { mensaje?: string }> {
    return this.http.post<Evento & { mensaje?: string }>(`${this.base}/eventos`, payload);
  }
}