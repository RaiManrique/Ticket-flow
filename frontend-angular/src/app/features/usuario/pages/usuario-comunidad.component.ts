import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Publicacion, Comentario } from '../../../core/models/ticketflow.models';
import { timeAgo } from '../../../core/utils/format.util';
import { postMedia, profilePhoto } from '../../../core/utils/images.util';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-usuario-comunidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-comunidad.component.html',
})
export class UsuarioComunidadComponent implements OnInit {
  private readonly social = inject(SocialService);
  readonly auth = inject(AuthService);
  private readonly uploadService = inject(UploadService);

  posts: Publicacion[] = [];
  text = '';
  msg = '';
  error = '';
  loading = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // Comments state
  comments: { [postId: string]: Comentario[] } = {};
  showComments: { [postId: string]: boolean } = {};
  commentDrafts: { [postId: string]: { text: string, file: File | null, previewUrl: string | null, loading: boolean } } = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.social.publicaciones().subscribe({
      next: (p) => (this.posts = p),
      error: (err) => (this.error = err.message),
    });
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

  publish(): void {
    if (this.text.trim().length < 5) {
      this.msg = 'Escribe al menos 5 caracteres.';
      return;
    }
    this.loading = true;

    if (this.selectedFile) {
      this.uploadService.uploadFile(this.selectedFile).subscribe({
        next: (res) => this.submitPost([res.url]),
        error: (err) => {
          this.msg = 'Error al subir archivo: ' + (err.error?.error || err.message);
          this.loading = false;
        }
      });
    } else {
      this.submitPost();
    }
  }

  private submitPost(mediaUrls?: string[]): void {
    this.social.crear(this.text.trim(), mediaUrls).subscribe({
      next: () => {
        this.text = '';
        this.selectedFile = null;
        this.previewUrl = null;
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

  // Comments Methods
  toggleComments(postId: string): void {
    if (this.showComments[postId]) {
      this.showComments[postId] = false;
      return;
    }
    
    this.showComments[postId] = true;
    if (!this.commentDrafts[postId]) {
      this.commentDrafts[postId] = { text: '', file: null, previewUrl: null, loading: false };
    }
    
    this.social.comentarios(postId).subscribe({
      next: (comms) => {
        this.comments[postId] = comms;
      }
    });
  }

  onCommentFileSelected(postId: string, event: any): void {
    const file = event.target.files[0];
    if (file && this.commentDrafts[postId]) {
      this.commentDrafts[postId].file = file;
      const reader = new FileReader();
      reader.onload = (e) => this.commentDrafts[postId].previewUrl = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  publishComment(postId: string): void {
    const draft = this.commentDrafts[postId];
    if (!draft || draft.text.trim().length < 2 && !draft.file) {
      return;
    }

    draft.loading = true;

    if (draft.file) {
      this.uploadService.uploadFile(draft.file).subscribe({
        next: (res) => this.submitComment(postId, [res.url]),
        error: () => { draft.loading = false; }
      });
    } else {
      this.submitComment(postId);
    }
  }

  private submitComment(postId: string, mediaUrls?: string[]): void {
    const draft = this.commentDrafts[postId];
    this.social.crearComentario(postId, draft.text.trim(), mediaUrls).subscribe({
      next: (newComment) => {
        draft.text = '';
        draft.file = null;
        draft.previewUrl = null;
        draft.loading = false;
        
        if (!this.comments[postId]) this.comments[postId] = [];
        this.comments[postId].push(newComment);
      },
      error: () => {
        draft.loading = false;
      }
    });
  }

  isVideo(url: string | undefined): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov') || lowerUrl.includes('video');
  }

  timeAgo = timeAgo;
  postMedia = postMedia;
  profilePhoto = profilePhoto;
}
