import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { VentasService, PoliticasService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Boleto, Reembolso } from '../../../core/models/ticketflow.models';
import { formatDate, formatMoney, seatLabel } from '../../../core/utils/format.util';
import { qrSvg, ticketQrData } from '../../../core/utils/qr.util';

@Component({
  selector: 'app-usuario-billetera',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-billetera.component.html',
})
export class UsuarioBilleteraComponent implements OnInit, OnDestroy {
  private readonly ventas = inject(VentasService);
  private readonly politicas = inject(PoliticasService);
  private readonly auth = inject(AuthService);
  private sessionSub?: Subscription;

  boletos: Boleto[] = [];
  reembolsos: Reembolso[] = [];
  error = '';
  hint = '';
  showRefund = false;
  refundBoleto: Boleto | null = null;
  refundMotivo = '';
  refundMsg = '';
  showPolicies = false;
  policiesHtml = '';

  ngOnInit(): void {
    this.load();
    this.sessionSub = this.auth.onSessionChange().subscribe(() => this.resetAndLoad());
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  private resetAndLoad(): void {
    this.boletos = [];
    this.reembolsos = [];
    this.error = '';
    this.load();
  }

  load(): void {
    this.ventas.misBoletos().subscribe({
      next: (b) => {
        this.boletos = b;
        this.hint = 'Limite de compra: maximo 4 boletos por evento por persona.';
      },
      error: (err) => (this.error = err.message),
    });
    this.ventas.misReembolsos().subscribe({
      next: (r) => (this.reembolsos = r),
    });
  }

  qr(b: Boleto): string {
    return qrSvg(ticketQrData(b, b.evento));
  }

  openRefund(b: Boleto): void {
    this.refundBoleto = b;
    this.refundMotivo = '';
    this.refundMsg = '';
    this.showRefund = true;
  }

  submitRefund(): void {
    if (!this.refundBoleto || this.refundMotivo.trim().length < 10) {
      this.refundMsg = 'Motivo minimo 10 caracteres.';
      return;
    }
    this.ventas.reembolso(this.refundBoleto._id, this.refundMotivo.trim()).subscribe({
      next: (r) => {
        this.refundMsg = r.mensaje;
        setTimeout(() => {
          this.showRefund = false;
          this.load();
        }, 1500);
      },
      error: (err) => (this.refundMsg = err.error?.error || err.message),
    });
  }

  openPolicies(): void {
    this.politicas.get().subscribe((data) => {
      this.policiesHtml = Object.entries(data.secciones).map(([k, s]) =>
        `<section><h4>${s.titulo}</h4><ul>${(s.items || []).map((i) => `<li>${i}</li>`).join('')}</ul></section>`
      ).join('');
      this.showPolicies = true;
    });
  }

  formatDate = formatDate;
  formatMoney = formatMoney;
  seatLabel = seatLabel;
}
