import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatDate } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="admin-topbar"><div><h1>{{ title }}</h1></div></header>
    <div class="admin-card">
      @if (loading) { <p class="loading">Cargando...</p> }
      @else if (error) { <div class="alert error">{{ error }}</div> }
      @else if (!rows.length) { <p>Sin registros</p> }
      @else {
        <table class="data-table">
          <thead><tr>@for (col of columns; track col) { <th>{{ col }}</th> }</tr></thead>
          <tbody>
            @for (row of rows; track $index) {
              <tr>@for (col of columns; track col) { <td>{{ cell(row, col) }}</td> }</tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private sessionSub?: Subscription;

  panel: 'usuarios' | 'eventos' = 'usuarios';
  title = '';
  columns: string[] = [];
  rows: Record<string, unknown>[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.initPanel();
    this.sessionSub = this.auth.onSessionChange().subscribe(() => this.initPanel());
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  private initPanel(): void {
    const path = this.route.snapshot.routeConfig?.path || 'usuarios';
    this.panel = path as typeof this.panel;
    this.loading = true;
    this.error = '';
    this.rows = [];
    const cfg: Record<string, { title: string; cols: string[]; load: () => ReturnType<AdminService['usuarios']> }> = {
      usuarios: { title: 'Usuarios', cols: ['username', 'email', 'rol', 'nombre_completo'], load: () => this.admin.usuarios() as never },
      eventos: { title: 'Eventos', cols: ['titulo', 'categoria', 'ciudad', 'estado'], load: () => this.admin.eventos() as never },
    };
    const c = cfg[this.panel];
    this.title = c.title;
    this.columns = c.cols;
    c.load().subscribe({
      next: (data) => {
        this.rows = data as Record<string, unknown>[];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || err.message;
        this.loading = false;
      },
    });
  }

  cell(row: Record<string, unknown>, col: string): string {
    const v = row[col];
    if (col === 'fecha_solicitud' || col === 'fecha_venta') return formatDate(String(v));
    return String(v ?? '—');
  }
}
