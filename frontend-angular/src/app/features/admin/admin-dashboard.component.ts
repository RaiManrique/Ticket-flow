import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminDashboardData } from '../../core/models/ticketflow.models';
import { LoadingSkeletonComponent } from '../../shared/ui/loading-skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { CATEGORY_LABEL, formatDate } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSkeletonComponent, EmptyStateComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private sessionSub?: Subscription;

  data: AdminDashboardData | null = null;
  loading = true;
  error = '';
  readonly isAdmin = this.auth.getUser()?.rol === 'admin';
  formatDate = formatDate;
  categoryLabel = CATEGORY_LABEL;

  ngOnInit(): void {
    this.load();
    this.sessionSub = this.auth.onSessionChange().subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.data = null;
    this.error = '';
    this.admin.dashboard().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || err.message;
        this.loading = false;
      },
    });
  }

  isOrganizerView(): boolean {
    return this.data?.scope === 'organizador';
  }

  resumen() {
    return this.data?.resumen;
  }

  organizerName(): string {
    const u = this.auth.getUser();
    return (u?.nombre_completo || u?.username || 'Organizador').split(' ')[0];
  }

  hasEvents(): boolean {
    return (this.resumen()?.eventos || 0) > 0;
  }

  avgAsistentesLabel(): string {
    const eventos = this.resumen()?.eventos || 0;
    const asistentes = this.resumen()?.asistentes || 0;
    if (!eventos) return 'Promedio por evento: 0';
    const avg = Math.round((asistentes / eventos) * 10) / 10;
    return `Promedio ${avg} por evento`;
  }
}
