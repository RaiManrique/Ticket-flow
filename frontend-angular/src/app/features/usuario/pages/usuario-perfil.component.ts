import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { coverPhoto, eventFlyer, profilePhoto } from '../../../core/utils/images.util';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { Evento, Publicacion, User } from '../../../core/models/ticketflow.models';
import { SocialService, EventosService } from '../../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-usuario-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmptyStateComponent],
  templateUrl: './usuario-perfil.component.html',
})
export class UsuarioPerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly uploadService = inject(UploadService);
  private readonly social = inject(SocialService);
  private readonly eventosService = inject(EventosService);
  private readonly favs = inject(FavoritesService);
  private readonly router = inject(Router);

  user: User | null = null;
  nombreCompleto = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  selectedCoverFile: File | null = null;
  coverPreviewUrl: string | null = null;
  avatarError = false;

  loading = false;
  msg = '';
  error = '';

  myPosts: Publicacion[] = [];
  myEvents: Evento[] = [];
  myMedia: string[] = [];

  eventFlyer = eventFlyer;

  ngOnInit(): void {
    this.user = this.auth.getUser();
    if (this.user) {
      this.nombreCompleto = this.user.nombre_completo || '';
      this.loadProfileData();
    }
  }

  get userId(): string {
    return String(this.user?._id || '');
  }

  favCount(): number {
    return this.favs.count();
  }

  initials(): string {
    return (this.user?.username || 'U').slice(0, 2).toUpperCase();
  }

  avatarSrc(): string {
    if (this.previewUrl) return this.previewUrl;
    return profilePhoto(this.user);
  }

  coverSrc(): string | null {
    if (this.coverPreviewUrl) return this.coverPreviewUrl;
    return coverPhoto(this.user);
  }

  hasChanges(): boolean {
    const nameChanged = this.nombreCompleto.trim() !== (this.user?.nombre_completo || '').trim();
    return !!(this.selectedFile || this.selectedCoverFile || nameChanged);
  }

  onAvatarError(event: Event): void {
    this.avatarError = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  goToEvent(e: Evento): void {
    this.router.navigate(['/usuario/eventos'], { queryParams: { detalle: e._id } });
  }

  private loadProfileData(): void {
    if (!this.user) return;
    const userId = this.userId;

    this.social.publicaciones().subscribe({
      next: (posts) => {
        this.myPosts = posts.filter((p) => p.autor?._id === userId || (p as { usuario_id?: string }).usuario_id === userId);
        this.myMedia = this.myPosts.flatMap((p) => p.media_urls || []);
      },
      error: () => {
        this.error = 'No se pudieron cargar tus publicaciones';
      },
    });

    this.eventosService.list().subscribe({
      next: (events) => {
        this.myEvents = events
          .filter((e) => (e.asistentes || []).map(String).includes(userId))
          .sort((a, b) => new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime());
      },
      error: () => {
        this.error = 'No se pudieron cargar tus eventos';
      },
    });
  }

  isVideo(url: string | undefined): boolean {
    return !!url && /\.(mp4|webm|ogg)$/i.test(url);
  }

  onFileSelected(event: Event, type: 'avatar' | 'cover' = 'avatar'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    if (type === 'avatar') {
      this.selectedFile = file;
      this.avatarError = false;
      reader.onload = (e) => (this.previewUrl = e.target?.result as string);
    } else {
      this.selectedCoverFile = file;
      reader.onload = (e) => (this.coverPreviewUrl = e.target?.result as string);
    }
    reader.readAsDataURL(file);
    input.value = '';
  }

  async saveProfile(): Promise<void> {
    if (!this.nombreCompleto.trim()) {
      this.error = 'El nombre completo es obligatorio';
      return;
    }

    this.loading = true;
    this.error = '';
    this.msg = '';

    try {
      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;

      if (this.selectedFile) {
        const res = await firstValueFrom(this.uploadService.uploadFile(this.selectedFile));
        avatarUrl = res?.url;
      }

      if (this.selectedCoverFile) {
        const res = await firstValueFrom(this.uploadService.uploadFile(this.selectedCoverFile));
        coverUrl = res?.url;
      }

      this.submitUpdate(avatarUrl, coverUrl);
    } catch (err: unknown) {
      const e = err as { error?: { error?: string }; message?: string };
      this.error = 'Error al subir imágenes: ' + (e.error?.error || e.message || 'desconocido');
      this.loading = false;
    }
  }

  private submitUpdate(fotoUrl?: string, portadaUrl?: string): void {
    const data: { nombre_completo: string; foto_perfil_url?: string; foto_portada_url?: string } = {
      nombre_completo: this.nombreCompleto.trim(),
    };
    if (fotoUrl) data.foto_perfil_url = fotoUrl;
    if (portadaUrl) data.foto_portada_url = portadaUrl;

    this.auth.updateProfile(data).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.nombreCompleto = updatedUser.nombre_completo || '';
        this.selectedFile = null;
        this.selectedCoverFile = null;
        this.previewUrl = null;
        this.coverPreviewUrl = null;
        this.avatarError = false;
        this.loading = false;
        this.msg = 'Perfil actualizado correctamente';
        setTimeout(() => (this.msg = ''), 3500);
      },
      error: (err) => {
        this.error = err.error?.error || err.message;
        this.loading = false;
      },
    });
  }

  deleteAccount(): void {
    if (!confirm('ATENCIÓN: Esta acción eliminará tu cuenta de forma permanente. ¿Estás seguro?')) {
      return;
    }

    this.loading = true;
    this.auth.eliminarCuenta().subscribe({
      next: () => this.auth.logout(),
      error: (err) => {
        this.error = 'Error al eliminar cuenta: ' + (err.error?.error || err.message);
        this.loading = false;
      },
    });
  }
}
