import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Reembolso, ReembolsosPanelResponse } from '../../core/models/ticketflow.models';
import { formatDate, formatMoney } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-reembolsos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reembolsos.component.html',
})
export class AdminReembolsosComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private sessionSub?: Subscription;

  data: ReembolsosPanelResponse | null = null;
  loading = true;
  error = '';
  filtroEstado = 'todos';
  busqueda = '';
  readonly isAdmin = this.auth.getUser()?.rol === 'admin';
  formatMoney = formatMoney;
  formatDate = formatDate;

  ngOnInit(): void {
    this.load();
    this.sessionSub = this.auth.onSessionChange().subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.admin.reembolsos().subscribe({
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

  reembolsosFiltrados(): Reembolso[] {
    const list = this.data?.reembolsos || [];
    const q = this.busqueda.trim().toLowerCase();
    return list.filter((r) => {
      if (this.filtroEstado !== 'todos' && r.estado !== this.filtroEstado) return false;
      if (!q) return true;
      const hay = [
        r.referencia,
        r.comprador?.username,
        r.comprador?.nombre_completo,
        r.evento?.titulo,
        r.motivo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  estadoClass(estado?: string): string {
    return estado === 'procesado' ? 'ok' : estado === 'pendiente' ? 'warn' : 'muted';
  }
}
