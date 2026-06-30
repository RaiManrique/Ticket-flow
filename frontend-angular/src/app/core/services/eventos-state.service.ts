import { Injectable, inject, signal } from '@angular/core';
import { EventosService } from './api.service';
import { Evento } from '../models/ticketflow.models';
import { FavoritesService } from './favorites.service';

export type SortOption = 'fecha-asc' | 'popularidad';

@Injectable({ providedIn: 'root' })
export class EventosStateService {
  private readonly api = inject(EventosService);
  private readonly favs = inject(FavoritesService);

  readonly all = signal<Evento[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  filter = signal('todos');
  search = signal({ query: '', ciudad: '', fecha: '' });
  sort = signal<SortOption>('fecha-asc');
  favoritesOnly = signal(false);

  filtered(): Evento[] {
    const favorites = this.favs.getIds();
    let list = this.all().filter((e) => {
      if (this.filter() !== 'todos' && e.categoria !== this.filter()) return false;
      if (this.favoritesOnly() && !favorites.has(String(e._id))) return false;
      const s = this.search();
      if (s.ciudad && e.ciudad !== s.ciudad) return false;
      if (s.fecha) {
        const d = new Date(e.fecha_evento).toISOString().slice(0, 10);
        if (d !== s.fecha) return false;
      }
      if (s.query) {
        const hay = `${e.titulo} ${e.descripcion || ''} ${e.categoria} ${e.ciudad}`.toLowerCase();
        if (!hay.includes(s.query.toLowerCase())) return false;
      }
      return true;
    });

    const fans = (e: Evento) => e.asistentes?.length || 0;
    const sort = this.sort();
    list = [...list].sort((a, b) => {
      if (sort === 'popularidad') return fans(b) - fans(a);
      return new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
    });
    return list;
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: (data) => {
        this.all.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  findById(id: string): Evento | undefined {
    return this.all().find((e) => String(e._id) === String(id));
  }

  resetUserPreferences(): void {
    this.favoritesOnly.set(false);
    this.filter.set('todos');
    this.search.set({ query: '', ciudad: '', fecha: '' });
  }
}
