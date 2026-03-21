
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';

interface DiecutActivity {
  type: string;
  startTime: string;
  endTime: string;
  qty: number;
}

interface DiecutReport {
  id: string;
  date: Date;
  ot: string;
  client: string;
  product: string;
  machine: string;
  operator: string;
  shift: string;
  dieSeries: string;
  frequency?: string;
  goodUnits: number;
  waste: number;
  dieStatus: 'OK' | 'Desgaste' | 'Dañado';
  activities: DiecutActivity[];
  productionStatus: 'PARCIAL' | 'TOTAL';
  observations: string;
}

@Component({
  selector: 'app-production-diecut',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200 font-sans">
      
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            <div class="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <span class="material-icons text-purple-400 text-2xl">content_cut</span>
            </div>
            Reportes de Troquelado
          </h1>
          <p class="text-sm text-slate-400 mt-1 ml-14 font-medium">Control de corte, conversión y estado de troqueles</p>
        </div>
        <div class="flex gap-3">
           <div class="relative group">
              <span class="material-icons absolute left-3 top-2.5 text-slate-500 group-focus-within:text-purple-400 transition-colors text-sm">search</span>
              <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar OT, Troquel..." 
                class="pl-9 pr-4 py-2.5 bg-[#1e293b]/80 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none w-64 transition-all placeholder-slate-500 shadow-inner backdrop-blur-sm">
           </div>
           <button class="bg-[#1e293b]/80 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/10 text-slate-300 transition-all backdrop-blur-sm">
              <span class="material-icons text-sm">filter_list</span> Filtros
           </button>
           <button class="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20 transition-all active:scale-95 border border-purple-500/50">
              <span class="material-icons text-sm">add</span> Nuevo Reporte
           </button>
        </div>
      </div>

      <!-- KPI CARDS -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <!-- Total Units -->
         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">inventory_2</span> Unidades Prod.
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalUnits | number }} <span class="text-sm text-slate-500 font-medium">und</span></p>
                <div class="mt-2 text-xs text-slate-400 font-medium">+8% vs semana anterior</div>
            </div>
         </div>

         <!-- Waste Rate -->
         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">delete</span> Tasa Mermas
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.wasteRate | number:'1.1-1' }}% <span class="text-sm text-slate-500 font-medium">avg</span></p>
                <div class="w-full bg-slate-700/50 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div class="bg-red-500 h-full rounded-full" [style.width.%]="kpis.wasteRate * 10"></div>
                </div>
            </div>
         </div>

         <!-- Machine Availability (Mock) -->
         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">timer</span> Hrs Operativas
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.totalHours | number }} <span class="text-sm text-slate-500 font-medium">hrs</span></p>
                <div class="mt-2 flex -space-x-2">
                    <div class="w-6 h-6 rounded-full bg-slate-700 border border-[#0f172a]"></div>
                    <div class="w-6 h-6 rounded-full bg-slate-600 border border-[#0f172a]"></div>
                    <div class="w-6 h-6 rounded-full bg-slate-500 border border-[#0f172a] flex items-center justify-center text-[8px] font-bold">+</div>
                </div>
            </div>
         </div>

         <!-- Tooling Status -->
         <div class="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div class="relative z-10">
                <p class="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span class="material-icons text-sm">build</span> Desgaste Herramental
                </p>
                <p class="text-3xl font-black text-white tracking-tight">{{ kpis.toolingIssues }} <span class="text-sm text-slate-500 font-medium">casos</span></p>
                <p class="text-xs text-yellow-400/80 mt-1 font-medium bg-yellow-500/10 inline-block px-2 py-0.5 rounded border border-yellow-500/20">Mantenimiento Sugerido</p>
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
                <th class="px-6 py-4">Troquel (Serie)</th>
                <th class="px-6 py-4 text-right">Unid. Buenas</th>
                <th class="px-6 py-4 text-right">Mermas</th>
                <th class="px-6 py-4 text-center">Estado Herramental</th>
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
                    <span class="font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 font-mono">{{ report.ot }}</span>
                  </td>
                  <td class="px-6 py-4 max-w-xs">
                    <div class="font-bold text-slate-200 truncate">{{ report.client }}</div>
                    <div class="text-xs text-slate-500 truncate mt-0.5">{{ report.product }}</div>
                  </td>
                  <td class="px-6 py-4">
                     <span class="text-xs font-bold text-slate-300 border border-white/10 bg-white/5 px-2 py-1 rounded">{{ report.machine }}</span>
                  </td>
                  <td class="px-6 py-4 text-xs font-mono text-purple-300 font-bold">
                     {{ report.dieSeries }}
                  </td>
                  <td class="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-base">
                     {{ report.goodUnits | number }}
                  </td>
                  <td class="px-6 py-4 text-right font-mono font-bold text-red-400 text-base">
                     {{ report.waste | number }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase border"
                      [ngClass]="getStatusClass(report.dieStatus)">
                      {{ report.dieStatus }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" title="Ver Detalle">
                        <span class="material-icons text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="filteredReports.length === 0">
                   <td colspan="9" class="p-12 text-center text-slate-500 italic">
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
                      <div class="p-3 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                          <span class="material-icons text-2xl">content_cut</span>
                      </div>
                      <div>
                          <h2 class="text-xl font-bold text-white flex items-center gap-3">
                              Reporte de Troquelado
                              <span class="text-sm font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">#{{ selectedReport.id }}</span>
                          </h2>
                          <div class="flex items-center gap-3 mt-1 text-xs font-medium text-slate-400">
                              <span class="text-purple-400 font-bold">{{ selectedReport.ot }}</span>
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
                                      <div class="text-purple-400 font-mono font-bold">{{ selectedReport.machine }}</div>
                                  </div>
                                  <div>
                                      <label class="block text-[10px] text-slate-500 uppercase font-bold">Operador</label>
                                      <div class="text-white text-sm">{{ selectedReport.operator }}</div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Production Metrics -->
                      <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span class="material-icons text-sm">analytics</span> Métricas
                          </h3>
                          <div class="grid grid-cols-2 gap-4">
                              <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                                  <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Unidades Buenas</label>
                                  <div class="text-2xl font-black text-emerald-400">{{ selectedReport.goodUnits | number }}</div>
                              </div>
                              <div class="p-3 rounded-lg bg-black/20 border border-white/5">
                                  <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Mermas</label>
                                  <div class="text-2xl font-black text-red-400">{{ selectedReport.waste | number }}</div>
                              </div>
                              <div class="p-3 rounded-lg bg-black/20 border border-white/5 col-span-2 flex justify-between items-center">
                                  <div>
                                      <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">Troquel Usado</label>
                                      <div class="text-white font-mono font-bold">{{ selectedReport.dieSeries }}</div>
                                  </div>
                                  <span class="px-3 py-1 rounded text-xs font-bold uppercase border"
                                        [ngClass]="getStatusClass(selectedReport.dieStatus)">
                                        {{ selectedReport.dieStatus }}
                                  </span>
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
                                  <th class="px-5 py-3 text-right">Cant. Prod.</th>
                              </tr>
                          </thead>
                          <tbody class="divide-y divide-white/5 text-slate-300">
                              <tr *ngFor="let act of selectedReport.activities" class="hover:bg-white/5">
                                  <td class="px-5 py-3 font-medium text-white">
                                      <div class="flex items-center gap-2">
                                          <div class="w-1.5 h-1.5 rounded-full" [ngClass]="act.qty > 0 ? 'bg-purple-500' : 'bg-slate-500'"></div>
                                          {{ act.type }}
                                      </div>
                                  </td>
                                  <td class="px-5 py-3 text-center font-mono text-xs">{{ act.startTime }} - {{ act.endTime }}</td>
                                  <td class="px-5 py-3 text-center font-mono text-xs text-slate-500">{{ calculateDuration(act.startTime, act.endTime) }}</td>
                                  <td class="px-5 py-3 text-right font-mono font-bold" [class.text-purple-400]="act.qty > 0">
                                      {{ act.qty > 0 ? (act.qty | number) : '-' }}
                                  </td>
                              </tr>
                          </tbody>
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
                  <button class="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-lg transition-all text-sm flex items-center gap-2">
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
export class ProductionDiecutComponent implements OnInit {
  state = inject(StateService);
  ordersService = inject(OrdersService);

  reports: DiecutReport[] = [];
  searchTerm = '';
  selectedReport: DiecutReport | null = null;

  ngOnInit() {
    this.generateReports();
  }

  generateReports() {
    const ots = this.ordersService.ots.slice(0, 25);
    const machines = this.state.adminMachines().filter(m => m.type === 'Troquelado');
    const operators = ['Luis Diaz', 'Pedro Gomez', 'Sofia Herrera'];

    this.reports = ots.map((ot, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (index % 10));
        date.setHours(8 + (index % 8), 0);

        const goodUnits = Math.floor(Math.random() * 50000) + 5000;
        const waste = Math.floor(goodUnits * (0.01 + Math.random() * 0.04));
        const dieStatus = index % 5 === 0 ? 'Desgaste' : (index % 20 === 0 ? 'Dañado' : 'OK');

        // Activities
        const activities: DiecutActivity[] = [
            { type: 'SETUP', startTime: '08:00', endTime: '09:00', qty: 0 },
            { type: 'TROQUELADO', startTime: '09:00', endTime: '12:00', qty: Math.floor(goodUnits * 0.4) },
            { type: 'REPUJADO', startTime: '12:00', endTime: '14:00', qty: Math.floor(goodUnits * 0.3) },
            { type: 'TROQUELADO', startTime: '14:00', endTime: '16:00', qty: Math.floor(goodUnits * 0.3) }
        ];

        return {
            id: `REP-TRQ-${1000 + index}`,
            date: date,
            ot: ot.OT,
            client: ot['Razon Social'],
            product: ot.descripcion || 'Etiqueta Troquelada',
            machine: machines[index % machines.length]?.name || 'Plana 1',
            operator: operators[index % operators.length],
            shift: index % 2 === 0 ? 'Día - A' : 'Noche - B',
            dieSeries: ot.troquel || `TR-${ot.OT.slice(-4)}`,
            goodUnits,
            waste,
            dieStatus: dieStatus as any,
            activities: activities,
            productionStatus: index % 3 !== 0 ? 'TOTAL' : 'PARCIAL',
            observations: dieStatus !== 'OK' ? 'Troquel presenta rebabas en bordes derechos.' : ''
        };
    });
  }

  get filteredReports() {
      const term = this.searchTerm.toLowerCase();
      return this.reports.filter(r => 
          r.ot.toLowerCase().includes(term) ||
          r.machine.toLowerCase().includes(term) ||
          r.dieSeries.toLowerCase().includes(term) ||
          r.client.toLowerCase().includes(term)
      );
  }

  get kpis() {
      const totalUnits = this.reports.reduce((acc, r) => acc + r.goodUnits, 0);
      const totalWaste = this.reports.reduce((acc, r) => acc + r.waste, 0);
      const wasteRate = totalUnits > 0 ? (totalWaste / totalUnits) * 100 : 0;
      const totalHours = this.reports.length * 8; // Estimado

      return {
          totalUnits,
          wasteRate,
          totalHours,
          toolingIssues: this.reports.filter(r => r.dieStatus !== 'OK').length
      };
  }

  openDetail(report: DiecutReport) {
      this.selectedReport = report;
  }

  closeDetail() {
      this.selectedReport = null;
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
