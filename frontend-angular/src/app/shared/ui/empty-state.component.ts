import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">{{ icon }}</div>
      <h3>{{ title }}</h3>
      @if (description) {
        <p>{{ description }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description = '';
  @Input() icon = '✦';
}
