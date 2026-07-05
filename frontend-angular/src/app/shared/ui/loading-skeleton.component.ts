import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrap" [class.skeleton-wrap--cards]="variant === 'cards'">
      @if (variant === 'cards') {
        @for (i of items; track i) {
          <div class="skeleton-card">
            <div class="skeleton-block skeleton-block--poster"></div>
            <div class="skeleton-block skeleton-block--title"></div>
            <div class="skeleton-block skeleton-block--line"></div>
          </div>
        }
      } @else if (variant === 'feed') {
        @for (i of items; track i) {
          <div class="skeleton-feed-row">
            <div class="skeleton-block skeleton-block--avatar"></div>
            <div class="skeleton-feed-body">
              <div class="skeleton-block skeleton-block--title"></div>
              <div class="skeleton-block skeleton-block--line"></div>
              <div class="skeleton-block skeleton-block--line short"></div>
            </div>
          </div>
        }
      } @else {
        @for (i of items; track i) {
          <div class="skeleton-block skeleton-block--line" [class.short]="i % 2 === 1"></div>
        }
      }
    </div>
  `,
})
export class LoadingSkeletonComponent {
  @Input() count = 3;
  @Input() variant: 'lines' | 'cards' | 'feed' = 'lines';

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
