
import { Component, inject, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';
import { QualityService } from '../quality/services/quality.service';
import { AuditService } from '../../services/audit.service';
import { OtImportComponent } from '../orders/components/ot-import.component';
import { OtFormComponent } from '../orders/components/ot-form.component';
import { OtDetailComponent } from '../orders/components/ot-detail.component';
import { Router } from '@angular/router';
import { FileExportService } from '../../services/file-export.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, OtImportComponent, OtFormComponent, OtDetailComponent],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 text-slate-200 font-sans pb-20">
      
      <!-- Import Modal -->
      @if (showImportModal) {
        <app-ot-import
            (close)="showImportModal = false"
            (dataImported)="handleImport($event)">
        </app-ot-import>
      }

      <!-- New OT Form Modal -->
      @if (showOtFormModal) {
        <app-ot-form
            [otToEdit]="null"
            (save)="handleOtSave($event)"
            (cancel)="showOtFormModal = false">
        </app-ot-form>
      }

      <!-- OT Detail Modal -->
      @if (selectedOt) {
        <app-ot-detail
            [ot]="selectedOt!" 
            (close)="selectedOt = null">
        </app-ot-detail>
      }

      <div class="max-w-[1800px] mx-auto space-y-6" #dashboardContent>
        
        <!-- HEADER -->
        <header class="glassmorphism-card flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-3xl relative z-20">
          <!-- Decorator Glow -->
          <div class="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

          <div class="flex items-center gap-5 relative z-10">
            <div class="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <span class="material-symbols-outlined text-blue-400 text-3xl">analytics</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                CENTRO DE CONTROL
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> En Vivo
                </span>
              </h1>
              <p class="text-xs text-slate-400 flex items-center gap-2 mt-1 font-medium">
                LABEL PERÚ SAC • SECTOR A-12 • <span class="text-blue-400">{{ state.currentShift() | uppercase }}</span> • {{ now | date:'HH:mm:ss' }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 relative z-10">
            <div class="hidden xl:flex items-center gap-6 mr-6 border-r border-white/10 pr-6">
              <div class="text-right">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estado Sistema</p>
                <p class="text-sm font-bold text-emerald-400 shadow-emerald-500/20">99.8% Online</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sincronización</p>
                <p class="text-sm font-bold text-blue-400">Al día</p>
              </div>
            </div>
            <button class="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all backdrop-blur-md">
              <span class="material-symbols-outlined text-sm">filter_alt</span>
              Filtros
            </button>
            
            <!-- Export Dropdown -->
            <div class="relative">
                <button (click)="showExportMenu = !showExportMenu" class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all border border-blue-500/50">
                  <span class="material-symbols-outlined text-sm">ios_share</span>
                  Exportar
                </button>
                @if (showExportMenu) {
                    <div class="absolute right-0 mt-2 w-44 bg-[#1e293b] rounded-xl shadow-xl border border-white/10 z-50 overflow-hidden animate-fadeIn">
                        <button (click)="exportToPdf()" class="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors">
                            <span class="material-symbols-outlined text-red-400 text-sm">picture_as_pdf</span> PDF (Visual)
                        </button>
                        <button (click)="exportToExcel()" class="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors border-t border-white/5">
                            <span class="material-symbols-outlined text-emerald-400 text-sm">table_view</span> Excel (Datos)
                        </button>
                    </div>
                }
            </div>

          </div>
        </header>

        <!-- KPI GRID -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          <!-- OEE Global -->
          <div class="glassmorphism-card p-4 rounded-2xl hover:bg-white/5 transition-all group relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex justify-between items-start text-slate-500 mb-2 relative z-10">
              <span class="text-[10px] font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">OEE Global</span>
              <span class="material-symbols-outlined text-sm">memory</span>
            </div>
            <div class="flex items-end justify-between relative z-10">
              <div>
                <span class="text-2xl font-bold text-white tracking-tight">82.4%</span>
                <div class="text-[10px] text-emerald-400 font-medium flex items-center mt-0.5">
                  <span class="material-symbols-outlined text-sm mr-0.5">trending_up</span> +1.2%
                </div>
              </div>
              <div class="sparkline-container pb-1 opacity-60">
                <div class="spark-bar h-[40%]" style="height: 40%"></div>
                <div class="spark-bar h-[60%]" style="height: 60%"></div>
                <div class="spark-bar h-[50%]" style="height: 50%"></div>
                <div class="spark-bar h-[80%] spark-bar-active bg-blue-400" style="height: 80%"></div>
                <div class="spark-bar h-[75%]" style="height: 75%"></div>
              </div>
            </div>
          </div>

          <!-- OTs Activas -->
          <div class="glassmorphism-card p-4 rounded-2xl hover:bg-white/5 transition-all group">
            <div class="flex justify-between items-start text-slate-500 mb-2">
              <span class="text-[10px] font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">OTs Activas</span>
              <span class="material-symbols-outlined text-sm">settings_input_component</span>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <span class="text-2xl font-bold text-white tracking-tight">{{ activeProduction.length }}</span>
                <div class="text-[10px] text-slate-400 font-medium mt-0.5">{{ stats.pending }} Pendientes</div>
              </div>
              <div class="flex -space-x-2 pb-1 pl-2">
                <div class="w-6 h-6 rounded-full bg-blue-600 border border-[#0B1015] flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#0B1015]">JD</div>
                <div class="w-6 h-6 rounded-full bg-purple-600 border border-[#0B1015] flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#0B1015]">MS</div>
                <div class="w-6 h-6 rounded-full bg-slate-700 border border-[#0B1015] flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#0B1015]">+</div>
              </div>
            </div>
          </div>

          <!-- Incidencias -->
          <div class="glassmorphism-card p-4 rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 transition-all group cursor-pointer" (click)="router.navigate(['/incidents'])">
            <div class="flex justify-between items-start text-slate-500 mb-2">
              <span class="text-[10px] font-bold uppercase tracking-widest group-hover:text-red-400 transition-colors">Incidencias</span>
              <span class="material-symbols-outlined text-sm text-red-500 animate-pulse">report</span>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <span class="text-2xl font-bold text-red-500 tracking-tight">{{ activeIncidentsCount | number:'2.0-0' }}</span>
                <div class="text-[10px] text-red-400/80 font-medium mt-0.5">{{ highPriorityCount }} Prioridad Alta</div>
              </div>
              <div class="sparkline-container pb-1">
                <div class="spark-bar bg-red-500/40 h-[20%]" style="height: 20%"></div>
                <div class="spark-bar bg-red-500/40 h-[10%]" style="height: 10%"></div>
                <div class="spark-bar bg-red-500/60 h-[60%]" style="height: 60%"></div>
                <div class="spark-bar bg-red-500 h-[90%] spark-bar-active" style="height: 90%"></div>
              </div>
            </div>
          </div>

          <!-- Volumen -->
          <div class="glassmorphism-card p-4 rounded-2xl hover:bg-white/5 transition-all group">
            <div class="flex justify-between items-start text-slate-500 mb-2">
              <span class="text-[10px] font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">Volumen (m)</span>
              <span class="material-symbols-outlined text-sm">precision_manufacturing</span>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <span class="text-2xl font-bold text-white tracking-tight">45.2k</span>
                <div class="text-[10px] text-emerald-400 font-medium mt-0.5">98% Meta</div>
              </div>
              <div class="sparkline-container pb-1 opacity-60">
                <div class="spark-bar h-[30%]" style="height: 30%"></div>
                <div class="spark-bar h-[45%]" style="height: 45%"></div>
                <div class="spark-bar h-[65%]" style="height: 65%"></div>
                <div class="spark-bar h-[55%]" style="height: 55%"></div>
                <div class="spark-bar h-[85%] spark-bar-active bg-emerald-400" style="height: 85%"></div>
              </div>
            </div>
          </div>

          <!-- Eficiencia Energ. -->
          <div class="glassmorphism-card p-4 rounded-2xl hover:bg-white/5 transition-all group">
            <div class="flex justify-between items-start text-slate-500 mb-2">
              <span class="text-[10px] font-bold uppercase tracking-widest group-hover:text-yellow-400 transition-colors">Energía</span>
              <span class="material-symbols-outlined text-sm">bolt</span>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <span class="text-2xl font-bold text-white tracking-tight">94%</span>
                <div class="text-[10px] text-slate-400 font-medium mt-0.5">-4% vs Ayer</div>
              </div>
              <div class="sparkline-container pb-1">
                <div class="spark-bar bg-yellow-500/40 h-[80%]" style="height: 80%"></div>
                <div class="spark-bar bg-yellow-500/60 h-[70%]" style="height: 70%"></div>
                <div class="spark-bar bg-yellow-500 h-[60%] spark-bar-active" style="height: 60%"></div>
              </div>
            </div>
          </div>

          <!-- Sync Local -->
          <div class="glassmorphism-card p-4 rounded-2xl hover:bg-white/5 transition-all group">
            <div class="flex justify-between items-start text-slate-500 mb-2">
              <span class="text-[10px] font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">Cola Sync</span>
              <span class="material-symbols-outlined text-sm text-blue-400">cloud_sync</span>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <span class="text-2xl font-bold text-blue-400 tracking-tight">{{ state.pendingSyncCount() }}</span>
                <div class="text-[10px] text-slate-400 font-medium mt-0.5">Registros</div>
              </div>
              <button (click)="router.navigate(['/sync'])" class="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all">
                SYNC
              </button>
            </div>
          </div>
        </div>

        <!-- MAIN CONTENT AREA -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <!-- LEFT: Feed de Operaciones -->
          <div class="lg:col-span-3 glassmorphism-card rounded-3xl flex flex-col h-[600px] overflow-hidden">
            <div class="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-md">
              <div class="flex items-center gap-4">
                <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span class="material-symbols-outlined text-blue-400 text-lg">reorder</span>
                  Feed de Operaciones
                </h2>
                <div class="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 hidden sm:flex">
                  <button (click)="activeFeedTab = 'ALL'" 
                    class="px-3 py-1 text-[10px] font-bold rounded-lg shadow-sm transition-all"
                    [ngClass]="activeFeedTab === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'">Todo</button>
                  <button (click)="activeFeedTab = 'ALERTS'" 
                    class="px-3 py-1 text-[10px] font-bold rounded-lg transition-all"
                    [ngClass]="activeFeedTab === 'ALERTS' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'">Alertas</button>
                  <button (click)="activeFeedTab = 'PRODUCTION'" 
                    class="px-3 py-1 text-[10px] font-bold rounded-lg transition-all"
                    [ngClass]="activeFeedTab === 'PRODUCTION' ? 'bg-blue-500/40 text-white' : 'text-slate-400 hover:text-white'">Producción</button>
                  <button (click)="activeFeedTab = 'STOCK'" 
                    class="px-3 py-1 text-[10px] font-bold rounded-lg transition-all"
                    [ngClass]="activeFeedTab === 'STOCK' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'">Stock</button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-medium">En vivo</span>
                <button class="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                  <span class="material-symbols-outlined text-lg">settings</span>
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              
              @for (item of filteredFeed; track item.id) {
                <!-- PRODUCTION CARD -->
                @if (item.type === 'PRODUCTION') {
                  <div (click)="selectedOt = item.data" class="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all group cursor-pointer relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div class="flex-shrink-0 mt-1">
                      <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start mb-1">
                        <span class="text-sm font-bold text-white tracking-tight">{{ item.title }}</span>
                        <span class="text-[10px] text-slate-500 font-mono">{{ item.displayTime }}</span>
                      </div>
                      <p class="text-xs text-slate-400 line-clamp-1 mb-3">{{ item.description }} <span class="text-slate-600 mx-1">|</span> Máquina: <span class="text-slate-300">{{ item.machine || 'N/A' }}</span></p>
                      <div class="w-full bg-black/30 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div class="bg-blue-500 h-full rounded-full relative" style="width: 65%">
                           <div class="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                        </div>
                      </div>
                    </div>
                    <div class="text-right flex flex-col justify-between items-end pl-4">
                      <span class="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">EJECUTANDO</span>
                      <span class="text-sm font-black text-white">65%</span>
                    </div>
                  </div>
                }

                <!-- ALERTS CARD -->
                @if (item.type === 'ALERTS' || item.type === 'STOCK') {
                  <div class="flex gap-4 p-4 rounded-2xl border transition-all relative overflow-hidden" 
                       [ngClass]="[item.bgClass, item.borderClass]">
                    <div class="absolute left-0 top-0 bottom-0 w-1" [ngClass]="item.sideBorder"></div>
                    <div class="flex-shrink-0 mt-1">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center border" [ngClass]="[item.bgClass, item.colorClass, item.borderClass]">
                        <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start mb-1">
                        <span class="text-sm font-bold text-white">{{ item.title }}</span>
                        <span class="text-[10px] text-slate-500 font-mono">{{ item.displayTime }}</span>
                      </div>
                      <p class="text-xs text-slate-400">{{ item.description }}</p>
                    </div>
                    <div class="text-right flex items-center" *ngIf="item.action">
                      <button class="px-4 py-1.5 rounded-lg border text-[10px] font-bold transition-all shadow-lg tracking-wide hover:brightness-110"
                              [ngClass]="[item.bgClass, item.borderClass, item.colorClass]">
                          {{ item.action }}
                      </button>
                    </div>
                  </div>
                }
              }

              @if (filteredFeed.length === 0) {
                <div class="p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                    <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <span class="material-symbols-outlined text-3xl opacity-50">playlist_remove</span>
                    </div>
                    <p class="text-sm font-medium">No hay actividad en esta categoría.</p>
                </div>
              }

            </div>

            <div class="p-4 border-t border-white/5 bg-white/5 backdrop-blur-md flex justify-center cursor-pointer hover:bg-white/10 transition-colors" (click)="router.navigate(['/ots'])">
              <button class="text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2">
                Ver Historial Completo
                <span class="material-symbols-outlined text-sm">expand_more</span>
              </button>
            </div>
          </div>

          <!-- RIGHT: Sidebar Widgets -->
          <div class="space-y-6">
            
            <!-- Quick Operations -->
            <div class="glassmorphism-card rounded-3xl p-5">
              <h2 class="text-xs font-bold text-slate-300 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-400 text-sm">bolt</span>
                Acciones Rápidas
              </h2>
              <div class="grid grid-cols-2 gap-3">
                <button (click)="showOtFormModal = true" class="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-2xl hover:bg-blue-600/20 hover:border-blue-500/50 transition-all group">
                  <span class="material-symbols-outlined text-blue-400 mb-2 text-2xl group-hover:scale-110 transition-transform">add_task</span>
                  <span class="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Nueva OT</span>
                </button>
                <button (click)="showImportModal = true" class="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-2xl hover:bg-emerald-600/20 hover:border-emerald-500/50 transition-all group">
                  <span class="material-symbols-outlined text-emerald-400 mb-2 text-2xl group-hover:scale-110 transition-transform">upload_file</span>
                  <span class="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Importar</span>
                </button>
                <button (click)="router.navigate(['/incidents'])" class="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-2xl hover:bg-red-600/20 hover:border-red-500/50 transition-all group">
                  <span class="material-symbols-outlined text-red-400 mb-2 text-2xl group-hover:scale-110 transition-transform">report_problem</span>
                  <span class="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Falla</span>
                </button>
                <button class="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-2xl hover:bg-purple-600/20 hover:border-purple-500/50 transition-all group">
                  <span class="material-symbols-outlined text-purple-400 mb-2 text-2xl group-hover:scale-110 transition-transform">qr_code_scanner</span>
                  <span class="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Escanear</span>
                </button>
              </div>
            </div>

            <!-- System Logs -->
            <div class="bg-black/20 border border-white/5 rounded-3xl p-5 backdrop-blur-sm">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-slate-500 text-sm">terminal</span>
                <h2 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logs del Sistema</h2>
              </div>
              <div class="font-mono text-[9px] text-slate-400 space-y-2">
                @for (log of systemLogs; track log.timestamp) {
                    <p class="flex gap-2">
                        <span class="font-bold text-blue-500">{{ log.timestamp | date:'HH:mm:ss' }}</span> 
                        <span class="text-slate-300 truncate">{{ log.action }} - {{ log.details | slice:0:30 }}</span>
                    </p>
                }
                @if (systemLogs.length === 0) {
                    <p class="text-slate-600 italic">Esperando actividad...</p>
                }
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    .glassmorphism-card {
        @apply bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg;
    }
    .sparkline-container {
        height: 30px;
        display: flex;
        align-items: flex-end;
        gap: 2px;
    }
    .spark-bar {
        width: 4px;
        background: currentColor;
        opacity: 0.2;
        border-radius: 1px;
    }
    .spark-bar-active {
        opacity: 1;
        box-shadow: 0 0 8px currentColor;
    }
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.2); 
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1); 
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.2); 
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
        animation: fadeIn 0.2s ease-out;
    }
  `]
})
export class DashboardComponent implements OnDestroy {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  qualityService = inject(QualityService);
  audit = inject(AuditService);
  router = inject(Router);
  fileExport = inject(FileExportService);
  notifications = inject(NotificationService);

  @ViewChild('dashboardContent') dashboardContent!: ElementRef;

  showImportModal = false;
  showOtFormModal = false;
  showExportMenu = false;
  selectedOt: OT | null = null;
  now = new Date();
  
  activeFeedTab: 'ALL' | 'ALERTS' | 'PRODUCTION' | 'STOCK' = 'ALL';

  private clockInterval: any;

  constructor() {
    this.clockInterval = setInterval(() => {
      this.now = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  // EXPORT FUNCTIONS
  async exportToPdf() {
    this.showExportMenu = false;
    const element = this.dashboardContent.nativeElement;
    
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await this.fileExport.exportElementToPdf(element, `Dashboard_Report_${dateStr}.pdf`, {
        orientation: 'l',
        backgroundColor: '#0B0E14',
      });
      this.audit.log(this.state.userName(), this.state.userRole(), 'DASHBOARD', 'Export PDF', 'Exportación visual del tablero completada.');

    } catch (err) {
      this.notifications.showError('Error al generar PDF.');
    }
  }

  async exportToExcel() {
    this.showExportMenu = false;
    await this.fileExport.preloadXlsx();
    const xlsx = this.fileExport.getXlsx();
    const wb = xlsx.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];

    // Sheet 1: General Stats
    const statsData = [
      ['REPORTE GENERAL DE PLANTA', dateStr],
      [''],
      ['METRICAS PRINCIPALES'],
      ['OEE Global', '82.4%'],
      ['OTs Activas', this.activeProduction.length],
      ['Pendientes', this.stats.pending],
      ['Metros Totales (Volumen)', '45.2k'],
      ['Incidencias Activas', this.activeIncidentsCount],
      ['Prioridad Alta', this.highPriorityCount],
      ['Eficiencia Energética', '94%'],
      ['Cola de Sincronización', this.state.pendingSyncCount()]
    ];
    const wsStats = xlsx.utils.aoa_to_sheet(statsData);
    xlsx.utils.book_append_sheet(wb, wsStats, "KPIs");

    const activeOTsData = this.activeProduction.map(ot => ({
      OT: ot.OT,
      Cliente: ot['Razon Social'],
      Producto: ot.descripcion,
      Maquina: ot.maquina,
      Metros: ot.total_mtl,
      Estado: ot.Estado_pedido
    }));
    const wsOTs = xlsx.utils.json_to_sheet(activeOTsData);
    const XLSX = xlsx;
    XLSX.utils.book_append_sheet(wb, wsOTs, "Producción en Curso");
    // Sheet 3: Feed / Logs
    const feedData = this.feedItems.map(item => ({
      Hora: item.displayTime,
      Tipo: item.type,
      Titulo: item.title,
      Descripcion: item.description,
      Maquina: item.machine || '-'
    }));
    const wsFeed = xlsx.utils.json_to_sheet(feedData);
    xlsx.utils.book_append_sheet(wb, wsFeed, "Feed de Actividad");

    await this.fileExport.writeWorkbook(wb, `Dashboard_Data_${dateStr}.xlsx`);
    this.audit.log(this.state.userName(), this.state.userRole(), 'DASHBOARD', 'Export Excel', 'Exportación de datos estadísticos completada.');
  }

  // Getter for real logs
  get systemLogs() {
      // Get the last 6 logs from the service
      return this.audit.logs().slice(0, 6);
  }

  get activeProduction() {
    return this.ordersService.ots
      .filter(ot => ot.Estado_pedido === 'EN PROCESO')
      .slice(0, 5); 
  }

  get activeIncidentsCount() {
    return this.qualityService.activeIncidents.length;
  }

  get highPriorityCount() {
    return this.qualityService.activeIncidents.filter(i => i.priority === 'Alta').length;
  }

  get stats() {
    const all = this.ordersService.ots;
    let totalMeters = 0;
    
    all.forEach(ot => {
        const mtl = parseFloat(String(ot.total_mtl || '0').replace(/,/g, ''));
        if (!isNaN(mtl)) totalMeters += mtl;
    });

    return {
      pending: all.filter(ot => ot.Estado_pedido === 'PENDIENTE').length,
      totalMeters: Math.round(totalMeters)
    };
  }

  get workstationStatus() {
    return [
      { name: 'Flexo-03', status: 'Carga 100%', color: 'bg-green-500 text-green-500' },
      { name: 'Offset-02', status: 'Inactivo (Rep)', color: 'bg-amber-500 text-amber-500' },
      { name: 'Digital-V2', status: 'Carga 45%', color: 'bg-green-500 text-green-500' },
      { name: 'Troquel-01', status: 'Operando', color: 'bg-green-500 text-green-500' },
      { name: 'Rebob-04', status: 'Desconectado', color: 'bg-slate-500 text-slate-500' }
    ];
  }

  get feedItems() {
    const items: any[] = [];

    // 1. Production OTs
    this.ordersService.ots.forEach(ot => {
        if (ot.Estado_pedido === 'EN PROCESO') {
            items.push({
                id: ot.OT,
                type: 'PRODUCTION',
                title: `OT #${ot.OT} - Producción en Curso`,
                description: ot.descripcion,
                machine: ot.maquina,
                time: new Date(),
                displayTime: 'En curso',
                icon: 'conveyor_belt',
                data: ot 
            });
        }
    });

    // 2. Incidents (Alerts)
    this.qualityService.activeIncidents.forEach(inc => {
        const isHigh = inc.priority === 'Alta';
        items.push({
            id: inc.id,
            type: 'ALERTS',
            title: `Incidencia: ${inc.title}`,
            description: inc.description,
            machine: inc.machineRef,
            time: inc.reportedAt,
            displayTime: this.formatTime(inc.reportedAt),
            icon: isHigh ? 'warning' : 'info',
            colorClass: isHigh ? 'text-red-400' : 'text-yellow-400',
            bgClass: isHigh ? 'bg-red-500/5' : 'bg-yellow-500/5',
            borderClass: isHigh ? 'border-red-500/20' : 'border-yellow-500/20',
            sideBorder: isHigh ? 'bg-red-500' : 'bg-yellow-500',
            action: 'VER DETALLE',
            statusLabel: inc.priority.toUpperCase(),
            isAlert: true
        });
    });

    // 3. Stock (Mock)
    items.push({
        id: 'stk-1',
        type: 'STOCK',
        title: 'Alerta de Inventario: Stock Crítico',
        description: 'Polietileno HD - Rollo 200m (B-12). Solo 4.2 Kg restantes.',
        time: new Date(Date.now() - 1000 * 60 * 35),
        displayTime: '09:35',
        icon: 'inventory_2',
        colorClass: 'text-red-400',
        bgClass: 'bg-red-500/5',
        borderClass: 'border-red-500/20',
        sideBorder: 'bg-red-500',
        action: 'REORDENAR',
        isStock: true
    });
    items.push({
        id: 'stk-2',
        type: 'STOCK',
        title: 'Recepción de Material',
        description: 'Lote #441 (Barniz UV) verificado sin desviaciones.',
        time: new Date(Date.now() - 1000 * 60 * 90),
        displayTime: '08:40',
        icon: 'verified_user',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-white/5',
        borderClass: 'border-white/5',
        sideBorder: 'bg-emerald-500',
        isStock: true
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }

  get filteredFeed() {
      if (this.activeFeedTab === 'ALL') return this.feedItems;
      return this.feedItems.filter(i => i.type === this.activeFeedTab);
  }

  formatTime(date: Date) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async handleImport(data: any[]) {
    try {
      const result = await this.ordersService.importWorkOrders(data);
      this.showImportModal = false;
      alert(`Importación completada.\n\nNuevos: ${result.created}\nActualizados: ${result.updated}\nTotal procesados: ${result.total}`);
    } catch (error: any) {
      console.error('Error importing work orders from dashboard:', error);
      this.showImportModal = false;
      alert(`No se pudo completar la importación de OTs.\n${error?.message || 'Error desconocido.'}`);
    }
  }

  async handleOtSave(formData: Partial<OT>) {
    const existing = this.ordersService.internalDatabase.find((ot) => String(ot.OT).trim() === String(formData.OT).trim());

    if (existing && !confirm(`La OT ${formData.OT} ya existe. ¿Desea sobrescribirla?`)) {
      return;
    }

    try {
      await this.ordersService.saveOt({
        ...existing,
        ...formData,
        Estado_pedido: formData.Estado_pedido || existing?.Estado_pedido || 'PENDIENTE',
        'FECHA INGRESO PLANTA': formData['FECHA INGRESO PLANTA'] || existing?.['FECHA INGRESO PLANTA'] || new Date().toISOString().split('T')[0],
      }, { activate: true });

      this.showOtFormModal = false;
      alert(`OT ${formData.OT} guardada correctamente.`);
    } catch (error: any) {
      console.error('Error saving work order from dashboard:', error);
      alert(`No se pudo guardar la OT.\n${error?.message || 'Error desconocido.'}`);
    }
  }
}
