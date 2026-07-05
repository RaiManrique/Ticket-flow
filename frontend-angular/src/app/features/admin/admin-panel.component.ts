import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatDate, roleLabel } from '../../core/utils/format.util';
import { LoadingSkeletonComponent } from '../../shared/ui/loading-skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent, EmptyStateComponent],
  templateUrl: './admin-panel.component.html',
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
  search = '';
  roleLabel = roleLabel;

  asString(v: unknown): string {
    return String(v ?? '');
  }

  ngOnInit(): void {
    this.initPanel();
    this.sessionSub = this.auth.onSessionChange().subscribe(() => this.initPanel());
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  filteredRows(): Record<string, unknown>[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((row) =>
      this.columns.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }

  columnLabel(col: string): string {
    return (
      {
        username: 'Usuario',
        email: 'Email',
        rol: 'Rol',
        nombre_completo: 'Nombre',
        titulo: 'Título',
        categoria: 'Categoría',
        ciudad: 'Ciudad',
        estado: 'Estado',
      }[col] || col
    );
  }

  private initPanel(): void {
    const path = this.route.snapshot.routeConfig?.path || 'usuarios';
    this.panel = path as typeof this.panel;
    this.loading = true;
    this.error = '';
    this.rows = [];
    this.search = '';
    const cfg: Record<string, { title: string; cols: string[]; load: () => ReturnType<AdminService['usuarios']> }> = {
      usuarios: { title: 'Usuarios', cols: ['username', 'nombre_completo', 'email', 'rol'], load: () => this.admin.usuarios() as never },
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
    if (col === 'fecha_registro' || col === 'fecha_evento') return formatDate(String(v));
    return String(v ?? '—');
  }
}
