import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeatmapComponent } from '../../../shared/seatmap/seatmap.component';
import { EventosService, VentasService, PoliticasService } from '../../../core/services/api.service';
import { EventosStateService } from '../../../core/services/eventos-state.service';
import { Boleto, CompraResult, CupoEvento, Evento } from '../../../core/models/ticketflow.models';
import { formatMoney, seatLabel } from '../../../core/utils/format.util';
import { eventFlyer } from '../../../core/utils/images.util';
import { qrSvg, ticketQrData } from '../../../core/utils/qr.util';

@Component({
  selector: 'app-usuario-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SeatmapComponent],
  templateUrl: './usuario-checkout.component.html',
})
export class UsuarioCheckoutComponent implements OnInit {
  @ViewChild(SeatmapComponent) seatmap?: SeatmapComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ventas = inject(VentasService);
  private readonly eventosApi = inject(EventosService);
  private readonly state = inject(EventosStateService);
  private readonly politicas = inject(PoliticasService);

  eventoId = '';
  evento: Evento | null = null;
  boletos: Boleto[] = [];
  cupo: CupoEvento = { maximo: 4, comprados: 0, disponibles: 4 };
  selected: Boleto[] = [];
  metodoPago = 'tarjeta';
  acceptTerms = false;
  msg = '';
  loading = false;
  showTicket = false;
  compraResult: CompraResult | null = null;
  showPolicies = false;
  policiesHtml = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.eventoId = p.get('id') || '';
      if (!this.state.all().length) this.state.load();
      this.evento = this.state.findById(this.eventoId) || null;
      this.loadBoletos();
      this.loadCupo();
    });
  }

  loadCupo(): void {
    this.ventas.cupo(this.eventoId).subscribe({
      next: (c) => (this.cupo = c),
    });
  }

  loadBoletos(): void {
    this.eventosApi.boletos(this.eventoId).subscribe({
      next: (b) => (this.boletos = b),
      error: (err) => (this.msg = err.message),
    });
  }

  onSelection(e: { ids: string[]; details: Boleto[] }): void {
    this.selected = e.details;
  }

  total(): number {
    return this.selected.reduce((s, b) => s + (Number(b.precio) || 0), 0);
  }

  comprar(): void {
    if (!this.acceptTerms) {
      this.msg = 'Debes aceptar las condiciones de compra.';
      return;
    }
    const ids = this.seatmap?.getSelected() || [];
    if (!ids.length) {
      this.msg = 'Selecciona al menos una entrada.';
      return;
    }
    this.loading = true;
    this.ventas.comprar({ evento_id: this.eventoId, boletos_ids: ids, metodo_pago: this.metodoPago }).subscribe({
      next: (r) => {
        this.compraResult = r;
        this.showTicket = true;
        this.msg = 'Compra confirmada.';
        this.loading = false;
        this.loadBoletos();
        this.loadCupo();
        this.state.load();
      },
      error: (err) => {
        this.msg = err.error?.error || err.message;
        this.loading = false;
      },
    });
  }

  openPolicies(): void {
    this.politicas.get().subscribe((data) => {
      this.policiesHtml = (data.secciones['compra']?.items || []).map((i) => `<li>${i}</li>`).join('');
      this.showPolicies = true;
    });
  }

  flyer(): string {
    return eventFlyer(this.evento);
  }

  qr(b: Boleto): string {
    return qrSvg(ticketQrData(b, this.evento));
  }

  goBilletera(): void {
    this.showTicket = false;
    this.router.navigate(['/usuario/billetera']);
  }

  formatMoney = formatMoney;
  seatLabel = seatLabel;
}
