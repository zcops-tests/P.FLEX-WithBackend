
import { Component, inject, OnInit, OnDestroy, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';
import { StateService, Machine } from '../../services/state.service';
import { QualityService } from '../quality/services/quality.service';
import { FileExportService } from '../../services/file-export.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Full Dark Theme Container with Mesh Gradient -->
    <div class="bg-gradient-mesh text-slate-200 font-sans h-full flex flex-col overflow-hidden relative pb-4">
      
      <!-- KPI BAR -->
      <section class="bg-white/5 border-b border-white/10 px-6 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap shrink-0 backdrop-blur-md">
        <div class="flex items-center gap-2 pr-6 border-r border-white/10">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KPIs Planta</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
            <span class="material-icons text-red-500 text-base">error</span>
            <span class="text-xs font-bold text-red-400">{{ kpiCriticalAlerts }} Alertas Críticas</span>
          </div>
          <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span class="material-icons text-emerald-500 text-base">check_circle</span>
            <span class="text-xs font-bold text-emerald-400">{{ kpiEfficiency }}% Disponibilidad Global</span>
          </div>
          <div class="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
            <span class="material-icons text-blue-500 text-base">inventory_2</span>
            <span class="text-xs font-bold text-blue-400">{{ kpiPendingJobs }} Trabajos Pendientes</span>
          </div>
        </div>
      </section>

      <!-- MAIN HEADER & FILTERS -->
      <header class="flex flex-col gap-4 px-6 py-4 shrink-0 border-b border-white/5">
        
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span class="material-icons text-blue-500">calendar_month</span>
                Programación de Producción
              </h1>
              <p class="text-xs text-slate-400 mt-0.5">Gestión de tiempos y asignación de máquinas</p>
            </div>
            
            <div class="flex items-center gap-3">
               <!-- SHIFT SELECTOR -->
               <div class="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                  <button (click)="setShift('DIA')" 
                     [class.bg-yellow-500]="selectedShift === 'DIA'" 
                     [class.text-black]="selectedShift === 'DIA'" 
                     [class.text-slate-400]="selectedShift !== 'DIA'" 
                     class="px-4 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-2 transition-colors">
                     <span class="material-icons text-[14px]">wb_sunny</span> DÍA
                  </button>
                  <button (click)="setShift('NOCHE')" 
                     [class.bg-indigo-600]="selectedShift === 'NOCHE'" 
                     [class.text-white]="selectedShift === 'NOCHE'" 
                     [class.text-slate-400]="selectedShift !== 'NOCHE'" 
                     class="px-4 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-2 transition-colors">
                     <span class="material-icons text-[14px]">nights_stay</span> NOCHE
                  </button>
               </div>

               <!-- PDF Export Button -->
               <button (click)="exportToPdf()" class="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-white/10">
                  <span class="material-icons text-sm">picture_as_pdf</span>
                  PDF
               </button>

               <button (click)="openAddModal()" class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20">
                  <span class="material-icons text-sm">add</span>
                  ASIGNAR
               </button>
            </div>
        </div>

        <!-- AREA SELECTOR TABS -->
        <div class="flex gap-1 border-b border-white/10">
            <button (click)="selectedArea = 'IMPRESION'"
               [class.text-primary]="selectedArea === 'IMPRESION'"
               [class.border-primary]="selectedArea === 'IMPRESION'"
               [class.text-slate-500]="selectedArea !== 'IMPRESION'"
               [class.border-transparent]="selectedArea !== 'IMPRESION'"
               class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 hover:text-white transition-colors flex items-center gap-2">
               <span class="material-icons text-sm">print</span> Impresión
            </button>
            <button (click)="selectedArea = 'TROQUELADO'"
               [class.text-purple-400]="selectedArea === 'TROQUELADO'"
               [class.border-purple-400]="selectedArea === 'TROQUELADO'"
               [class.text-slate-500]="selectedArea !== 'TROQUELADO'"
               [class.border-transparent]="selectedArea !== 'TROQUELADO'"
               class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 hover:text-white transition-colors flex items-center gap-2">
               <span class="material-icons text-sm">content_cut</span> Troquelado
            </button>
            <button (click)="selectedArea = 'REBOBINADO'"
               [class.text-orange-400]="selectedArea === 'REBOBINADO'"
               [class.border-orange-400]="selectedArea === 'REBOBINADO'"
               [class.text-slate-500]="selectedArea !== 'REBOBINADO'"
               [class.border-transparent]="selectedArea !== 'REBOBINADO'"
               class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 hover:text-white transition-colors flex items-center gap-2">
               <span class="material-icons text-sm">sync</span> Rebobinado
            </button>
        </div>

      </header>

      <!-- GANTT CHART CONTAINER (Removed shadow-2xl) -->
      <main #scheduleContainer class="flex-1 flex flex-col mx-4 mb-4 rounded-b-2xl rounded-tr-2xl border border-white/10 bg-white/5 overflow-hidden relative mt-2 backdrop-blur-xl">
        
        <!-- Timeline Header -->
        <div class="flex border-b border-white/10 bg-black/20 sticky top-0 z-30">
          <div class="w-64 flex-shrink-0 p-3 border-r border-white/10 flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Máquina</span>
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</span>
          </div>
          <div class="flex-1 overflow-hidden">
            <div class="grid grid-cols-12 h-full text-center">
               <div *ngFor="let hour of timeSlots" class="border-r border-white/5 py-2 text-[10px] font-bold text-slate-400">
                  {{ hour }}
               </div>
            </div>
          </div>
        </div>

        <!-- Rows -->
        <div class="overflow-y-auto custom-scrollbar flex-1 grid-striped relative">
           
           <div *ngFor="let machine of filteredMachines; trackBy: trackByMachine" 
                class="flex border-b border-white/5 hover:bg-white/5 transition-colors h-16 group relative"
                [class.bg-red-500-5]="machine.status === 'Mantenimiento' || machine.status === 'Detenida' || machine.status === 'Sin Operador'">
              
              <!-- Machine Info Column -->
              <div class="w-64 flex-shrink-0 px-4 py-2 border-r border-white/10 flex flex-col justify-center bg-inherit z-20 backdrop-blur-sm">
                 <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-sm truncate" [class.text-red-400]="machine.status !== 'Operativa'" [class.text-white]="machine.status === 'Operativa'">{{ machine.name }}</span>
                    <span class="w-2 h-2 rounded-full" 
                          [ngClass]="{
                            'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]': machine.status === 'Operativa',
                            'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]': machine.status === 'Mantenimiento',
                            'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]': machine.status === 'Detenida',
                            'bg-slate-500': machine.status === 'Sin Operador'
                          }"></span>
                 </div>
                 
                 <!-- Status & Code -->
                 <div class="flex justify-between items-center mt-1">
                    <span class="text-[10px] font-mono text-slate-500">{{ machine.code }}</span>
                    
                    <!-- EDITABLE STATUS SELECTOR -->
                    <div class="relative" (click)="$event.stopPropagation()">
                       <select [ngModel]="machine.status" 
                               (ngModelChange)="updateMachineStatus(machine, $event)"
                               class="appearance-none bg-black/40 border border-white/10 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-white/30 pr-4 transition-colors"
                               [ngClass]="{
                                  'text-emerald-400 border-emerald-500/30': machine.status === 'Operativa',
                                  'text-amber-400 border-amber-500/30': machine.status === 'Mantenimiento',
                                  'text-red-400 border-red-500/30': machine.status === 'Detenida',
                                  'text-slate-400 border-white/10': machine.status === 'Sin Operador'
                               }">
                          <option value="Operativa" class="bg-slate-900 text-emerald-400">OPERATIVA</option>
                          <option value="Mantenimiento" class="bg-slate-900 text-amber-400">MANTENIMIENTO</option>
                          <option value="Sin Operador" class="bg-slate-900 text-slate-400">SIN OPERADOR</option>
                          <option value="Detenida" class="bg-slate-900 text-red-400">DETENIDA</option>
                       </select>
                       <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-500">
                          <span class="material-icons text-[10px]">expand_more</span>
                       </div>
                    </div>

                 </div>
              </div>

              <!-- Gantt Track -->
              <div class="flex-1 relative">
                 <!-- Grid Lines -->
                 <div class="absolute inset-0 grid grid-cols-12 pointer-events-none opacity-20">
                    <div *ngFor="let h of timeSlots; let last = last" [class.border-r]="!last" class="border-white/20 h-full"></div>
                 </div>

                 <!-- Special Maintenance Background Pattern -->
                 <div *ngIf="machine.status !== 'Operativa'" 
                      class="absolute inset-0 maintenance-pattern z-0 flex items-center justify-center">
                      <div class="bg-black/60 px-3 py-0.5 rounded-full border backdrop-blur-sm shadow-lg"
                           [ngClass]="{
                              'border-amber-500/30 text-amber-500': machine.status === 'Mantenimiento',
                              'border-red-500/30 text-red-500': machine.status === 'Detenida',
                              'border-white/10 text-slate-400': machine.status === 'Sin Operador'
                           }">
                        <span class="text-[10px] font-bold uppercase tracking-tighter">{{ machine.status }}</span>
                      </div>
                 </div>

                 <!-- Jobs -->
                 <ng-container *ngIf="machine.status === 'Operativa'">
                    <div *ngFor="let job of getJobsForMachine(machine.id)"
                         class="absolute top-2 bottom-2 rounded-lg border shadow-lg flex items-center z-10 cursor-pointer hover:z-20 transition-all group/job hover:brightness-110 px-2"
                         [style.left.%]="calculateLeft(job)"
                         [style.width.%]="calculateWidth(job)"
                         [style.background-color]="job.color + 'D9'"
                         [style.border-color]="job.color"
                         (click)="openEditModal(job)">
                         
                         <div class="flex justify-between items-center w-full overflow-hidden h-full">
                            <div class="flex flex-col justify-center min-w-0 pr-1 leading-none">
                               <span class="text-[10px] font-bold text-white truncate shadow-sm block mb-0.5">OT #{{ job.ot }}</span>
                               <span class="text-[9px] text-white/90 truncate block">{{ job.client }}</span>
                            </div>
                            <div *ngIf="calculateWidth(job) > 6" class="flex-shrink-0 bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white shadow-sm backdrop-blur-sm">
                               {{ (job.meters || 0) | number }} m
                            </div>
                         </div>
                    </div>
                 </ng-container>

              </div>
           </div>

           <!-- Empty State -->
           <div *ngIf="filteredMachines.length === 0" class="p-16 text-center text-slate-500">
              <div class="flex flex-col items-center">
                 <span class="material-icons text-5xl mb-3 opacity-30">precision_manufacturing</span>
                 <p class="text-sm font-medium">No hay máquinas registradas en el área de {{ selectedArea }}.</p>
              </div>
           </div>

           <!-- NOW LINE -->
           <div class="absolute top-0 bottom-0 pointer-events-none z-40 border-l-2 border-red-500/60 border-dashed"
                *ngIf="showNowLine"
                [style.left]="currentLinePosition">
              <div class="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              <div class="absolute top-2 -left-10 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg">AHORA</div>
           </div>

        </div>
      </main>

      <!-- JOB DETAILS / ASSIGNMENT MODAL (Updated to Dark Glass) -->
      <div *ngIf="showJobModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300" role="dialog" aria-modal="true">
           <div class="glassmorphism-card w-full max-w-2xl rounded-2xl shadow-2xl border border-white/20 flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
              
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div>
                    <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                        <span class="material-icons text-primary text-xl">add_circle</span>
                        {{ isEditing ? 'Detalle de Asignación' : 'Asignar Nueva Producción' }}
                    </h2>
                    <p class="text-xs text-slate-400 mt-0.5">Gestión de tiempos y recursos para orden de trabajo</p>
                </div>
                <button (click)="showJobModal = false" class="text-slate-400 hover:text-white transition-colors focus:outline-none">
                    <span class="material-icons">close</span>
                </button>
              </div>

              <!-- Body -->
              <div class="p-6 overflow-y-auto custom-scrollbar space-y-6 text-white">
                 
                 <!-- OT / Machine Grid -->
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- OT Input -->
                    <div class="col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Orden de Trabajo (OT)</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                <span class="material-icons text-lg">search</span>
                            </span>
                            <input type="text" [(ngModel)]="currentJob.ot" 
                                   class="glassmorphism-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-primary" 
                                   placeholder="Buscar por #OT, Cliente o Producto...">
                        </div>
                    </div>

                    <!-- Machine Select -->
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Máquina Asignada</label>
                        <div class="relative">
                            <select [(ngModel)]="currentJob.machineId" class="glassmorphism-input w-full pl-3 pr-10 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                                <option *ngFor="let m of filteredMachines" [value]="m.id" class="bg-slate-900">{{ m.name }} ({{ m.code }})</option>
                            </select>
                            <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                                <span class="material-icons text-lg">expand_more</span>
                            </span>
                        </div>
                    </div>

                    <!-- Operator Select -->
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Operador Responsable</label>
                        <div class="flex items-center gap-2">
                            <div class="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/30">OP</div>
                            <div class="relative flex-1">
                                <select [(ngModel)]="currentJob.operator" class="glassmorphism-input w-full pl-3 pr-8 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                                    <option value="Juan Martinez" class="bg-slate-900">Juan Martinez (Turno A)</option>
                                    <option value="Carlos Ruiz" class="bg-slate-900">Carlos Ruiz (Turno B)</option>
                                    <option value="Ana Lopez" class="bg-slate-900">Ana Lopez (Turno A)</option>
                                </select>
                                <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                                    <span class="material-icons text-lg">expand_more</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Start Time -->
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Inicio Programado</label>
                        <input type="datetime-local" [(ngModel)]="tempStartDateTime" class="glassmorphism-input w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]">
                    </div>

                    <!-- Duration -->
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Duración Estimada</label>
                        <div class="flex">
                            <input type="number" [(ngModel)]="tempDurationHours" class="glassmorphism-input flex-1 min-w-0 block w-full px-3 py-2.5 rounded-l-xl text-sm text-white outline-none focus:ring-1 focus:ring-primary border-r-0" placeholder="0">
                            <span class="inline-flex items-center px-3 rounded-r-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-bold border-l-0">
                                Horas
                            </span>
                        </div>
                    </div>

                 </div>

                 <!-- Resource Validation -->
                 <div class="border-t border-white/10 pt-4">
                    <h3 class="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <span class="material-icons text-base text-slate-400">fact_check</span>
                        Validación de Recursos
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
                            <span class="material-icons text-emerald-400 text-xl mt-0.5">check_circle</span>
                            <div>
                                <p class="text-sm font-medium text-emerald-300">Clisés / Troqueles</p>
                                <p class="text-xs text-emerald-400/70 mt-1">Disponibles en almacén #04.</p>
                            </div>
                        </div>
                        <div class="bg-amber-900/20 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                            <span class="material-icons text-amber-400 text-xl mt-0.5">inventory_2</span>
                            <div>
                                <p class="text-sm font-medium text-amber-300">Material Sustrato</p>
                                <p class="text-xs text-amber-400/70 mt-1">Stock bajo. Requiere confirmación.</p>
                            </div>
                        </div>
                    </div>
                 </div>

                 <!-- Notes -->
                 <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Notas de Producción</label>
                    <textarea [(ngModel)]="currentJob.description" class="glassmorphism-input w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Instrucciones especiales para el operador..." rows="2"></textarea>
                 </div>

              </div>

              <!-- Footer -->
              <div class="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                 <button (click)="showJobModal = false" class="text-sm text-slate-400 hover:text-white font-medium transition-colors">
                    Cancelar
                 </button>
                 <div class="flex items-center gap-3">
                    <!-- VALIDATION BUTTON FOR EXISTING JOBS -->
                    <button *ngIf="isEditing" (click)="openValidationWizard()" class="bg-white/5 hover:bg-white/10 border border-primary/50 text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                        <span class="material-icons text-sm">fact_check</span> Validar Recursos
                    </button>

                    <button (click)="saveJob()" class="bg-primary hover:bg-blue-600 text-white px-5 py-2 rounded-xl shadow-lg shadow-primary/30 text-sm font-bold flex items-center gap-2 transition-transform active:scale-95">
                        <span class="material-icons text-base">save</span>
                        Confirmar
                    </button>
                 </div>
              </div>

           </div>
      </div>
      
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    .grid-striped > div:nth-child(even) .bg-inherit { background-color: rgba(255, 255, 255, 0.02); }
    .maintenance-pattern { background-image: repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.05) 10px, transparent 10px, transparent 20px); }
    .grid-striped > div:nth-child(even) > div:first-child { background-color: rgba(30, 41, 59, 0.3); }
    .grid-striped > div:nth-child(odd) > div:first-child { background-color: transparent; }
  `]
})
export class ScheduleComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  qualityService = inject(QualityService);
  fileExport = inject(FileExportService);
  notifications = inject(NotificationService);

  readonly scheduleContainer = viewChild<ElementRef>('scheduleContainer');
  selectedShift: 'DIA' | 'NOCHE' = 'DIA';
  selectedArea: 'IMPRESION' | 'TROQUELADO' | 'REBOBINADO' = 'IMPRESION';
  _jobs: any[] = [
     { id: 'j1', ot: '45001', client: 'Coca Cola', description: 'Etiquetas 500ml', machineId: 'p1', start: '07:30', duration: 150, color: '#3b82f6', operator: 'Juan Martinez', meters: 15000 },
     { id: 'j2', ot: '45002', client: 'Nestle', description: 'Galletas Ricas', machineId: 'p1', start: '10:30', duration: 180, color: '#10b981', operator: 'Carlos Ruiz', meters: 22500 },
     { id: 'j3', ot: 'PROY_ALPHA', client: 'Alicorp', description: 'Mayonesa Alacena', machineId: 'p2', start: '13:00', duration: 240, color: '#6366f1', operator: 'Ana Lopez', meters: 45000 },
     { id: 'j4', ot: '99422', client: 'Winter 2024', description: 'Campaña Nocturna', machineId: 'p5', start: '20:00', duration: 300, color: '#0d9488', operator: 'Pedro Night', meters: 50000 },
     { id: 'j5', ot: 'STOCK_LABEL', client: 'Interno', description: 'Reposición Stock', machineId: 'p6', start: '01:00', duration: 180, color: '#10b981', operator: 'Luis Night', meters: 12000 },
  ];
  showJobModal = false;
  isEditing = false;
  currentJob: any = {};
  showValidationModal = false;
  validationStep = 1;
  tempStartDateTime = '';
  tempDurationHours = 0;
  nowLineTimer: any;
  currentLinePosition = '0px';
  showNowLine = true;

  ngOnInit() {
    this.updateNowLine();
    this.nowLineTimer = setInterval(() => this.updateNowLine(), 60000);
  }
  ngOnDestroy() { if (this.nowLineTimer) clearInterval(this.nowLineTimer); }
  
  // --- REAL-TIME KPI GETTERS ---
  get kpiCriticalAlerts() {
    return this.qualityService.activeIncidents.filter(i => i.priority === 'Alta').length;
  }

  get kpiEfficiency() {
    const machines = this.state.adminMachines();
    if (machines.length === 0) return 0;
    const active = machines.filter(m => m.status === 'Operativa').length;
    return Math.round((active / machines.length) * 100);
  }

  get kpiPendingJobs() {
    return this.ordersService.ots.filter(ot => ot.Estado_pedido === 'PENDIENTE').length;
  }
  // -----------------------------

  get filteredMachines() {
     let typeFilter = 'Impresión';
     if (this.selectedArea === 'TROQUELADO') typeFilter = 'Troquelado';
     if (this.selectedArea === 'REBOBINADO') typeFilter = 'Acabado';
     return this.state.adminMachines().filter(m => m.type === typeFilter);
  }
  get timeSlots() { return this.selectedShift === 'DIA' ? ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'] : ['19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00']; }
  setShift(shift: 'DIA' | 'NOCHE') { this.selectedShift = shift; this.updateNowLine(); }
  trackByMachine(index: number, item: Machine) { return item.id; }
  getJobsForMachine(machineId: string) {
    return this._jobs.filter(j => {
        if (j.machineId !== machineId) return false;
        const startHour = parseInt(j.start.split(':')[0]);
        const isNightJob = (startHour >= 19 || startHour <= 6);
        const isDayJob = (startHour >= 7 && startHour <= 18);
        if (this.selectedShift === 'DIA' && isDayJob) return true;
        if (this.selectedShift === 'NOCHE' && isNightJob) return true;
        return false;
    });
  }
  updateMachineStatus(machine: any, newStatus: any) { this.state.updateMachine({ ...machine, status: newStatus }); }
  getShiftStartHour(): number { return this.selectedShift === 'DIA' ? 7 : 19; }
  getHourOffset(hour: number, minute: number = 0): number {
      const shiftStart = this.getShiftStartHour();
      let diff = 0;
      if (this.selectedShift === 'DIA') {
          if (hour < 7 || hour > 18) return -1;
          diff = hour - shiftStart;
      } else {
          if (hour >= 19) diff = hour - shiftStart;
          else if (hour <= 6) diff = (24 - shiftStart) + hour;
          else return -1;
      }
      return diff + (minute / 60);
  }
  calculateLeft(job: any): number {
     const startHour = parseInt(job.start.split(':')[0]);
     const startMin = parseInt(job.start.split(':')[1]);
     const offset = this.getHourOffset(startHour, startMin);
     if (offset < 0) return -100;
     return (offset / 12) * 100;
  }
  calculateWidth(job: any): number { return ((job.duration / 60) / 12) * 100; }
  updateNowLine() {
    const now = new Date();
    const offset = this.getHourOffset(now.getHours(), now.getMinutes());
    if (offset >= 0 && offset <= 12) {
        this.currentLinePosition = `calc((1 - ${offset / 12}) * 16rem + ${(offset / 12) * 100}%)`;
        this.showNowLine = true;
    } else { this.showNowLine = false; }
  }
  openAddModal() {
    this.isEditing = false;
    const defaultTime = this.selectedShift === 'DIA' ? '08:00' : '20:00';
    const now = new Date(); const [h, m] = defaultTime.split(':'); now.setHours(parseInt(h), parseInt(m), 0, 0);
    this.tempStartDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    this.tempDurationHours = 1; 
    this.currentJob = { start: defaultTime, duration: 60, color: '#3b82f6', operator: 'Juan Martinez', meters: 0 };
    this.showJobModal = true;
  }
  openEditModal(job: any) {
    this.isEditing = true; this.currentJob = { ...job };
    const now = new Date(); const [h, m] = job.start.split(':'); now.setHours(parseInt(h), parseInt(m), 0, 0);
    this.tempStartDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    this.tempDurationHours = (job.duration || 60) / 60;
    this.showJobModal = true;
  }
  saveJob() {
    if (this.tempStartDateTime) {
        const d = new Date(this.tempStartDateTime);
        this.currentJob.start = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    this.currentJob.duration = Math.round(this.tempDurationHours * 60);
    if (this.isEditing) this._jobs = this._jobs.map(j => j.id === this.currentJob.id ? this.currentJob : j);
    else { this.currentJob.id = Math.random().toString(36).substr(2, 9); this._jobs.push(this.currentJob); }
    this.showJobModal = false;
  }
  openValidationWizard() { this.showJobModal = false; this.validationStep = 1; this.showValidationModal = true; }
  nextValidationStep() { if (this.validationStep < 4) this.validationStep++; }
  finishValidationWizard() { this.showValidationModal = false; this.updateMachineStatus(this.filteredMachines.find(m => m.id === this.currentJob.machineId), 'Operativa'); }
  closeValidationWizard() { this.showValidationModal = false; }
  getStepClass(step: number): string {
      if (this.validationStep === step) return 'bg-[#3B82F6] text-white border-[#3B82F6]/50 shadow-[0_0_15px_rgba(59,130,246,0.6)]';
      else if (this.validationStep > step) return 'bg-[#10B981] text-[#121921] border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]';
      else return 'bg-[#162032] border-[#2D3B55] text-gray-500';
  }
  async exportToPdf() {
    this.showJobModal = false;
    const el = this.scheduleContainer();
    if(!el) return;
    const element = el.nativeElement;

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await this.fileExport.exportElementToPdf(element, `Programacion_${dateStr}.pdf`, {
        orientation: 'l',
        backgroundColor: '#0f172a',
      });

    } catch (error) {
      this.notifications.showError('Hubo un error al generar el PDF visual.');
    }
  }
}
