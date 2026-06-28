import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Venta, VentasPanelResponse } from '../../core/models/ticketflow.models';
import { formatDate, formatMoney } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-ventas.component.html',
})
export class AdminVentasComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private sessionSub?: Subscription;

  data: VentasPanelResponse | null = null;
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
    this.admin.ventas().subscribe({
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

  ventasFiltradas(): Venta[] {
    const list = this.data?.ventas || [];
    const q = this.busqueda.trim().toLowerCase();
    return list.filter((v) => {
      if (this.filtroEstado !== 'todos' && v.estado !== this.filtroEstado) return false;
      if (!q) return true;
      const hay = [
        v.referencia_pago,
        v.comprador?.username,
        v.comprador?.nombre_completo,
        v.comprador?.email,
        v.evento?.titulo,
        v.metodo_pago,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  metodoLabel(metodo?: string): string {
    return ({ tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia' } as Record<string, string>)[metodo || ''] || metodo || '—';
  }

  estadoClass(estado?: string): string {
    return estado === 'confirmada' ? 'ok' : estado === 'reembolsada' ? 'warn' : 'muted';
  }
}
