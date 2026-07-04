import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { profilePhoto } from '../../../core/utils/images.util';
import { Evento, Publicacion, User } from '../../../core/models/ticketflow.models';
import { SocialService, EventosService } from '../../../core/services/api.service';

@Component({
  selector: 'app-usuario-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-perfil.component.html',
})
export class UsuarioPerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly uploadService = inject(UploadService);
  private readonly social = inject(SocialService);
  private readonly eventosService = inject(EventosService);

  user: User | null = null;
  nombreCompleto = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  selectedCoverFile: File | null = null;
  coverPreviewUrl: string | null = null;
  
  loading = false;
  msg = '';
  error = '';
  
  myPosts: Publicacion[] = [];
  myEvents: Evento[] = [];
  myMedia: string[] = [];
  
  profilePhoto = profilePhoto;

  ngOnInit(): void {
    this.user = this.auth.getUser();
    if (this.user) {
      this.nombreCompleto = this.user.nombre_completo || '';
      this.loadProfileData();
    }
  }

  private loadProfileData(): void {
    if (!this.user) return;
    const userId = this.user._id;

    // Load Posts & Media
    this.social.publicaciones().subscribe({
      next: (posts) => {
        this.myPosts = posts.filter(p => p.autor?._id === userId || (p as any).usuario_id === userId);
        
        // Extract Media
        this.myMedia = [];
        this.myPosts.forEach(p => {
          if (p.media_urls) {
            this.myMedia.push(...p.media_urls);
          }
        });
      },
      error: (err) => console.error('Error fetching posts:', err)
    });

    // Load Events
    this.eventosService.list().subscribe({
      next: (events) => {
        this.myEvents = events.filter(e => e.asistentes?.includes(userId));
      },
      error: (err) => console.error('Error fetching events:', err)
    });
  }

  isVideo(url: string | undefined): boolean {
    return !!url && url.match(/\.(mp4|webm|ogg)$/i) !== null;
  }

  onFileSelected(event: any, type: 'avatar' | 'cover'): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      if (type === 'avatar') {
        this.selectedFile = file;
        reader.onload = (e) => this.previewUrl = e.target?.result as string;
      } else {
        this.selectedCoverFile = file;
        reader.onload = (e) => this.coverPreviewUrl = e.target?.result as string;
      }
      reader.readAsDataURL(file);
    }
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
            const res = await this.uploadService.uploadFile(this.selectedFile).toPromise();
            avatarUrl = res?.url;
        }
        
        if (this.selectedCoverFile) {
            const res = await this.uploadService.uploadFile(this.selectedCoverFile).toPromise();
            coverUrl = res?.url;
        }
        
        this.submitUpdate(avatarUrl, coverUrl);
    } catch (err: any) {
        this.error = 'Error al subir imagenes: ' + (err.error?.error || err.message);
        this.loading = false;
    }
  }

  private submitUpdate(fotoUrl?: string, portadaUrl?: string): void {
    const data: any = { nombre_completo: this.nombreCompleto.trim() };
    if (fotoUrl) data.foto_perfil_url = fotoUrl;
    if (portadaUrl) data.foto_portada_url = portadaUrl;

    this.auth.updateProfile(data).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.msg = 'Perfil actualizado correctamente';
        this.selectedFile = null;
        this.selectedCoverFile = null;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || err.message;
        this.loading = false;
      }
    });
  }

  deleteAccount(): void {
    if (!confirm('ATENCIÓN: Esta acción eliminará tu cuenta de forma permanente. ¿Estás seguro?')) {
      return;
    }

    this.loading = true;
    this.auth.eliminarCuenta().subscribe({
      next: () => {
        this.auth.logout();
      },
      error: (err) => {
        this.error = 'Error al eliminar cuenta: ' + (err.error?.error || err.message);
        this.loading = false;
      }
    });
  }
}
