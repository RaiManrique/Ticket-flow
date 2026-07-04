import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { profilePhoto } from '../../../core/utils/images.util';
import { User } from '../../../core/models/ticketflow.models';

@Component({
  selector: 'app-usuario-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-perfil.component.html',
})
export class UsuarioPerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly uploadService = inject(UploadService);

  user: User | null = null;
  nombreCompleto = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  loading = false;
  msg = '';
  error = '';
  
  profilePhoto = profilePhoto;

  ngOnInit(): void {
    this.user = this.auth.getUser();
    if (this.user) {
      this.nombreCompleto = this.user.nombre_completo || '';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    if (!this.nombreCompleto.trim()) {
      this.error = 'El nombre completo es obligatorio';
      return;
    }

    this.loading = true;
    this.error = '';
    this.msg = '';

    if (this.selectedFile) {
      this.uploadService.uploadFile(this.selectedFile).subscribe({
        next: (res) => this.submitUpdate(res.url),
        error: (err) => {
          this.error = 'Error al subir la imagen: ' + (err.error?.error || err.message);
          this.loading = false;
        }
      });
    } else {
      this.submitUpdate();
    }
  }

  private submitUpdate(fotoUrl?: string): void {
    const data: any = { nombre_completo: this.nombreCompleto.trim() };
    if (fotoUrl) data.foto_perfil_url = fotoUrl;

    this.auth.updateProfile(data).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.msg = 'Perfil actualizado correctamente';
        this.selectedFile = null;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || err.message;
        this.loading = false;
      }
    });
  }
}
