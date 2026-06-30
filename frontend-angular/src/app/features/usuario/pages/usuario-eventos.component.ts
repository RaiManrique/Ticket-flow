import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventCardComponent } from '../../../shared/event-card/event-card.component';
import { EventosStateService } from '../../../core/services/eventos-state.service';
import { EventosService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { Evento } from '../../../core/models/ticketflow.models';
import { CATEGORY_LABEL, formatDate } from '../../../core/utils/format.util';
import { eventFlyer } from '../../../core/utils/images.util';

@Component({
  selector: 'app-usuario-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, EventCardComponent],
  templateUrl: './usuario-eventos.component.html',
})
export class UsuarioEventosComponent implements OnInit {
  readonly state = inject(EventosStateService);
  private readonly favs = inject(FavoritesService);
  private readonly eventosApi = inject(EventosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  detailEvento: Evento | null = null;
  detailLoading = false;
  detailError = '';

  ngOnInit(): void {
    this.state.load();
    this.route.queryParams.subscribe((p) => {
      if (p['detalle']) this.openDetail(String(p['detalle']));
    });
  }

  list(): Evento[] {
    return this.state.filtered();
  }

  isFav(e: Evento): boolean {
    return this.favs.isFavorite(e._id);
  }

  setFilter(f: string): void {
    this.state.filter.set(f);
  }

  clearFilters(): void {
    this.state.filter.set('todos');
    this.state.search.set({ query: '', ciudad: '', fecha: '' });
    this.state.favoritesOnly.set(false);
    this.state.sort.set('fecha-asc');
  }

  toggleFavFilter(): void {
    this.state.favoritesOnly.update((v) => !v);
  }

  openDetail(id: string): void {
    this.detailLoading = true;
    this.detailError = '';
    this.eventosApi.detalle(id).subscribe({
      next: (data) => {
        this.detailEvento = data;
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailError = err.error?.error || err.message;
        this.detailLoading = false;
      },
    });
  }

  closeDetail(): void {
    this.detailEvento = null;
    this.router.navigate([], { queryParams: {} });
  }

  share(e: Evento): void {
    const url = `${window.location.origin}/usuario/eventos?detalle=${e._id}`;
    navigator.clipboard?.writeText(`${e.titulo}\n${url}`);
  }

  toggleFav(e: Evento): void {
    this.favs.toggle(e._id);
  }

  isAttending(e: Evento): boolean {
    const user = this.auth.getUser();
    if (!user || !e.asistentes) return false;
    return e.asistentes.map(String).includes(String(user._id));
  }

  toggleAttendance(e: Evento): void {
    this.eventosApi.asistir(e._id).subscribe({
      next: (res) => {
        e.asistentes = res.asistentes;
        if (this.detailEvento && this.detailEvento._id === e._id) {
          this.detailEvento.asistentes = res.asistentes;
        }
        this.state.load();
      }
    });
  }

  formatDate = formatDate;
  eventFlyer = eventFlyer;
  categoryLabel = CATEGORY_LABEL;
}
