import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { NotificationService } from '../../../services/notification.service';
import { RewindReport } from '../models/reports.models';
import { ProductionService } from '../services/production.service';

@Component({
  selector: 'app-reports-rewind',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200 font-sans">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            <div class="p-2 bg-orange-600/20 rounded-xl border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
              <span class="material-icons text-orange-400 text-2xl">sync</span>
            </div>
            Reportes de Rebobinado
          </h1>
          <p class="text-sm text-slate-400 mt-1 ml-14 font-medium">Historial real de rebobinado, rollos terminados y control de calidad</p>
        </div>
        <div class="flex gap-3">
          <div class="relative group">
            <span class="material-icons absolute left-3 top-2.5 text-slate-500 group-focus-within:text-orange-400 transition-colors text-sm">search</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar OT, máquina u operador..."
              class="pl-9 pr-4 py-2.5 bg-[#1e293b]/80 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none w-72 transition-all placeholder-slate-500 shadow-inner backdrop-blur-sm"
            >
          </div>
          <button
            type="button"
            (click)="startNewReport()"
            [disabled]="!canCreateReport"
            class="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20 transition-all active:scale-95 border border-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="material-icons text-sm">add</span> Nuevo Reporte
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">inventory_2</span> Rollos Terminados
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalRolls | number }}</p>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">sell</span> Etiquetas Totales
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalLabels | number }}</p>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">straighten</span> Metros Procesados
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalMeters | number }} <span class="text-sm text-slate-500 font-medium">m</span></p>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">verified</span> Calidad Conforme
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.qualityApproved | number }}</p>
        </div>
      </div>

      <div class="glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#020617]/50 text-slate-400 font-bold border-b border-white/10 uppercase text-[10px] tracking-wider backdrop-blur-md">
              <tr>
                <th class="px-6 py-4">Fecha / Hora</th>
                <th class="px-6 py-4">OT</th>
                <th class="px-6 py-4">Cliente / Descripción</th>
                <th class="px-6 py-4">Máquina</th>
                <th class="px-6 py-4">Operador</th>
                <th class="px-6 py-4 text-right">Rollos</th>
                <th class="px-6 py-4 text-right">Etiquetas</th>
                <th class="px-6 py-4 text-center">Calidad</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-slate-300">
              <tr *ngFor="let report of filteredReports" class="hover:bg-white/5 transition-colors group cursor-pointer" (click)="openDetail(report)">
                <td class="px-6 py-4">
                  <div class="font-bold text-white">{{ report.date | date:'dd/MM/yyyy' }}</div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ report.date | date:'HH:mm' }} • {{ report.shift }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 font-mono">{{ report.ot }}</span>
                </td>
                <td class="px-6 py-4 max-w-xs">
                  <div class="font-bold text-slate-200 truncate">{{ report.client }}</div>
                  <div class="text-xs text-slate-500 truncate mt-0.5">{{ report.description }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="text-xs font-bold text-slate-300 border border-white/10 bg-white/5 px-2 py-1 rounded">{{ report.machine }}</span>
                </td>
                <td class="px-6 py-4 text-slate-400 font-medium text-xs">{{ report.operator }}</td>
                <td class="px-6 py-4 text-right font-mono font-bold text-white">{{ report.rolls | number }}</td>
                <td class="px-6 py-4 text-right font-mono font-bold text-blue-300">{{ report.totalLabels | number }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2 py-1 rounded text-[10px] font-bold uppercase border"
                    [ngClass]="report.qualityCheck ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'">
                    {{ report.qualityCheck ? 'OK' : 'PENDIENTE' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" title="Ver Detalle">
                    <span class="material-icons text-lg">visibility</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="isLoading">
                <td colspan="9" class="p-12 text-center text-slate-500 italic">
                  Cargando reportes de rebobinado...
                </td>
              </tr>
              <tr *ngIf="!isLoading && filteredReports.length === 0">
                <td colspan="9" class="p-12 text-center text-slate-500 italic">
                  No se encontraron reportes de rebobinado para la búsqueda actual.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="selectedReport" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div class="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#0f172a]">
          <div class="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-start shrink-0">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
                <span class="material-icons text-2xl">sync</span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-white flex items-center gap-3">
                  Reporte de Rebobinado
                  <span class="text-sm font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">#{{ selectedReport.id }}</span>
                </h2>
                <div class="flex items-center gap-3 mt-1 text-xs font-medium text-slate-400">
                  <span class="text-orange-400 font-bold">{{ selectedReport.ot }}</span>
                  <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span>{{ selectedReport.date | date:'fullDate' }}</span>
                  <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span>{{ selectedReport.shift }}</span>
                </div>
              </div>
            </div>
            <button (click)="closeDetail()" class="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span class="material-icons text-sm">inventory_2</span> Información del Producto
                </h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-[10px] text-slate-500 uppercase font-bold">Cliente</label>
                    <div class="text-white font-bold text-base">{{ selectedReport.client }}</div>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-500 uppercase font-bold">Descripción</label>
                    <div class="text-slate-300 text-sm">{{ selectedReport.description }}</div>
                  </div>
                  <div class="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label class="block text-[10px] text-slate-500 uppercase font-bold">Máquina</label>
                      <div class="text-orange-400 font-mono font-bold">{{ selectedReport.machine }}</div>
                    </div>
                    <div>
                      <label class="block text-[10px] text-slate-500 uppercase font-bold">Operador</label>
                      <div class="text-white text-sm">{{ selectedReport.operator }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span class="material-icons text-sm">analytics</span> Producción Registrada
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                    <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Rollos</label>
                    <div class="text-2xl font-black text-white">{{ selectedReport.rolls | number }}</div>
                  </div>
                  <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                    <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Etiquetas x Rollo</label>
                    <div class="text-2xl font-black text-blue-300">{{ selectedReport.labelsPerRoll | number }}</div>
                  </div>
                  <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                    <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Etiquetas Totales</label>
                    <div class="text-xl font-black text-white">{{ selectedReport.totalLabels | number }}</div>
                  </div>
                  <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                    <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Merma</label>
                    <div class="text-xl font-black text-red-400">{{ selectedReport.waste | number }}</div>
                  </div>
                  <div class="p-3 rounded-lg bg-black/20 border border-white/5 col-span-2 flex items-center justify-between">
                    <div>
                      <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Estado Producción</label>
                      <div class="text-white font-bold">{{ selectedReport.productionStatus }}</div>
                    </div>
                    <span class="px-3 py-1 rounded text-xs font-bold uppercase border"
                      [ngClass]="selectedReport.qualityCheck ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'">
                      {{ selectedReport.qualityCheck ? 'Calidad OK' : 'Calidad Pendiente' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-yellow-500/5 rounded-xl p-5 border border-yellow-500/20">
              <h3 class="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span class="material-icons text-sm">comment</span> Observaciones
              </h3>
              <p class="text-sm text-yellow-100/80 leading-relaxed italic">
                {{ selectedReport.observations || 'Sin observaciones registradas.' }}
              </p>
            </div>
          </div>

          <div class="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end gap-3 shrink-0">
            <button (click)="closeDetail()" class="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors text-sm">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glass-card {
      @apply bg-[#1e293b]/70 backdrop-blur-xl;
    }
    .bg-gradient-mesh {
      background-color: #0f172a;
      background-image:
        radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%),
        radial-gradient(at 50% 0%, hsla(24,75%,30%,0.35) 0, transparent 50%),
        radial-gradient(at 100% 0%, hsla(225,39%,30%,1) 0, transparent 50%);
    }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `],
})
export class ReportsRewindComponent implements OnInit {
  state = inject(StateService);
  router = inject(Router);
  notifications = inject(NotificationService);
  production = inject(ProductionService);
  destroyRef = inject(DestroyRef);
  cdr = inject(ChangeDetectorRef);

  reports: RewindReport[] = [];
  searchTerm = '';
  selectedReport: RewindReport | null = null;
  isLoading = true;

  ngOnInit() {
    this.production.rewindReports$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reports) => {
        this.reports = reports;
        queueMicrotask(() => this.cdr.detectChanges());
      });

    void this.loadReports();
  }

  get filteredReports() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.reports;

    return this.reports.filter((report) =>
      report.ot.toLowerCase().includes(term)
      || report.client.toLowerCase().includes(term)
      || report.machine.toLowerCase().includes(term)
      || report.operator.toLowerCase().includes(term),
    );
  }

  get kpis() {
    return {
      totalRolls: this.reports.reduce((acc, report) => acc + report.rolls, 0),
      totalLabels: this.reports.reduce((acc, report) => acc + report.totalLabels, 0),
      totalMeters: this.reports.reduce((acc, report) => acc + report.meters, 0),
      qualityApproved: this.reports.filter((report) => report.qualityCheck).length,
    };
  }

  get canCreateReport() {
    return this.state.hasPermission('operator.host') && this.state.canCreateProcessReport('rewind');
  }

  async openDetail(report: RewindReport) {
    try {
      this.selectedReport = await this.production.getRewindReport(report.id);
    } catch (error: any) {
      this.selectedReport = report;
      this.notifications.showError(error?.message || 'No fue posible cargar el detalle del reporte.');
    } finally {
      queueMicrotask(() => this.cdr.detectChanges());
    }
  }

  closeDetail() {
    this.selectedReport = null;
    queueMicrotask(() => this.cdr.detectChanges());
  }

  startNewReport() {
    if (!this.canCreateReport) {
      this.notifications.showWarning('Tu sesión no tiene permisos para registrar reportes de rebobinado.');
      return;
    }

    if (this.state.hasActiveOperator() && this.state.isProcessAllowedForActiveOperator('rewind')) {
      this.router.navigate(['/operator/select-machine', 'rewind']);
      return;
    }

    this.router.navigate(['/operator']);
  }

  private async loadReports() {
    try {
      this.isLoading = true;
      await this.production.reload();
    } catch {
      this.notifications.showError('No fue posible cargar los reportes de rebobinado.');
    } finally {
      this.isLoading = false;
    }
  }
}
