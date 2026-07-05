import { Injectable, signal } from '@angular/core';

const LEGACY_KEY = 'ticketflow_event_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private userId: string | null = null;
  private readonly ids = signal<Set<string>>(new Set());

  private storageKey(): string {
    return this.userId ? `ticketflow_favorites_${this.userId}` : 'ticketflow_favorites_anon';
  }

  setUser(userId: string | null | undefined): void {
    const nextId = userId ? String(userId) : null;
    if (nextId === this.userId) return;

    this.userId = nextId;
    this.ids.set(new Set(this.load()));
    this.migrateLegacyKey();
  }

  clear(): void {
    this.userId = null;
    this.ids.set(new Set());
  }

  private migrateLegacyKey(): void {
    if (!this.userId) return;
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (!legacy) return;
      const parsed = JSON.parse(legacy);
      if (!Array.isArray(parsed) || !parsed.length) {
        localStorage.removeItem(LEGACY_KEY);
        return;
      }
      const current = this.load();
      if (!current.length) {
        localStorage.setItem(this.storageKey(), JSON.stringify(parsed));
        this.ids.set(new Set(parsed.map(String)));
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      localStorage.removeItem(LEGACY_KEY);
    }
  }

  load(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey()) || '[]');
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

  count(): number {
    return this.ids().size;
  }

  toggle(id: string): void {
    if (!this.userId) return;
    const next = new Set(this.ids());
    const key = String(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    localStorage.setItem(this.storageKey(), JSON.stringify([...next]));
    this.ids.set(next);
  }
}
