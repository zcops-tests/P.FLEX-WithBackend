
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { AdminService } from '../services/admin.service';
import { SystemConfig } from '../models/admin.models';

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Plant Params Card -->
      <div class="glassmorphism-card rounded-2xl overflow-hidden flex flex-col bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-industrial-orange/10 border border-industrial-orange/20">
              <span class="material-symbols-outlined text-industrial-orange">factory</span>
            </div>
            <h3 class="text-lg font-semibold text-white">Parámetros de Planta</h3>
          </div>
          <span class="px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Planta A</span>
        </div>
        <div class="p-6 space-y-6 flex-grow">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Horarios de Turnos</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-[#111827] p-3 rounded-xl border border-white/10">
                <span class="text-[10px] text-slate-500 block mb-2 uppercase font-bold">Mañana</span>
                <div class="space-y-2">
                  <input [(ngModel)]="tempConfig.shiftTime1" class="block w-full bg-[#1f2937] border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-primary px-3 py-1.5 outline-none" type="time"/>
                  <input class="block w-full bg-[#1f2937] border border-white/10 rounded-lg text-sm text-white px-3 py-1.5 outline-none" type="text" [(ngModel)]="tempConfig.shiftName1"/>
                </div>
              </div>
              <div class="bg-[#111827] p-3 rounded-xl border border-white/10">
                <span class="text-[10px] text-slate-500 block mb-2 uppercase font-bold">Tarde</span>
                <div class="space-y-2">
                  <input [(ngModel)]="tempConfig.shiftTime2" class="block w-full bg-[#1f2937] border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-primary px-3 py-1.5 outline-none" type="time"/>
                  <input class="block w-full bg-[#1f2937] border border-white/10 rounded-lg text-sm text-white px-3 py-1.5 outline-none" type="text" [(ngModel)]="tempConfig.shiftName2"/>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Áreas Activas</label>
            <textarea class="block w-full bg-[#111827] text-sm text-white rounded-xl font-mono p-4 outline-none focus:ring-1 focus:ring-primary resize-none border border-white/10" rows="3">Inyección; Ensamblaje; Pintura; Control de Calidad; Logística</textarea>
            <p class="mt-2 text-[11px] text-slate-500 italic">Separe las áreas con punto y coma (;).</p>
          </div>
          <div class="flex items-center justify-between pt-4 border-t border-white/5">
            <span class="text-sm font-medium text-slate-300">Modo Mantenimiento Global</span>
            <div class="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
              <input type="checkbox" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-600 transition-transform"/>
              <label class="toggle-label block overflow-hidden h-6 rounded-full bg-white/10 cursor-pointer"></label>
            </div>
          </div>
        </div>
      </div>

      <!-- PWA & Sync Card -->
      <div class="glassmorphism-card rounded-2xl overflow-hidden flex flex-col bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <span class="material-symbols-outlined text-primary">cloud_sync</span>
            </div>
            <h3 class="text-lg font-semibold text-white">PWA & Sincronización</h3>
          </div>
          <span class="px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-neon-green/10 text-neon-green border border-neon-green/20 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-neon-green animate-pulse"></span> Online
          </span>
        </div>
        <div class="p-6 space-y-8 flex-grow">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Frecuencia de Backup</label>
              <select class="block w-full bg-[#111827] px-4 py-2.5 text-sm text-white rounded-xl outline-none focus:ring-1 focus:ring-primary border border-white/10">
                <option class="bg-[#111827]">Cada 1 Hora</option>
                <option class="bg-[#111827]" selected="">Cada 4 Horas</option>
                <option class="bg-[#111827]">Diario (00:00)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Retención (Offline)</label>
              <select class="block w-full bg-[#111827] px-4 py-2.5 text-sm text-white rounded-xl outline-none focus:ring-1 focus:ring-primary border border-white/10">
                <option class="bg-[#111827]">3 Días</option>
                <option class="bg-[#111827]" selected="">7 Días</option>
                <option class="bg-[#111827]">30 Días</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Reglas de Resolución de Conflictos</label>
            <div class="space-y-3">
              <label class="flex items-center p-3 rounded-xl bg-[#111827] border border-white/10 cursor-pointer hover:border-primary/40 transition-all group">
                <input checked="" class="focus:ring-primary h-4 w-4 text-primary border-white/20 bg-transparent" name="conflict-rule" type="radio"/>
                <span class="ml-3 text-sm text-slate-300 group-hover:text-white">Servidor gana (Prioridad a datos centrales)</span>
              </label>
              <label class="flex items-center p-3 rounded-xl bg-[#111827] border border-white/10 cursor-pointer hover:border-primary/40 transition-all group">
                <input class="focus:ring-primary h-4 w-4 text-primary border-white/20 bg-transparent" name="conflict-rule" type="radio"/>
                <span class="ml-3 text-sm text-slate-300 group-hover:text-white">Dispositivo gana (Prioridad local)</span>
              </label>
              <label class="flex items-center p-3 rounded-xl bg-[#111827] border border-white/10 cursor-pointer hover:border-primary/40 transition-all group">
                <input class="focus:ring-primary h-4 w-4 text-primary border-white/20 bg-transparent" name="conflict-rule" type="radio"/>
                <span class="ml-3 text-sm text-slate-300 group-hover:text-white">Manual (Requiere intervención)</span>
              </label>
            </div>
          </div>
          <div class="pt-4 border-t border-white/5 flex items-center justify-between">
            <label class="flex items-center text-sm font-medium text-slate-300">
              <span class="material-symbols-outlined text-lg mr-2 text-slate-400">wifi_off</span> Sincronización solo Wi-Fi
            </label>
            <div class="relative inline-block w-12 align-middle select-none">
              <input type="checkbox" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-600 transition-transform"/>
              <label class="toggle-label block overflow-hidden h-6 rounded-full bg-white/10 cursor-pointer"></label>
            </div>
          </div>
        </div>
      </div>

      <!-- Communication Card (New) -->
      <div class="glassmorphism-card rounded-2xl overflow-hidden flex flex-col bg-white/5 border border-white/10 shadow-lg backdrop-blur-md lg:col-span-2">
        <div class="px-6 py-5 border-b border-white/5 flex items-center gap-3 bg-white/5">
          <div class="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span class="material-symbols-outlined text-yellow-500">campaign</span>
          </div>
          <h3 class="text-lg font-semibold text-white">Comunicación a Planta</h3>
        </div>
        <div class="p-6">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Mensaje del Supervisor (Terminal de Operadores)</label>
          <div class="relative">
              <textarea [(ngModel)]="tempConfig.operatorMessage" rows="2" class="block w-full bg-[#111827] px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-primary resize-none border border-white/10"></textarea>
              <div class="absolute bottom-3 right-3 text-[10px] text-slate-500 font-bold bg-black/40 px-2 py-1 rounded border border-white/10">VISIBLE EN TERMINALES</div>
          </div>
        </div>
      </div>

      <!-- Security & Logs (Full Width) -->
      <div class="lg:col-span-2 glassmorphism-card rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <span class="material-symbols-outlined text-red-500">security</span>
            </div>
            <h3 class="text-lg font-semibold text-white">Seguridad y Logs</h3>
          </div>
          <button class="text-[10px] uppercase tracking-widest text-primary hover:text-blue-400 font-bold transition-colors bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">Ver Logs Completos</button>
        </div>
        <div class="p-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div class="lg:col-span-1 space-y-8">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Caducidad de Contraseñas</label>
                <div class="flex">
                  <input class="bg-[#111827] flex-1 min-w-0 px-4 py-2.5 rounded-l-xl text-sm text-white outline-none border border-white/10" type="number" value="90"/>
                  <span class="inline-flex items-center px-4 rounded-r-xl border border-white/10 bg-white/5 text-slate-400 text-sm">días</span>
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Intentos Fallidos</label>
                <select class="block w-full bg-[#111827] px-4 py-2.5 text-sm text-white rounded-xl outline-none border border-white/10">
                  <option class="bg-[#111827]">3 Intentos</option>
                  <option class="bg-[#111827]" selected="">5 Intentos</option>
                </select>
              </div>
              <div class="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <span class="text-sm font-medium text-slate-300">2FA Obligatorio (Admin)</span>
                <div class="relative inline-block w-12 align-middle select-none">
                  <input checked="" type="checkbox" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-600 transition-transform"/>
                  <label class="toggle-label block overflow-hidden h-6 rounded-full bg-white/10 cursor-pointer"></label>
                </div>
              </div>
            </div>
            <div class="lg:col-span-2">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Última Actividad de Auditoría</h4>
              <div class="overflow-hidden bg-[#111827] rounded-xl border border-white/10">
                <table class="min-w-full divide-y divide-white/5">
                  <thead class="bg-white/5">
                    <tr>
                      <th class="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Usuario</th>
                      <th class="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acción</th>
                      <th class="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                      <th class="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">IP</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5 bg-white/5">
                    <tr class="hover:bg-white/5 transition-colors">
                      <td class="whitespace-nowrap py-3 px-4 text-xs font-bold text-white">jperez</td>
                      <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-400">Exportar Reporte</td>
                      <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-400">Ayer, 16:30</td>
                      <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-400 font-mono opacity-60">192.168.1.18</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Global Save Action -->
      <div class="lg:col-span-2 flex justify-end pt-4">
         <button (click)="saveConfig()" class="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
            <span class="material-symbols-outlined">save</span> Guardar Cambios
         </button>
      </div>

    </div>
  `
})
export class AdminConfigComponent {
  state = inject(StateService);
  adminService = inject(AdminService);
  tempConfig: SystemConfig;
  isSaving = false;

  constructor() {
    this.tempConfig = { ...this.adminService.config() };
  }

  async saveConfig() {
    if (this.isSaving) return;

    this.isSaving = true;
    try {
      await this.adminService.updateConfig(this.tempConfig);
      this.tempConfig = { ...this.adminService.config() };
      alert('Configuración guardada correctamente.');
    } catch {
      this.tempConfig = { ...this.adminService.config() };
      alert('No se pudo guardar la configuración. Se recargó el estado real desde backend.');
    } finally {
      this.isSaving = false;
    }
  }
}
