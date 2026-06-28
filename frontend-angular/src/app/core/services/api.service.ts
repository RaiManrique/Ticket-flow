import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Boleto,
  CompraResult,
  CupoEvento,
  Evento,
  PoliticasResponse,
  Publicacion,
  Reembolso,
  Venta,
} from '../models/ticketflow.models';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/eventos`;

  list(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.base);
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

  dashboard(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/dashboard`);
  }

  usuarios(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/usuarios`);
  }

  eventos(): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.base}/eventos`);
  }

  ventas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.base}/ventas`);
  }

  reembolsos(): Observable<Reembolso[]> {
    return this.http.get<Reembolso[]>(`${this.base}/reembolsos`);
  }
}