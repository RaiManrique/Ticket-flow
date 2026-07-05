import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventCardComponent } from '../../../shared/event-card/event-card.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
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
  imports: [CommonModule, FormsModule, RouterLink, EventCardComponent, LoadingSkeletonComponent, EmptyStateComponent],
  templateUrl: './usuario-eventos.component.html',
})
export class UsuarioEventosComponent implements OnInit, OnDestroy {
  readonly state = inject(EventosStateService);
  private readonly favs = inject(FavoritesService);
  private readonly eventosApi = inject(EventosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  detailEvento: Evento | null = null;
  detailLoading = false;
  detailError = '';
  attendanceLoading = false;
  toastMsg = '';
  private activeDetailId: string | null = null;
  private modalOpen = false;

  ngOnInit(): void {
    this.state.load();
    this.route.queryParams.subscribe((p) => {
      if (p['favoritos'] === '1' || p['favoritos'] === 'true') {
        this.state.favoritesOnly.set(true);
      }
      if (p['asistiendo'] === '1' || p['asistiendo'] === 'true') {
        this.state.attendingOnly.set(true);
      }

      const detalle = p['detalle'] ? String(p['detalle']) : null;
      if (detalle) {
        if (detalle !== this.activeDetailId) {
          this.loadDetail(detalle);
        }
      } else {
        this.dismissDetail();
      }
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  list(): Evento[] {
    return this.state.filtered();
  }

  favCount(): number {
    return this.favs.count();
  }

  attendingCount(): number {
    const userId = String(this.auth.getUser()?._id || '');
    if (!userId) return 0;
    return this.state.all().filter((e) => (e.asistentes || []).map(String).includes(userId)).length;
  }

  isFav(e: Evento): boolean {
    return this.favs.isFavorite(e._id);
  }

  setFilter(f: string): void {
    this.state.filter.set(f);
  }

  onSearchChange(query: string): void {
    this.state.search.update((s) => ({ ...s, query: query.trim().toLowerCase() }));
  }

  onCiudadChange(ciudad: string): void {
    this.state.search.update((s) => ({ ...s, ciudad }));
  }

  clearFilters(): void {
    this.state.filter.set('todos');
    this.state.search.set({ query: '', ciudad: '', fecha: '' });
    this.state.favoritesOnly.set(false);
    this.state.attendingOnly.set(false);
    this.state.sort.set('fecha-asc');
    this.router.navigate([], { queryParams: {} });
  }

  toggleFavFilter(): void {
    this.state.favoritesOnly.update((v) => !v);
  }

  toggleAttendingFilter(): void {
    this.state.attendingOnly.update((v) => !v);
  }

  openDetail(id: string): void {
    const current = this.route.snapshot.queryParamMap.get('detalle');
    if (current === id && this.modalOpen) return;
    this.router.navigate([], { queryParams: { detalle: id }, queryParamsHandling: 'merge' });
  }

  private loadDetail(id: string): void {
    this.activeDetailId = id;
    this.modalOpen = true;
    this.detailLoading = true;
    this.detailError = '';
    document.body.style.overflow = 'hidden';
    this.eventosApi.detalle(id).subscribe({
      next: (data) => {
        if (this.activeDetailId !== id) return;
        this.detailEvento = data;
        this.detailLoading = false;
      },
      error: (err) => {
        if (this.activeDetailId !== id) return;
        this.detailError = err.error?.error || err.message;
        this.detailLoading = false;
      },
    });
  }

  closeDetail(): void {
    this.router.navigate([], { queryParams: { detalle: null }, queryParamsHandling: 'merge' });
  }

  private dismissDetail(): void {
    this.activeDetailId = null;
    this.modalOpen = false;
    this.detailEvento = null;
    this.detailError = '';
    this.detailLoading = false;
    document.body.style.overflow = '';
  }

  share(e: Evento): void {
    const url = `${window.location.origin}/usuario/eventos?detalle=${e._id}`;
    navigator.clipboard?.writeText(`${e.titulo}\n${url}`);
    this.showToast('Enlace copiado al portapapeles');
  }

  toggleFav(e: Evento): void {
    this.favs.toggle(e._id);
    this.showToast(this.favs.isFavorite(e._id) ? 'Añadido a favoritos' : 'Quitado de favoritos');
  }

  isAttending(e: Evento): boolean {
    const user = this.auth.getUser();
    if (!user || !e.asistentes) return false;
    return e.asistentes.map(String).includes(String(user._id));
  }

  toggleAttendance(e: Evento): void {
    const wasAttending = this.isAttending(e);
    this.attendanceLoading = true;
    this.eventosApi.asistir(e._id).subscribe({
      next: (res) => {
        e.asistentes = res.asistentes;
        if (this.detailEvento && this.detailEvento._id === e._id) {
          this.detailEvento.asistentes = res.asistentes;
        }
        this.state.load();
        this.attendanceLoading = false;
        this.showToast(wasAttending ? 'Asistencia cancelada' : '¡Asistencia confirmada!');
      },
      error: () => {
        this.attendanceLoading = false;
        this.showToast('No se pudo actualizar la asistencia');
      },
    });
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => (this.toastMsg = ''), 3000);
  }

  formatDate = formatDate;
  eventFlyer = eventFlyer;
  categoryLabel = CATEGORY_LABEL;
}
