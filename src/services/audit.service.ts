
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
  // Signal para reactividad en la UI
  readonly logs = signal<AuditLog[]>([
    { 
      id: 'log-init',
      timestamp: new Date(Date.now() - 3600000), 
      user: 'Sistema', 
      role: 'System', 
      module: 'SISTEMA', 
      action: 'Inicio de Servicios', 
      details: 'El sistema se ha iniciado correctamente.', 
      ip: 'localhost' 
    }
  ]);

  log(user: string, role: string, module: string, action: string, details: string = '') {
    const newEntry: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      user: user || 'Desconocido',
      role: role || '---',
      module: module.toUpperCase(),
      action: action,
      details: details,
      ip: this.generateRandomIP() // Simulación de IP ya que el navegador no la expone directamente
    };

    // Agregar al inicio del array
    this.logs.update(currentLogs => [newEntry, ...currentLogs]);
    
    // Opcional: Aquí se podría llamar a un backend real
    console.log('[AUDIT]', newEntry);
  }

  private generateRandomIP(): string {
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }
}
