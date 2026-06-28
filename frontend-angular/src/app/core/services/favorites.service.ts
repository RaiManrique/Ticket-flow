import { Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'ticketflow_event_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly ids = signal<Set<string>>(new Set(this.load()));

  load(): string[] {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
      return [];
    }
  }

  getIds(): Set<string> {
    return this.ids();
  }

  isFavorite(id: string): boolean {
    return this.ids().has(String(id));
  }

  toggle(id: string): void {
    const next = new Set(this.ids());
    const key = String(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    this.ids.set(next);
  }
}
