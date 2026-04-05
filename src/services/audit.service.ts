import { Injectable, inject, signal } from '@angular/core';
import { BackendApiService } from './backend-api.service';

export interface AuditLog {
  id: string;
  timestamp: Date;
  createdAt?: Date;
  user: string;
  role: string;
  module: string;
  moduleLabel?: string;
  action: string;
  actionLabel?: string;
  summary?: string;
  target?: string;
  entityId?: string | null;
  details: string;
  ip: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private backend = inject(BackendApiService);
  private readonly sessionLogs = signal<AuditLog[]>([]);

  readonly logs = signal<AuditLog[]>([]);
  readonly isLoading = signal(false);

  log(user: string, role: string, module: string, action: string, details: string = '') {
    const newEntry: AuditLog = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
      timestamp: new Date(),
      user: user || 'Desconocido',
      role: role || '---',
      module: module.toUpperCase(),
      action,
      actionLabel: action,
      summary: `${action} ${module}`.trim(),
      target: module,
      details: this.sanitize(details),
      ip: 'client',
    };

    this.sessionLogs.update((currentLogs) => [newEntry, ...currentLogs]);
  }

  async reload(query?: { page?: number; pageSize?: number; q?: string }) {
    this.isLoading.set(true);

    try {
      const response = await this.backend.getAuditLogs({
        page: query?.page || 1,
        pageSize: query?.pageSize || 100,
        q: query?.q,
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      this.logs.set(items.map((item: any) => this.mapLog(item)));
    } finally {
      this.isLoading.set(false);
    }
  }

  private sanitize(value: string): string {
    return String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
  }

  private mapLog(item: any): AuditLog {
    return {
      id: String(item.id || ''),
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      user: item.user || 'Sistema',
      role: item.role || 'N/A',
      module: String(item.module || '').toUpperCase(),
      moduleLabel: item.moduleLabel || item.module,
      action: item.action || '',
      actionLabel: item.actionLabel || item.action || '',
      summary: item.summary || `${item.action || ''} ${item.module || ''}`.trim(),
      target: item.target || item.entityId || '',
      entityId: item.entityId || null,
      details: this.sanitize(item.details || ''),
      ip: item.ip || 'N/A',
    };
  }
}
