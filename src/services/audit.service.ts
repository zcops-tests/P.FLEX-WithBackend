import { Injectable, signal } from '@angular/core';

export interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  role: string;
  module: string;
  action: string;
  details: string;
  ip: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  readonly logs = signal<AuditLog[]>([
    {
      id: 'log-init',
      timestamp: new Date(Date.now() - 3600000),
      user: 'Sistema',
      role: 'System',
      module: 'SISTEMA',
      action: 'Inicio de Servicios',
      details: 'El sistema se ha iniciado correctamente.',
      ip: 'client',
    },
  ]);

  log(user: string, role: string, module: string, action: string, details: string = '') {
    const newEntry: AuditLog = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
      timestamp: new Date(),
      user: user || 'Desconocido',
      role: role || '---',
      module: module.toUpperCase(),
      action,
      details: this.sanitize(details),
      ip: 'client',
    };

    this.logs.update((currentLogs) => [newEntry, ...currentLogs]);
  }

  private sanitize(value: string): string {
    return String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
  }
}
