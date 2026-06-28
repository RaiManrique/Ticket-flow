import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Boleto } from '../../core/models/ticketflow.models';
import { createSeatMap } from './seatmap.engine';

@Component({
  selector: 'app-seatmap',
  standalone: true,
  template: `<div #host class="seatmap-host"></div>`,
  styles: [`.seatmap-host { width: 100%; }`],
})
export class SeatmapComponent implements AfterViewInit, OnChanges {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  @Input() boletos: Boleto[] = [];
  @Input() eventTitle = '';
  @Input() eventImage = '/img/eventos/concierto.jpg';
  @Input() maxSelection = 4;

  @Output() selectionChange = new EventEmitter<{ ids: string[]; details: Boleto[] }>();

  private instance: ReturnType<typeof createSeatMap> | null = null;

  ngAfterViewInit(): void {
    this.mount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.instance && (changes['boletos'] || changes['maxSelection'])) {
      this.mount();
    }
  }

  getSelected(): string[] {
    return (this.instance?.getSelected() ?? []) as string[];
  }

  private mount(): void {
    if (!this.host?.nativeElement || !this.boletos.length) return;
    this.instance = createSeatMap(this.boletos, {
      eventTitle: this.eventTitle,
      eventImage: this.eventImage,
      maxSelection: this.maxSelection,
      onChange: (ids: string[], details: Boleto[]) => this.selectionChange.emit({ ids, details }),
    });
    this.instance.mount(this.host.nativeElement);
  }
}
