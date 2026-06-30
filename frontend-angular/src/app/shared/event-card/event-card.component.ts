import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../core/models/ticketflow.models';
import { CATEGORY_LABEL, formatDateCard } from '../../core/utils/format.util';
import { eventFlyer } from '../../core/utils/images.util';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-card.component.html',
})
export class EventCardComponent {
  @Input({ required: true }) evento!: Evento;
  @Input() featured = false;
  @Input() favorite = false;

  @Output() detail = new EventEmitter<Evento>();
  @Output() share = new EventEmitter<Evento>();
  @Output() toggleFavorite = new EventEmitter<Evento>();

  readonly categoryLabel = CATEGORY_LABEL;

  flyer(e: Evento): string {
    return eventFlyer(e);
  }

  formatDateCard = formatDateCard;

  soldOut(e: Evento): boolean {
    return e.estado === 'agotado' || e.estado === 'cancelado';
  }

  fansLabel(count: number): string {
    if (count >= 1000) return `${Math.floor(count / 1000)}K+ asistentes`;
    return count > 0 ? `${count} asistirán` : 'Sin asistentes';
  }

  coverClass(categoria: string): string {
    return ({ concierto: 'cover-concierto', festival: 'cover-festival', teatro: 'cover-teatro' } as Record<string, string>)[categoria] || 'cover-default';
  }
}
