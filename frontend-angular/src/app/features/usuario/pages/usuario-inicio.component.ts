import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventCardComponent } from '../../../shared/event-card/event-card.component';
import { EventosStateService } from '../../../core/services/eventos-state.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { SocialService } from '../../../core/services/api.service';
import { Evento, Publicacion } from '../../../core/models/ticketflow.models';
import { timeAgo } from '../../../core/utils/format.util';
import { postMedia, profilePhoto } from '../../../core/utils/images.util';

@Component({
  selector: 'app-usuario-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EventCardComponent],
  templateUrl: './usuario-inicio.component.html',
})
export class UsuarioInicioComponent implements OnInit {
  readonly state = inject(EventosStateService);
  private readonly favs = inject(FavoritesService);
  private readonly social = inject(SocialService);
  private readonly router = inject(Router);

  query = '';
  ciudad = '';
  fecha = '';
  feed: Publicacion[] = [];
  feedError = '';

  ngOnInit(): void {
    if (!this.state.all().length) this.state.load();
    this.social.publicaciones().subscribe({
      next: (p) => (this.feed = p.slice(0, 4)),
      error: (err) => (this.feedError = err.message),
    });
  }

  trending(): Evento[] {
    return this.state.all().slice(0, 4);
  }

  isFav(e: Evento): boolean {
    return this.favs.isFavorite(e._id);
  }

  search(): void {
    this.state.search.set({ query: this.query.trim().toLowerCase(), ciudad: this.ciudad, fecha: this.fecha });
    this.router.navigate(['/usuario/eventos']);
  }

  buy(e: Evento): void {
    this.router.navigate(['/usuario/checkout', e._id]);
  }

  detail(e: Evento): void {
    this.router.navigate(['/usuario/eventos'], { queryParams: { detalle: e._id } });
  }

  share(e: Evento): void {
    const text = `${e.titulo} en ${e.ciudad}`;
    const url = `${window.location.origin}/usuario/eventos?detalle=${e._id}`;
    if (navigator.share) navigator.share({ title: e.titulo, text, url });
    else navigator.clipboard.writeText(`${text}\n${url}`);
  }

  toggleFav(e: Evento): void {
    this.favs.toggle(e._id);
  }

  timeAgo = timeAgo;
  postMedia = postMedia;
  profilePhoto = profilePhoto;
}
