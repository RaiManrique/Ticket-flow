import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Publicacion } from '../../../core/models/ticketflow.models';
import { timeAgo } from '../../../core/utils/format.util';
import { postMedia, profilePhoto } from '../../../core/utils/images.util';

@Component({
  selector: 'app-usuario-comunidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-comunidad.component.html',
})
export class UsuarioComunidadComponent implements OnInit {
  private readonly social = inject(SocialService);
  readonly auth = inject(AuthService);

  posts: Publicacion[] = [];
  text = '';
  msg = '';
  error = '';
  loading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.social.publicaciones().subscribe({
      next: (p) => (this.posts = p),
      error: (err) => (this.error = err.message),
    });
  }

  publish(): void {
    if (this.text.trim().length < 5) {
      this.msg = 'Escribe al menos 5 caracteres.';
      return;
    }
    this.loading = true;
    this.social.crear(this.text.trim()).subscribe({
      next: () => {
        this.text = '';
        this.msg = 'Publicacion publicada.';
        this.loading = false;
        this.load();
      },
      error: (err) => {
        this.msg = err.error?.error || err.message;
        this.loading = false;
      },
    });
  }

  timeAgo = timeAgo;
  postMedia = postMedia;
  profilePhoto = profilePhoto;
}
