
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200">
      <div class="max-w-7xl mx-auto">
        
        <header class="mb-8">
            <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
               <span class="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"><span class="material-icons text-emerald-400">verified_user</span></span>
               Registro de Auditoría
            </h1>
            <p class="text-slate-400 text-sm ml-14">Trazabilidad completa de acciones y seguridad.</p>
        </header>

        <div class="glassmorphism-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div *ngIf="audit.isLoading()" class="px-6 py-4 border-b border-white/10 text-xs text-slate-400">
            Cargando logs reales del sistema...
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-white/5 text-slate-300 font-bold border-b border-white/10 uppercase text-xs tracking-wider">
                <tr>
                  <th class="px-6 py-4">Fecha / Hora</th>
                  <th class="px-6 py-4">Usuario / Rol</th>
                  <th class="px-6 py-4">Módulo</th>
                  <th class="px-6 py-4">Acción</th>
                  <th class="px-6 py-4 text-right">IP Origen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-300">
                <tr *ngFor="let log of audit.logs()" class="hover:bg-white/5 transition-colors group">
                  <td class="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                    {{ log.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="font-bold text-white">{{ log.user }}</div>
                    <div class="text-[10px] text-slate-500 uppercase">{{ log.role }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wide">
                        {{ log.module }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="font-medium text-slate-200">{{ log.action }}</div>
                    <div class="text-xs text-slate-500 truncate max-w-md">{{ log.details }}</div>
                  </td>
                  <td class="px-6 py-4 text-right font-mono text-xs text-slate-500">
                    {{ log.ip }}
                  </td>
                </tr>
                <tr *ngIf="!audit.isLoading() && audit.logs().length === 0">
                  <td colspan="5" class="px-6 py-8 text-center text-sm text-slate-500">
                    No hay registros de auditoría disponibles.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuditComponent implements OnInit {
  audit = inject(AuditService);

  ngOnInit() {
    void this.audit.reload({ page: 1, pageSize: 150 });
  }
}
