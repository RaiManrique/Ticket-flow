import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventCardComponent } from '../../../shared/event-card/event-card.component';
import { EventosStateService } from '../../../core/services/eventos-state.service';
import { EventosService, PoliticasService } from '../../../core/services/api.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { Evento } from '../../../core/models/ticketflow.models';
import { CATEGORY_LABEL, formatDate, formatMoney } from '../../../core/utils/format.util';
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
  private readonly politicas = inject(PoliticasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  detailEvento: Evento | null = null;
  detailLoading = false;
  detailError = '';
  showPolicies = false;
  policiesHtml = '';
  policyHighlight = '';

  ngOnInit(): void {
    if (!this.state.all().length) this.state.load();
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

  buy(e: Evento): void {
    this.router.navigate(['/usuario/checkout', e._id]);
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

  openPolicies(key = ''): void {
    this.policyHighlight = key;
    this.politicas.get().subscribe((data) => {
      const keys = ['compra', 'reembolso', 'acceso', 'menores'];
      this.policiesHtml = keys.map((k) => {
        const s = data.secciones[k];
        if (!s) return '';
        const items = (s.items || []).map((i) => `<li>${i}</li>`).join('');
        return `<section class="policies-section ${k === key ? 'highlight' : ''}"><h4>${s.titulo}</h4><ul>${items}</ul></section>`;
      }).join('');
      this.showPolicies = true;
    });
  }

  share(e: Evento): void {
    const url = `${window.location.origin}/usuario/eventos?detalle=${e._id}`;
    navigator.clipboard?.writeText(`${e.titulo}\n${url}`);
  }

  toggleFav(e: Evento): void {
    this.favs.toggle(e._id);
  }

  formatDate = formatDate;
  formatMoney = formatMoney;
  eventFlyer = eventFlyer;
  categoryLabel = CATEGORY_LABEL;
}
