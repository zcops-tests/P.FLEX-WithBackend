import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  getItem(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string) {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // Ignore storage failures.
    }
  }

  removeItem(key: string) {
    try {
      this.storage?.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }

  private get storage(): Storage | null {
    return typeof window !== 'undefined' ? window.localStorage : null;
  }
}
