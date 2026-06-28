import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/api.service';
import { formatMoney } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminService);
  data: Record<string, unknown> | null = null;
  error = '';
  formatMoney = formatMoney;

  ngOnInit(): void {
    this.admin.dashboard().subscribe({
      next: (d) => (this.data = d),
      error: (err) => (this.error = err.error?.error || err.message),
    });
  }

  resumen(): Record<string, number> {
    return (this.data?.['resumen'] as Record<string, number>) || {};
  }

  boletosPorEstado(): [string, number][] {
    return Object.entries((this.data?.['boletosPorEstado'] as Record<string, number>) || {});
  }

  ventasRecientes(): Record<string, unknown>[] {
    return (this.data?.['ventasRecientes'] as Record<string, unknown>[]) || [];
  }

  money(n: unknown): string {
    return formatMoney(Number(n));
  }
}
