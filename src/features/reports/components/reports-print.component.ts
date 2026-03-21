
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { OrdersService } from '../../orders/services/orders.service';
import { OT } from '../../orders/models/orders.models';

import { PrintActivity, PrintReport } from '../models/reports.models';

@Component({
  selector: 'app-reports-print',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200 font-sans">
      
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            <div class="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <span class="material-icons text-blue-400 text-2xl">print</span>
            </div>
            Reportes de Impresión
          </h1>
          <p class="text-sm text-slate-400 mt-1 ml-14 font-medium">Historial de corridas, tiempos y estado de herramental</p>
        </div>
        <div class="flex gap-3">
           <div class="relative group">
              <span class="material-icons absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400 transition-colors text-sm">search</span>
              <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar OT, Máquina, Operador..." 
                class="pl-9 pr-4 py-2.5 bg-[#1e293b]/80 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none w-64 transition-all placeholder-slate-500 shadow-inner backdrop-blur-sm">
           </div>
           <button class="bg-[#1e293b]/80 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/10 text-slate-300 transition-all backdrop-blur-sm">
              <span class="material-icons text-sm">filter_list</span> Filtros
           </button>
           <button class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 border border-blue-500/50">
              <span class="material-icons text-sm">add</span> Nuevo Reporte
           </button>
        </div>
      </div>

      <!-- KPI CARDS (Real Calculated Data) -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">straighten</span> Total Metros (Mes)
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalMeters | number }} <span class="text-sm text-slate-500 font-medium">m</span></p>
                <div class="mt-2 text-xs text-slate-400 font-medium">+12% vs mes anterior</div>
            </div>
         </div>

         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">speed</span> Velocidad Prom.
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.avgSpeed | number:'1.0-0' }} <span class="text-sm text-slate-500 font-medium">m/min</span></p>
                <div class="w-full bg-slate-700/50 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" style="width: 85%"></div>
                </div>
            </div>
         </div>

         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">assignment_turned_in</span> OTs Completadas
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.completedOts }} <span class="text-sm text-slate-500 font-medium">órdenes</span></p>
                <div class="mt-2 flex -space-x-2">
                    <div class="w-6 h-6 rounded-full bg-slate-700 border border-[#0f172a]"></div>
                    <div class="w-6 h-6 rounded-full bg-slate-600 border border-[#0f172a]"></div>
                    <div class="w-6 h-6 rounded-full bg-slate-500 border border-[#0f172a] flex items-center justify-center text-[8px] font-bold">+</div>
                </div>
            </div>
         </div>

         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">warning</span> Alertas Herramental
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.toolingIssues }} <span class="text-sm text-slate-500 font-medium">casos</span></p>
                <p class="text-xs text-red-400/80 mt-1 font-medium bg-red-500/10 inline-block px-2 py-0.5 rounded border border-red-500/20">Requiere Atención</p>
            </div>
         </div>
      </div>

      <!-- TABLE -->
      <div class="glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#020617]/50 text-slate-400 font-bold border-b border-white/10 uppercase text-[10px] tracking-wider backdrop-blur-md">
              <tr>
                <th class="px-6 py-4">Fecha / Hora</th>
                <th class="px-6 py-4">OT</th>
                <th class="px-6 py-4">Cliente / Producto</th>
                <th class="px-6 py-4">Máquina</th>
                <th class="px-6 py-4">Operador</th>
                <th class="px-6 py-4 text-right">Metros</th>
                <th class="px-6 py-4 text-center">Estado</th>
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
                    <span class="font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 font-mono">{{ report.ot }}</span>
                  </td>
                  <td class="px-6 py-4 max-w-xs">
                    <div class="font-bold text-slate-200 truncate">{{ report.client }}</div>
                    <div class="text-xs text-slate-500 truncate mt-0.5">{{ report.product }}</div>
                  </td>
                  <td class="px-6 py-4">
                     <span class="text-xs font-bold text-slate-300 border border-white/10 bg-white/5 px-2 py-1 rounded">{{ report.machine }}</span>
                  </td>
                  <td class="px-6 py-4 text-slate-400 font-medium text-xs">
                     <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">{{ getInitials(report.operator) }}</div>
                        {{ report.operator }}
                     </div>
                  </td>
                  <td class="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-base">
                     {{ report.totalMeters | number }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase border"
                      [ngClass]="{
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': report.productionStatus === 'TOTAL',
                        'bg-amber-500/10 text-amber-400 border-amber-500/20': report.productionStatus === 'PARCIAL'
                      }">
                      {{ report.productionStatus }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" title="Ver Detalle">
                        <span class="material-icons text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="filteredReports.length === 0">
                   <td colspan="8" class="p-12 text-center text-slate-500 italic">
                      No se encontraron reportes que coincidan con la búsqueda.
                   </td>
                </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- DETAIL MODAL -->
      <div *ngIf="selectedReport" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div class="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#0f172a]">
              
              <!-- Modal Header -->
              <div class="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-start shrink-0">
                  <div class="flex items-center gap-4">
                      <div class="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          <span class="material-icons text-2xl">description</span>
                      </div>
                      <div>
                          <h2 class="text-xl font-bold text-white flex items-center gap-3">
                              Reporte de Producción
                              <span class="text-sm font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">#{{ selectedReport.id }}</span>
                          </h2>
                          <div class="flex items-center gap-3 mt-1 text-xs font-medium text-slate-400">
                              <span class="text-blue-400 font-bold">{{ selectedReport.ot }}</span>
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

              <!-- Modal Body -->
              <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  
                  <!-- Info Cards -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <!-- Product Info -->
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
                                  <div class="text-slate-300 text-sm">{{ selectedReport.product }}</div>
                              </div>
                              <div class="grid grid-cols-2 gap-4 pt-2">
                                  <div>
                                      <label class="block text-[10px] text-slate-500 uppercase font-bold">Máquina</label>
                                      <div class="text-blue-400 font-mono font-bold">{{ selectedReport.machine }}</div>
                                  </div>
                                  <div>
                                      <label class="block text-[10px] text-slate-500 uppercase font-bold">Operador</label>
                                      <div class="text-white text-sm">{{ selectedReport.operator }}</div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Tooling Status -->
                      <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span class="material-icons text-sm">build</span> Estado de Herramental
                          </h3>
                          <div class="grid grid-cols-2 gap-4 h-full content-start">
                              <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                                  <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Cliché (Item)</label>
                                  <div class="text-white font-mono font-bold text-sm mb-1">{{ selectedReport.clise.code || 'N/A' }}</div>
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase"
                                      [ngClass]="getStatusClass(selectedReport.clise.status)">
                                      {{ selectedReport.clise.status }}
                                  </span>
                              </div>
                              <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                                  <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Troquel</label>
                                  <div class="text-white font-mono font-bold text-sm mb-1">ASIGNADO</div>
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase"
                                      [ngClass]="getStatusClass(selectedReport.die.status)">
                                      {{ selectedReport.die.status }}
                                  </span>
                              </div>
                              <div class="col-span-2 pt-2">
                                  <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Total Producido</label>
                                  <div class="text-3xl font-black text-emerald-400">{{ selectedReport.totalMeters | number }} <span class="text-sm text-slate-500 font-medium">metros</span></div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Activities Table -->
                  <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <div class="px-5 py-3 border-b border-white/10 bg-black/20">
                          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest">Desglose de Actividades</h3>
                      </div>
                      <table class="w-full text-sm text-left">
                          <thead class="bg-white/5 text-slate-400 font-bold border-b border-white/10 text-[10px] uppercase">
                              <tr>
                                  <th class="px-5 py-3">Actividad</th>
                                  <th class="px-5 py-3 text-center">Horario</th>
                                  <th class="px-5 py-3 text-center">Duración</th>
                                  <th class="px-5 py-3 text-right">Metros</th>
                              </tr>
                          </thead>
                          <tbody class="divide-y divide-white/5 text-slate-300">
                              <tr *ngFor="let act of selectedReport.activities" class="hover:bg-white/5">
                                  <td class="px-5 py-3 font-medium text-white">
                                      <div class="flex items-center gap-2">
                                          <div class="w-1.5 h-1.5 rounded-full" [ngClass]="act.meters > 0 ? 'bg-emerald-500' : 'bg-slate-500'"></div>
                                          {{ act.type }}
                                      </div>
                                  </td>
                                  <td class="px-5 py-3 text-center font-mono text-xs">{{ act.startTime }} - {{ act.endTime }}</td>
                                  <td class="px-5 py-3 text-center font-mono text-xs text-slate-500">{{ calculateDuration(act.startTime, act.endTime) }}</td>
                                  <td class="px-5 py-3 text-right font-mono font-bold" [class.text-emerald-400]="act.meters > 0">
                                      {{ act.meters > 0 ? (act.meters | number) : '-' }}
                                  </td>
                              </tr>
                          </tbody>
                          <tfoot class="bg-white/5 border-t border-white/10 font-bold">
                              <tr>
                                  <td colspan="3" class="px-5 py-3 text-right text-xs uppercase tracking-widest text-slate-400">Total Producción</td>
                                  <td class="px-5 py-3 text-right text-white font-mono">{{ selectedReport.totalMeters | number }}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>

                  <!-- Observations -->
                  <div class="bg-yellow-500/5 rounded-xl p-5 border border-yellow-500/20">
                      <h3 class="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span class="material-icons text-sm">comment</span> Observaciones Generales
                      </h3>
                      <p class="text-sm text-yellow-100/80 leading-relaxed italic">
                          {{ selectedReport.observations || 'Sin observaciones registradas.' }}
                      </p>
                  </div>

              </div>

              <!-- Modal Footer -->
              <div class="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end gap-3 shrink-0">
                  <button (click)="closeDetail()" class="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors text-sm">
                      Cerrar
                  </button>
                  <button class="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg transition-all text-sm flex items-center gap-2">
                      <span class="material-icons text-sm">print</span> Imprimir PDF
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
            radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
    }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `]
})
export class ReportsPrintComponent implements OnInit {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  
  reports: PrintReport[] = [];
  searchTerm = '';
  selectedReport: PrintReport | null = null;

  ngOnInit() {
    this.generateReports();
  }

  generateReports() {
    const ots = this.ordersService.ots.slice(0, 20); // Take recent OTs
    const machines = this.state.adminMachines().filter(m => m.type === 'Impresión');
    const operators = ['Juan Martinez', 'Carlos Ruiz', 'Miguel Torres', 'Ana Lopez'];
    
    this.reports = ots.map((ot, index) => {
      const isComplete = index % 3 !== 0;
      const totalMeters = Math.floor(Math.random() * 15000) + 2000;
      
      // Simulate Activities
      const activities: PrintActivity[] = [
          { type: 'Setup', startTime: '07:00', endTime: '08:30', meters: 0 },
          { type: 'Impresión', startTime: '08:30', endTime: '11:00', meters: Math.floor(totalMeters * 0.4) },
          { type: 'Parada - Cambio Bobina', startTime: '11:00', endTime: '11:15', meters: 0 },
          { type: 'Impresión', startTime: '11:15', endTime: '13:00', meters: Math.floor(totalMeters * 0.6) },
      ];

      const date = new Date();
      date.setDate(date.getDate() - (index % 7));
      date.setHours(7 + (index % 10), 0);

      // Status logic
      const dieStatus = index % 5 === 0 ? 'Desgaste' : (index % 15 === 0 ? 'Dañado' : 'OK');
      const cliseStatus = index % 7 === 0 ? 'Desgaste' : 'OK';

      return {
        id: `REP-${1000 + index}`,
        date: date,
        ot: ot.OT,
        client: ot['Razon Social'],
        product: ot.descripcion || ot.impresion || 'Etiqueta Genérica',
        machine: machines[index % machines.length]?.name || 'Máquina 1',
        operator: operators[index % operators.length],
        shift: index % 2 === 0 ? 'Día - A' : 'Noche - B',
        activities: activities,
        totalMeters: totalMeters,
        clise: { code: `CL-${ot.OT}-01`, status: cliseStatus },
        die: { status: dieStatus },
        observations: index % 4 === 0 ? 'Leve variación de tono en la segunda bobina. Ajuste de presión realizado.' : '',
        productionStatus: isComplete ? 'TOTAL' : 'PARCIAL'
      };
    });
  }

  get filteredReports() {
      const term = this.searchTerm.toLowerCase();
      return this.reports.filter(r => 
          r.ot.toLowerCase().includes(term) ||
          r.machine.toLowerCase().includes(term) ||
          r.operator.toLowerCase().includes(term) ||
          r.client.toLowerCase().includes(term)
      );
  }

  get kpis() {
      const totalMeters = this.reports.reduce((acc, r) => acc + r.totalMeters, 0);
      const totalHours = this.reports.length * 6; // Mock avg hours per report
      const avgSpeed = totalHours > 0 ? (totalMeters / (totalHours * 60)) : 0; // m/min approx
      
      return {
          totalMeters,
          avgSpeed: avgSpeed * 5, // Scaling for realistic m/min
          completedOts: this.reports.filter(r => r.productionStatus === 'TOTAL').length,
          toolingIssues: this.reports.filter(r => r.die.status !== 'OK' || r.clise.status !== 'OK').length
      };
  }

  openDetail(report: PrintReport) {
      this.selectedReport = report;
  }

  closeDetail() {
      this.selectedReport = null;
  }

  getInitials(name: string) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getStatusClass(status: string) {
      switch(status) {
          case 'OK': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          case 'Desgaste': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
          case 'Dañado': return 'bg-red-500/10 text-red-400 border-red-500/20';
          default: return 'bg-slate-500/10 text-slate-400';
      }
  }

  calculateDuration(start: string, end: string): string {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60;
      
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      return `${hours}h ${mins}m`;
  }
}
