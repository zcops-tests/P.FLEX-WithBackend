import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { NotificationService } from '../../../services/notification.service';
import { OrdersService } from '../../orders/services/orders.service';
import { OT } from '../../orders/models/orders.models';
import { PackagingReport } from '../models/reports.models';
import { ProductionService } from '../services/production.service';

interface PackagingFormModel {
  id: string | null;
  date: string;
  ot: string;
  client: string;
  description: string;
  operator: string;
  shift: string;
  status: 'Completo' | 'Parcial';
  rolls: number | null;
  meters: number | null;
  demasiaRolls: number | null;
  demasiaMeters: number | null;
  notes: string;
  workOrderId: string | null;
}

@Component({
  selector: 'app-reports-packaging',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="!showForm" class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200 font-sans">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            <div class="p-2 bg-teal-600/20 rounded-xl border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.25)]">
              <span class="material-icons text-teal-400 text-2xl">inventory_2</span>
            </div>
            Reportes de Empaquetado
          </h1>
          <p class="text-sm text-slate-400 mt-1 ml-14 font-medium">Cierre real de lotes, rollos terminados y demasías recuperadas</p>
        </div>
        <div class="flex gap-3">
          <div class="relative group">
            <span class="material-icons absolute left-3 top-2.5 text-slate-500 group-focus-within:text-teal-400 transition-colors text-sm">search</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar OT, cliente u operador..."
              class="pl-9 pr-4 py-2.5 bg-[#1e293b]/80 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none w-72 transition-all placeholder-slate-500 shadow-inner backdrop-blur-sm"
            >
          </div>
          <button
            type="button"
            (click)="startNewReport()"
            [disabled]="!canCreateOperatorReport"
            class="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-900/20 transition-all active:scale-95 border border-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="material-icons text-sm">add</span> Nuevo Registro
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-teal-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">inventory</span> Rollos Empaquetados
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalRolls | number }}</p>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">straighten</span> Metros Totales
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalMeters | number }} <span class="text-sm text-slate-500 font-medium">m</span></p>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">add_circle</span> Demasía Recuperada
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalDemasiaRolls | number }} <span class="text-sm text-slate-500 font-medium">rollos</span></p>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-white/10">
          <p class="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="material-icons text-sm">timelapse</span> Lotes Parciales
          </p>
          <p class="text-3xl font-black text-white tracking-tight">{{ kpis.partialLots | number }}</p>
        </div>
      </div>

      <div class="glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#020617]/50 text-slate-400 font-bold border-b border-white/10 uppercase text-[10px] tracking-wider backdrop-blur-md">
              <tr>
                <th class="px-6 py-4">Fecha / Hora</th>
                <th class="px-6 py-4">OT</th>
                <th class="px-6 py-4">Cliente / Producto</th>
                <th class="px-6 py-4">Operador</th>
                <th class="px-6 py-4 text-center">Estado</th>
                <th class="px-6 py-4 text-right">Rollos</th>
                <th class="px-6 py-4 text-right">Metros</th>
                <th class="px-6 py-4 text-right">Demasía</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-slate-300">
              <tr *ngFor="let report of filteredReports" class="hover:bg-white/5 transition-colors group">
                <td class="px-6 py-4">
                  <div class="font-bold text-white">{{ report.date | date:'dd/MM/yyyy' }}</div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ report.date | date:'HH:mm' }} • {{ report.shift }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded border border-teal-500/20 font-mono">{{ report.ot }}</span>
                </td>
                <td class="px-6 py-4 max-w-xs">
                  <div class="font-bold text-slate-200 truncate">{{ report.client }}</div>
                  <div class="text-xs text-slate-500 truncate mt-0.5">{{ report.description }}</div>
                </td>
                <td class="px-6 py-4 text-slate-400 font-medium text-xs">{{ report.operator }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2 py-1 rounded text-[10px] font-bold uppercase border"
                    [ngClass]="report.status === 'Completo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'">
                    {{ report.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-white">{{ report.rolls | number }}</td>
                <td class="px-6 py-4 text-right font-mono font-bold text-blue-300">{{ report.meters | number }}</td>
                <td class="px-6 py-4 text-right font-mono font-bold text-purple-300">
                  {{ report.demasiaRolls ? (report.demasiaRolls | number) : '-' }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    type="button"
                    (click)="openForEdit(report)"
                    [disabled]="!canEditReports"
                    class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Editar Reporte"
                  >
                    <span class="material-icons text-lg">edit</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredReports.length === 0">
                <td colspan="9" class="p-12 text-center text-slate-500 italic">
                  No se encontraron reportes de empaquetado para la búsqueda actual.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div *ngIf="showForm" class="fixed inset-0 z-[60] bg-[#0f172a] text-slate-200 font-sans overflow-y-auto animate-fadeIn">
      <header class="sticky top-0 z-10 bg-[#111827]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between gap-4">
        <div class="flex items-center gap-4">
          <button (click)="closeForm()" class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors">
            <span class="material-icons text-slate-300">arrow_back</span>
          </button>
          <div>
            <h2 class="text-xl font-bold text-white">Reporte de Empaquetado</h2>
            <p class="text-xs uppercase tracking-widest text-slate-400">
              {{ isOperatorMode ? 'Modo operador' : (currentReport.id ? 'Edición de supervisión' : 'Nuevo registro') }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-400">
          <span class="px-3 py-1 rounded-full border border-white/10 bg-white/5">{{ currentReport.shift || (state.currentShift() || 'Turno') }}</span>
          <span class="px-3 py-1 rounded-full border border-white/10 bg-white/5">{{ currentReport.operator || state.userName() }}</span>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6 space-y-6">
        <section class="glass-card rounded-2xl border border-white/10 p-6">
          <h3 class="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="material-icons text-sm">assignment</span> Datos Maestros
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Fecha</label>
              <input type="date" [(ngModel)]="currentReport.date" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Operador</label>
              <input
                type="text"
                [(ngModel)]="currentReport.operator"
                [readonly]="isOperatorMode"
                class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 read-only:opacity-80"
              >
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Turno</label>
              <select [(ngModel)]="currentReport.shift" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                <option *ngFor="let shift of shiftOptions" [ngValue]="shift">{{ shift }}</option>
              </select>
            </div>
            <div class="lg:col-span-2 relative">
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Orden de Trabajo</label>
              <input
                type="text"
                [(ngModel)]="currentReport.ot"
                (input)="searchOt($event)"
                (focus)="searchOt($event)"
                (blur)="hideSuggestions()"
                class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono uppercase"
                placeholder="Buscar OT..."
              >
              <div *ngIf="showOtSuggestions && otSuggestions.length > 0" class="absolute left-0 right-0 mt-2 rounded-xl bg-[#111827] border border-white/10 shadow-2xl overflow-hidden z-20">
                <button
                  type="button"
                  *ngFor="let suggestion of otSuggestions"
                  (mousedown)="selectOt(suggestion)"
                  class="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 last:border-b-0"
                >
                  <div class="font-bold text-teal-300 font-mono">{{ suggestion.OT }}</div>
                  <div class="text-xs text-slate-300 truncate">{{ suggestion['Razon Social'] }}</div>
                  <div class="text-[10px] text-slate-500 truncate">{{ suggestion.descripcion }}</div>
                </button>
              </div>
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Estado del Lote</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="currentReport.status = 'Completo'"
                  class="rounded-xl border px-4 py-3 text-sm font-bold transition-all"
                  [ngClass]="currentReport.status === 'Completo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-[#0b1220] text-slate-400 border-white/10'"
                >
                  Completo
                </button>
                <button
                  type="button"
                  (click)="currentReport.status = 'Parcial'"
                  class="rounded-xl border px-4 py-3 text-sm font-bold transition-all"
                  [ngClass]="currentReport.status === 'Parcial' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-[#0b1220] text-slate-400 border-white/10'"
                >
                  Parcial
                </button>
              </div>
            </div>
            <div class="lg:col-span-3">
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Cliente</label>
              <input type="text" [(ngModel)]="currentReport.client" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
            </div>
            <div class="lg:col-span-3">
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Descripción</label>
              <input type="text" [(ngModel)]="currentReport.description" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
            </div>
          </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section class="glass-card rounded-2xl border border-white/10 p-6 lg:col-span-2">
            <h3 class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span class="material-icons text-sm">inventory</span> Producción Empaquetada
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Cantidad de Rollos</label>
                <input type="number" [(ngModel)]="currentReport.rolls" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-4 text-2xl font-mono text-white outline-none text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Metros Totales</label>
                <input type="number" [(ngModel)]="currentReport.meters" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-4 text-2xl font-mono text-white outline-none text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              </div>
            </div>
          </section>

          <section class="glass-card rounded-2xl border border-white/10 p-6">
            <h3 class="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span class="material-icons text-sm">add_circle</span> Demasía
            </h3>
            <div class="space-y-5">
              <div>
                <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Rollos</label>
                <input type="number" [(ngModel)]="currentReport.demasiaRolls" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-4 text-xl font-mono text-white outline-none text-right focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Metros</label>
                <input type="number" [(ngModel)]="currentReport.demasiaMeters" class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-4 text-xl font-mono text-white outline-none text-right focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
              </div>
            </div>
          </section>
        </div>

        <section class="glass-card rounded-2xl border border-white/10 p-6">
          <label class="block text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">Observaciones</label>
          <textarea
            [(ngModel)]="currentReport.notes"
            rows="4"
            class="w-full rounded-xl bg-[#0b1220] border border-white/10 px-4 py-4 text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
            placeholder="Notas relevantes del cierre, demasías o incidencias."
          ></textarea>
        </section>

        <div class="flex flex-col md:flex-row justify-end gap-4 pb-8">
          <button (click)="closeForm()" class="px-6 py-3 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button
            (click)="saveReport()"
            [disabled]="isSaving"
            class="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all border border-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span class="material-icons text-sm">save</span>
            {{ isSaving ? 'Guardando...' : 'Guardar Reporte' }}
          </button>
        </div>
      </main>
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
        radial-gradient(at 50% 0%, hsla(172,70%,24%,0.35) 0, transparent 50%),
        radial-gradient(at 100% 0%, hsla(225,39%,30%,1) 0, transparent 50%);
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `],
})
export class ReportsPackagingComponent implements OnInit {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  router = inject(Router);
  notifications = inject(NotificationService);
  production = inject(ProductionService);
  destroyRef = inject(DestroyRef);
  cdr = inject(ChangeDetectorRef);

  reports: PackagingReport[] = [];
  searchTerm = '';
  showForm = false;
  isOperatorMode = false;
  isSaving = false;
  currentReport: PackagingFormModel = this.buildEmptyReport();
  otSuggestions: Partial<OT>[] = [];
  showOtSuggestions = false;

  ngOnInit() {
    this.isOperatorMode = this.router.url.includes('/operator/packaging');

    this.production.packagingReports$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reports) => {
        this.reports = reports;
        queueMicrotask(() => this.cdr.detectChanges());
      });

    void this.loadReports();

    if (this.isOperatorMode) {
      if (!this.canEnterOperatorMode()) return;
      this.prepareOperatorReport();
    }
  }

  get filteredReports() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.reports;

    return this.reports.filter((report) =>
      report.ot.toLowerCase().includes(term)
      || report.client.toLowerCase().includes(term)
      || report.operator.toLowerCase().includes(term)
      || report.description.toLowerCase().includes(term),
    );
  }

  get kpis() {
    return {
      totalRolls: this.reports.reduce((acc, report) => acc + report.rolls, 0),
      totalMeters: this.reports.reduce((acc, report) => acc + report.meters, 0),
      totalDemasiaRolls: this.reports.reduce((acc, report) => acc + report.demasiaRolls, 0),
      partialLots: this.reports.filter((report) => report.status === 'Parcial').length,
    };
  }

  get canCreateOperatorReport() {
    return this.state.hasPermission('operator.host') && this.state.canCreateProcessReport('packaging');
  }

  get canEditReports() {
    return this.state.hasPermission('reports.packaging.create');
  }

  get shiftOptions() {
    const shifts = this.state.plantShifts().map((shift) => shift.name).filter(Boolean);
    if (shifts.length) return shifts;
    return ['Turno Dia', 'Turno Noche'];
  }

  startNewReport() {
    if (!this.canCreateOperatorReport) {
      this.notifications.showWarning('Tu sesión no tiene permisos para registrar reportes de empaquetado.');
      return;
    }

    if (this.state.hasActiveOperator() && this.state.isProcessAllowedForActiveOperator('packaging')) {
      this.router.navigate(['/operator/packaging']);
      return;
    }

    this.router.navigate(['/operator']);
  }

  async openForEdit(report: PackagingReport) {
    if (!this.canEditReports) {
      this.notifications.showWarning('Tu sesión no tiene permisos para editar reportes de empaquetado.');
      return;
    }

    try {
      const detail = await this.production.getPackagingReport(report.id);
      this.currentReport = this.mapReportToForm(detail);
      this.showForm = true;
      queueMicrotask(() => this.cdr.detectChanges());
    } catch (error: any) {
      this.notifications.showError(error?.message || 'No fue posible cargar el reporte seleccionado.');
    }
  }

  searchOt(event: Event) {
    const query = String((event.target as HTMLInputElement | null)?.value || this.currentReport.ot || '').toLowerCase().trim();
    this.showOtSuggestions = true;

    if (!query) {
      this.otSuggestions = this.ordersService.ots.slice(0, 6);
      return;
    }

    this.otSuggestions = this.ordersService.ots.filter((ot) =>
      String(ot.OT || '').toLowerCase().includes(query)
      || String(ot['Razon Social'] || '').toLowerCase().includes(query),
    ).slice(0, 8);
  }

  selectOt(ot: Partial<OT>) {
    this.currentReport.ot = String(ot.OT || '');
    this.currentReport.client = String(ot['Razon Social'] || '');
    this.currentReport.description = String(ot.descripcion || '');
    this.currentReport.workOrderId = ot.id ? String(ot.id) : null;
    this.showOtSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => {
      this.showOtSuggestions = false;
    }, 150);
  }

  closeForm() {
    if (this.isOperatorMode) {
      this.router.navigate(['/operator']);
      return;
    }

    this.showForm = false;
    this.currentReport = this.buildEmptyReport();
    queueMicrotask(() => this.cdr.detectChanges());
  }

  async saveReport() {
    if (this.isSaving) return;

    if (this.toInteger(this.currentReport.rolls) <= 0) {
      this.notifications.showWarning('Ingresa la cantidad de rollos antes de guardar el reporte.');
      return;
    }

    if (!String(this.currentReport.ot || '').trim()) {
      this.notifications.showWarning('Selecciona o ingresa una OT antes de guardar el reporte.');
      return;
    }

    try {
      this.isSaving = true;
      const workOrderId = await this.resolveSelectedWorkOrderId();
      const shiftId = this.resolveShiftId(this.currentReport.shift);
      const payload = {
        reported_at: this.toReportedAt(this.currentReport.date),
        work_order_id: workOrderId || undefined,
        shift_id: shiftId || undefined,
        shift_name: this.normalizeOptionalText(this.currentReport.shift),
        lot_status: this.currentReport.status === 'Parcial' ? 'PARTIAL' : 'COMPLETE',
        rolls: this.toInteger(this.currentReport.rolls),
        total_meters: this.toNumber(this.currentReport.meters),
        demasia_rolls: this.toInteger(this.currentReport.demasiaRolls),
        demasia_meters: this.toNumber(this.currentReport.demasiaMeters),
        notes: this.normalizeOptionalText(this.currentReport.notes),
      };

      if (this.isOperatorMode) {
        const activeOperator = this.state.activeOperator();
        if (!activeOperator) {
          this.notifications.showWarning('Identifica primero al operario antes de registrar empaquetado.');
          this.router.navigate(['/operator']);
          return;
        }

        await this.production.createPackagingReport({
          ...payload,
          operator_id: activeOperator.id,
          operator_name: activeOperator.name,
        });

        this.notifications.showSuccess('Reporte de empaquetado guardado correctamente.');
        this.router.navigate(['/operator']);
        return;
      }

      if (!this.currentReport.id) {
        this.notifications.showWarning('Los nuevos reportes de empaquetado se registran desde el panel del operador.');
        this.showForm = false;
        return;
      }

      await this.production.updatePackagingReport(this.currentReport.id, {
        ...payload,
        operator_name: this.normalizeOptionalText(this.currentReport.operator),
      });

      this.notifications.showSuccess('Reporte de empaquetado actualizado correctamente.');
      this.showForm = false;
      this.currentReport = this.buildEmptyReport();
      queueMicrotask(() => this.cdr.detectChanges());
    } catch (error: any) {
      this.notifications.showError(error?.message || 'No fue posible guardar el reporte de empaquetado.');
    } finally {
      this.isSaving = false;
    }
  }

  private prepareOperatorReport() {
    const activeOperator = this.state.activeOperator();
    const suggestedOt = this.ordersService.ots.find((item) =>
      ['EN PROCESO', 'PENDIENTE'].includes(String(item.Estado_pedido || '').toUpperCase()),
    ) || null;

    this.currentReport = {
      id: null,
      date: new Date().toISOString().slice(0, 10),
      ot: String(suggestedOt?.OT || ''),
      client: String(suggestedOt?.['Razon Social'] || ''),
      description: String(suggestedOt?.descripcion || ''),
      operator: activeOperator?.name || this.state.activeOperatorName(),
      shift: this.state.currentShift() || this.shiftOptions[0],
      status: 'Completo',
      rolls: null,
      meters: null,
      demasiaRolls: null,
      demasiaMeters: null,
      notes: '',
      workOrderId: suggestedOt?.id ? String(suggestedOt.id) : null,
    };
    this.showForm = true;
    queueMicrotask(() => this.cdr.detectChanges());
  }

  private canEnterOperatorMode() {
    if (!this.canCreateOperatorReport) {
      this.notifications.showError('La sesión anfitriona no tiene permiso para registrar empaquetado.');
      this.router.navigate(['/operator']);
      return false;
    }

    if (!this.state.hasActiveOperator() || !this.state.isProcessAllowedForActiveOperator('packaging')) {
      this.notifications.showWarning('Debes identificar un operario autorizado para empaquetado antes de continuar.');
      this.router.navigate(['/operator']);
      return false;
    }

    return true;
  }

  private async loadReports() {
    try {
      await this.production.reload();
    } catch {
      this.notifications.showError('No fue posible cargar los reportes de empaquetado.');
    }
  }

  private mapReportToForm(report: PackagingReport): PackagingFormModel {
    return {
      id: report.id,
      date: report.date.toISOString().slice(0, 10),
      ot: report.ot,
      client: report.client,
      description: report.description,
      operator: report.operator,
      shift: report.shift || this.shiftOptions[0],
      status: report.status,
      rolls: report.rolls,
      meters: report.meters,
      demasiaRolls: report.demasiaRolls,
      demasiaMeters: report.demasiaMeters,
      notes: report.notes || '',
      workOrderId: report.workOrderId || null,
    };
  }

  private buildEmptyReport(): PackagingFormModel {
    return {
      id: null,
      date: new Date().toISOString().slice(0, 10),
      ot: '',
      client: '',
      description: '',
      operator: this.state.userName(),
      shift: this.state.currentShift() || 'Turno Dia',
      status: 'Completo',
      rolls: null,
      meters: null,
      demasiaRolls: null,
      demasiaMeters: null,
      notes: '',
      workOrderId: null,
    };
  }

  private async resolveSelectedWorkOrderId() {
    if (this.currentReport.workOrderId) {
      return this.currentReport.workOrderId;
    }

    const resolved = await this.ordersService.findWorkOrderByOtNumber(this.currentReport.ot);
    return resolved?.id ? String(resolved.id) : undefined;
  }

  private resolveShiftId(shiftName: string) {
    const normalized = this.normalizeToken(shiftName);
    if (!normalized) return undefined;

    return this.state.plantShifts().find((shift) => {
      const name = this.normalizeToken(shift.name);
      const code = this.normalizeToken(shift.code);
      return name === normalized || code === normalized || name.includes(normalized) || normalized.includes(name);
    })?.id;
  }

  private toReportedAt(dateInput: string) {
    const [year, month, day] = String(dateInput || '').split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      return new Date().toISOString();
    }
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
  }

  private toInteger(value: unknown) {
    return Math.max(0, Math.trunc(this.toNumber(value)));
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const parsed = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeOptionalText(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private normalizeToken(value: unknown) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }
}
