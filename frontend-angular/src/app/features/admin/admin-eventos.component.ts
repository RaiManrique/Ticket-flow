import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Evento, User } from '../../core/models/ticketflow.models';
import { CATEGORY_LABEL, formatDate } from '../../core/utils/format.util';
import { eventFlyer } from '../../core/utils/images.util';

@Component({
  selector: 'app-admin-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-eventos.component.html',
})
export class AdminEventosComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private sessionSub?: Subscription;

  eventos: Evento[] = [];
  loading = true;
  error = '';
  success = '';
  saving = false;
  showCreateForm = false;

  selectedId: string | null = null;
  detail: { evento: Evento; asistentes: User[] } | null = null;
  detailLoading = false;
  detailError = '';

  titulo = '';
  descripcion = '';
  categoria = 'concierto';
  ciudad = 'Lima';
  fecha_evento = '';

  readonly categorias = ['concierto', 'festival', 'teatro', 'deporte', 'otro'];
  readonly isAdmin = this.auth.getUser()?.rol === 'admin';
  readonly categoryLabel = CATEGORY_LABEL;
  formatDate = formatDate;
  eventFlyer = eventFlyer;

  ngOnInit(): void {
    this.load();
    this.sessionSub = this.auth.onSessionChange().subscribe(() => {
      this.closeDetail();
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.admin.eventos().subscribe({
      next: (data) => {
        this.eventos = data;
        this.loading = false;
        if (this.selectedId) this.openDetail(this.selectedId);
      },
      error: (err) => {
        this.error = err.error?.error || err.message;
        this.loading = false;
      },
    });
  }

  estadoLabel(estado?: string): string {
    return (
      {
        publicado: 'Publicado',
        borrador: 'Borrador',
        agotado: 'Agotado',
        cancelado: 'Cancelado',
      }[estado || 'publicado'] || estado || 'Publicado'
    );
  }

  estadoClass(estado?: string): string {
    const map: Record<string, string> = {
      publicado: 'ok',
      agotado: 'warn',
      cancelado: 'err',
      borrador: 'muted',
    };
    return map[estado || 'publicado'] || 'ok';
  }

  openDetail(id: string): void {
    this.selectedId = id;
    this.detailLoading = true;
    this.detailError = '';
    this.detail = null;
    this.admin.eventoDetalle(id).subscribe({
      next: (data) => {
        this.detail = data;
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailError = err.error?.error || err.message;
        this.detailLoading = false;
      },
    });
  }

  closeDetail(): void {
    this.selectedId = null;
    this.detail = null;
    this.detailError = '';
  }

  create(): void {
    this.error = '';
    this.success = '';
    if (!this.titulo.trim() || !this.fecha_evento) {
      this.error = 'Título y fecha son obligatorios.';
      return;
    }
    if (this.titulo.trim().length < 5) {
      this.error = 'El título debe tener al menos 5 caracteres.';
      return;
    }

    this.saving = true;
    this.admin
      .createEvento({
        titulo: this.titulo.trim(),
        descripcion: this.descripcion.trim(),
        categoria: this.categoria,
        ciudad: this.ciudad.trim(),
        fecha_evento: new Date(this.fecha_evento).toISOString(),
      })
      .subscribe({
        next: (res) => {
          this.success =
            res.mensaje ||
            'Evento publicado. Ya es visible para todos los usuarios en el catálogo.';
          this.titulo = '';
          this.descripcion = '';
          this.fecha_evento = '';
          this.showCreateForm = false;
          this.saving = false;
          this.load();
        },
        error: (err) => {
          this.error = err.error?.error || err.message;
          this.saving = false;
        },
      });
  }
}
