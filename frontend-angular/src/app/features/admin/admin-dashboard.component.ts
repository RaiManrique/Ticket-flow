import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminDashboardData } from '../../core/models/ticketflow.models';
import { CATEGORY_LABEL, formatDate } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private sessionSub?: Subscription;

  data: AdminDashboardData | null = null;
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
    this.data = null;
    this.error = '';
    this.admin.dashboard().subscribe({
      next: (d) => (this.data = d),
      error: (err) => (this.error = err.error?.error || err.message),
    });
  }

  isOrganizerView(): boolean {
    return this.data?.scope === 'organizador';
  }

  resumen() {
    return this.data?.resumen;
  }
}
