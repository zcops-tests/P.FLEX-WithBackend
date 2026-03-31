
import { Component, inject, OnInit, OnDestroy, ElementRef, viewChild, ChangeDetectorRef, NgZone, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';
import { StateService, Machine } from '../../services/state.service';
import { QualityService } from '../quality/services/quality.service';
import { FileExportService } from '../../services/file-export.service';
import { NotificationService } from '../../services/notification.service';
import { AdminService } from '../admin/services/admin.service';
import { AppUser } from '../admin/models/admin.models';
import { isOperatorAreaMatch, OperatorProductionArea } from '../admin/utils/operator-area.util';

interface ScheduledJob {
  id: string;
  ot: string;
  client: string;
  description: string;
  machineId: string;
  start: string;
  scheduledDate?: string;
  duration: number;
  color: string;
  operator: string;
  meters: number;
  workOrderId?: string;
}

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
           <div *ngIf="isScheduleLoading" class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px]">
              <div class="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-300 shadow-lg">
                 Cargando programacion...
              </div>
           </div>
           
           <div *ngFor="let machine of filteredMachines; trackBy: trackByMachine" 
                class="flex border-b border-white/5 hover:bg-white/5 transition-colors h-16 group relative"
                [class.bg-red-500-5]="machine.status === 'Mantenimiento' || machine.status === 'Detenida' || machine.status === 'Sin Operario' || machine.status === 'Inactivo'">
              
              <!-- Machine Info Column -->
              <div class="w-64 flex-shrink-0 px-4 py-2 border-r border-white/10 flex flex-col justify-center bg-inherit z-20 backdrop-blur-sm">
                 <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-sm truncate" [class.text-red-400]="machine.status !== 'Activo'" [class.text-white]="machine.status === 'Activo'">{{ machine.name }}</span>
                    <span class="w-2 h-2 rounded-full" 
                          [ngClass]="{
                            'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]': machine.status === 'Activo',
                            'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]': machine.status === 'Mantenimiento',
                            'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]': machine.status === 'Detenida',
                            'bg-slate-500': machine.status === 'Sin Operario' || machine.status === 'Inactivo'
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
                                  'text-emerald-400 border-emerald-500/30': machine.status === 'Activo',
                                  'text-slate-400 border-white/10': machine.status === 'Inactivo' || machine.status === 'Sin Operario',
                                  'text-amber-400 border-amber-500/30': machine.status === 'Mantenimiento',
                                  'text-red-400 border-red-500/30': machine.status === 'Detenida'
                               }">
                          <option value="Activo" class="bg-slate-900 text-emerald-400">ACTIVO</option>
                          <option value="Inactivo" class="bg-slate-900 text-slate-400">INACTIVO</option>
                          <option value="Mantenimiento" class="bg-slate-900 text-amber-400">MANTENIMIENTO</option>
                          <option value="Sin Operario" class="bg-slate-900 text-slate-400">SIN OPERARIO</option>
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
                 <div *ngIf="machine.status !== 'Activo'" 
                      class="absolute inset-0 maintenance-pattern z-0 flex items-center justify-center">
                      <div class="bg-black/60 px-3 py-0.5 rounded-full border backdrop-blur-sm shadow-lg"
                           [ngClass]="{
                              'border-white/10 text-slate-400': machine.status === 'Inactivo' || machine.status === 'Sin Operario',
                              'border-amber-500/30 text-amber-500': machine.status === 'Mantenimiento',
                              'border-red-500/30 text-red-500': machine.status === 'Detenida'
                           }">
                        <span class="text-[10px] font-bold uppercase tracking-tighter">{{ machine.status }}</span>
                      </div>
                 </div>

                 <!-- Jobs -->
                 <ng-container *ngIf="machine.status === 'Activo'">
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

      <!-- JOB DETAILS / ASSIGNMENT MODAL -->
      <div
        *ngIf="showJobModal"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-[#020817]/80 px-4 py-6 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-job-modal-title"
        (click)="closeJobModal()">
        <main
          class="schedule-assignment-shell flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,191,165,0.22)] md:flex-row"
          (click)="$event.stopPropagation()">
          <aside class="schedule-assignment-sidebar flex w-full flex-col gap-8 border-b border-white/10 p-6 md:w-[18.5rem] md:border-b-0 md:border-r md:p-8">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.35em] text-[#26C6DA]/80">Industrial Print OS</p>
              <h3 class="schedule-assignment-heading mt-3 text-xl font-extrabold tracking-tight text-[#26C6DA]">ASIGNAR PRODUCCION</h3>
              <p class="mt-2 text-xs font-medium leading-relaxed text-slate-400">
                Configure los parametros tecnicos y humanos para el nuevo ciclo operativo.
              </p>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Validacion de Recursos</span>
                <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300">
                  {{ isEditing ? 'Edicion' : 'Nuevo' }}
                </span>
              </div>

              <article class="schedule-assignment-card schedule-assignment-card--info flex items-start gap-3 rounded-2xl p-4">
                <span class="material-symbols-outlined schedule-assignment-symbol mt-0.5 text-lg text-[#BB86FC]">info</span>
                <div>
                  <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-100">{{ resourceValidationTitle }}</p>
                  <p class="mt-1 text-[11px] leading-relaxed text-slate-400">{{ resourceValidationDescription }}</p>

                  <button
                    type="button"
                    class="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] transition-all"
                    [disabled]="!isEditing"
                    [ngClass]="isEditing
                      ? 'bg-[#00BFA5] text-[#071B31] shadow-[0_6px_16px_rgba(0,191,165,0.24)] hover:bg-[#26C6DA]'
                      : 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'"
                    (click)="openValidationWizard()">
                    Validar
                  </button>
                </div>
              </article>

              <article [ngClass]="scheduleAvailabilityCardClass" class="schedule-assignment-card flex items-start gap-3 rounded-2xl p-4">
                <span class="material-symbols-outlined schedule-assignment-symbol mt-0.5 text-lg" [ngClass]="scheduleAvailabilityIconClass">
                  {{ scheduleAvailabilityIcon }}
                </span>
                <div>
                  <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-100">{{ scheduleAvailabilityTitle }}</p>
                  <p class="mt-1 text-[11px] leading-relaxed text-slate-400">{{ scheduleAvailabilityDescription }}</p>
                </div>
              </article>
            </div>

            <div class="mt-auto border-t border-white/10 pt-6">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <span class="material-symbols-outlined schedule-assignment-symbol text-[#00BFA5]">qr_code_scanner</span>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Terminal ID</p>
                  <p class="mt-1 text-xs font-semibold text-slate-200">{{ selectedMachineForModal?.name || 'Terminal sin asignar' }}</p>
                  <p class="text-xs font-mono text-[#00BFA5]">{{ selectedMachineForModal?.code || 'NODE-PRT-04-A' }}</p>
                </div>
              </div>
            </div>
          </aside>

          <form class="schedule-assignment-form custom-scrollbar flex-1 overflow-y-auto p-6 text-slate-100 md:p-8" (ngSubmit)="saveJob()" novalidate>
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">{{ selectedArea }} / {{ selectedShift }}</p>
                <h2 id="schedule-job-modal-title" class="schedule-assignment-heading mt-3 text-2xl font-extrabold tracking-tight text-white">
                  {{ isEditing ? 'Detalle de Asignacion' : 'Asignar Nueva Produccion' }}
                </h2>
                <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                  Configure la orden, la maquina y el bloque horario antes de confirmar produccion.
                </p>
              </div>

              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
                aria-label="Cerrar modal de asignacion"
                (click)="closeJobModal()">
                <span class="material-symbols-outlined schedule-assignment-symbol">close</span>
              </button>
            </div>

            <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div class="space-y-2 md:col-span-2">
                <label class="schedule-assignment-label block text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400" for="planning-ot-input">
                  Buscador de Orden de Trabajo (OT)
                </label>
                <div class="group relative">
                  <span class="material-symbols-outlined schedule-assignment-symbol absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-[#00BFA5]">search</span>
                  <input
                    id="planning-ot-input"
                    name="ot"
                    type="text"
                    list="planning-ot-list"
                    autocomplete="off"
                    [(ngModel)]="currentJob.ot"
                    class="schedule-assignment-input w-full rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Ej: 999999 o cliente">
                  <datalist id="planning-ot-list">
                    <option *ngFor="let ot of workOrderSuggestions" [value]="ot.OT">
                      {{ ot['Razon Social'] || 'Cliente sin nombre' }} - {{ ot.descripcion || 'Sin descripcion' }}
                    </option>
                  </datalist>
                </div>
              </div>

              <div class="space-y-2 md:col-span-2">
                <label class="schedule-assignment-label block text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400" for="planning-machine-select">
                  Maquina Asignada
                </label>
                <div class="relative">
                  <select
                    id="planning-machine-select"
                    name="machineId"
                    [(ngModel)]="currentJob.machineId"
                    class="schedule-assignment-input w-full cursor-pointer appearance-none rounded-2xl px-4 py-3 pr-12 text-sm text-white outline-none">
                    <option value="" class="bg-slate-950 text-slate-300">Seleccione una maquina</option>
                    <option *ngFor="let m of filteredMachines" [value]="m.id" class="bg-slate-950 text-slate-100">
                      {{ m.name }} - {{ m.code }}
                    </option>
                  </select>
                  <span class="material-symbols-outlined schedule-assignment-symbol pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">expand_more</span>
                </div>
              </div>

              <div class="space-y-2">
                <label class="schedule-assignment-label block text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400" for="planning-start-input">
                  Inicio Programado
                </label>
                <input
                  id="planning-start-input"
                  name="startDateTime"
                  type="datetime-local"
                  [(ngModel)]="tempStartDateTime"
                  class="schedule-assignment-input w-full rounded-2xl px-4 py-3 text-sm text-slate-200 outline-none [color-scheme:dark]">
              </div>

              <div class="space-y-2">
                <label class="schedule-assignment-label block text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400" for="planning-duration-input">
                  Duracion Estimada
                </label>
                <div class="relative">
                  <input
                    id="planning-duration-input"
                    name="durationHours"
                    type="number"
                    min="0.5"
                    step="0.5"
                    [(ngModel)]="tempDurationHours"
                    class="schedule-assignment-input w-full rounded-2xl px-4 py-3 pr-20 text-sm text-white outline-none">
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Horas
                  </span>
                </div>
              </div>

              <div class="space-y-2 md:col-span-2">
                <label class="schedule-assignment-label block text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400" for="planning-operator-select">
                  Operador Responsable
                </label>
                <div class="relative">
                  <select
                    id="planning-operator-select"
                    name="operator"
                    [(ngModel)]="currentJob.operator"
                    class="schedule-assignment-input w-full cursor-pointer appearance-none rounded-2xl px-4 py-3 pr-12 text-sm text-white outline-none">
                    <option *ngFor="let operator of operatorSelectOptions" [value]="operator" class="bg-slate-950 text-slate-100">
                      {{ operator }}
                    </option>
                  </select>
                  <span class="material-symbols-outlined schedule-assignment-symbol pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">expand_more</span>
                </div>
              </div>

              <div class="space-y-2 md:col-span-2">
                <label class="schedule-assignment-label block text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400" for="planning-notes-input">
                  Notas de Produccion
                </label>
                <textarea
                  id="planning-notes-input"
                  name="description"
                  rows="4"
                  [(ngModel)]="currentJob.description"
                  class="schedule-assignment-input w-full resize-none rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Instrucciones especiales para el equipo de post-impresion..."></textarea>
              </div>
            </div>

            <div class="mt-10 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                class="px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-[#BB86FC]"
                (click)="closeJobModal()">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSavingJob"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#26C6DA] to-[#00BFA5] px-8 py-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#071B31] shadow-[0_4px_20px_rgba(0,191,165,0.4)] transition-all hover:shadow-[0_8px_24px_rgba(38,198,218,0.5)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
                {{ isSavingJob ? 'Guardando Produccion' : 'Confirmar Produccion' }}
                <span class="material-symbols-outlined schedule-assignment-symbol text-base" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;">send</span>
              </button>
            </div>
          </form>
        </main>
      </div>

      <!-- RESOURCE VALIDATION MODAL -->
      <div
        *ngIf="showValidationModal"
        class="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-validation-title"
        (click)="closeValidationWizard()">
        <section
          class="glassmorphism-card w-full max-w-2xl rounded-[28px] border border-white/15 p-6 shadow-2xl shadow-black/50"
          (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-[#26C6DA]/80">Validacion Asistida</p>
              <h2 id="schedule-validation-title" class="mt-3 text-2xl font-bold tracking-tight text-white">
                Validacion de recursos para OT #{{ currentJob.ot || 'Pendiente' }}
              </h2>
              <p class="mt-2 text-sm text-slate-400">
                Revise cada punto critico antes de liberar la maquina para produccion.
              </p>
            </div>

            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
              aria-label="Cerrar validacion"
              (click)="closeValidationWizard()">
              <span class="material-symbols-outlined schedule-assignment-symbol">close</span>
            </button>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <div
              *ngFor="let step of validationSteps"
              class="flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-extrabold transition-all"
              [ngClass]="getStepClass(step)">
              {{ step }}
            </div>
          </div>

          <div class="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <ng-container [ngSwitch]="validationStep">
              <div *ngSwitchCase="1" class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined schedule-assignment-symbol text-2xl text-[#26C6DA]">inventory_2</span>
                  <div>
                    <p class="text-lg font-semibold text-white">Sustrato y material base</p>
                    <p class="text-sm text-slate-400">Confirme lote, cantidad disponible y liberacion de almacen.</p>
                  </div>
                </div>
                <p class="text-sm leading-relaxed text-slate-300">
                  Validar que el stock cubra la duracion programada y que no existan bloqueos por calidad o recepcion.
                </p>
              </div>

              <div *ngSwitchCase="2" class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined schedule-assignment-symbol text-2xl text-[#BB86FC]">view_in_ar</span>
                  <div>
                    <p class="text-lg font-semibold text-white">Clises y artes</p>
                    <p class="text-sm text-slate-400">Revise montaje, limpieza y version vigente para la OT.</p>
                  </div>
                </div>
                <p class="text-sm leading-relaxed text-slate-300">
                  Asegure que el juego de clises este completo y etiquetado para la maquina seleccionada.
                </p>
              </div>

              <div *ngSwitchCase="3" class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined schedule-assignment-symbol text-2xl text-amber-300">construction</span>
                  <div>
                    <p class="text-lg font-semibold text-white">Troqueles y herramental</p>
                    <p class="text-sm text-slate-400">Confirme troquel, ajuste de cuchillas y disponibilidad mecanica.</p>
                  </div>
                </div>
                <p class="text-sm leading-relaxed text-slate-300">
                  Verifique que el troquel asignado corresponda al producto y no tenga mantenimientos pendientes.
                </p>
              </div>

              <div *ngSwitchCase="4" class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined schedule-assignment-symbol text-2xl text-emerald-300">event_available</span>
                  <div>
                    <p class="text-lg font-semibold text-white">Ventana operativa</p>
                    <p class="text-sm text-slate-400">Revise solapes, responsable y liberacion de la maquina.</p>
                  </div>
                </div>
                <p class="text-sm leading-relaxed text-slate-300">
                  La OT quedara lista para programacion con la maquina {{ selectedMachineForModal?.name || 'seleccionada' }}.
                </p>
              </div>
            </ng-container>
          </div>

          <div class="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              class="px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-white"
              (click)="closeValidationWizard()">
              Volver
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#26C6DA] to-[#00BFA5] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#071B31] transition-all hover:brightness-110"
              (click)="validationStep < 4 ? nextValidationStep() : finishValidationWizard()">
              {{ validationStep < 4 ? 'Siguiente Paso' : 'Finalizar Validacion' }}
              <span class="material-symbols-outlined schedule-assignment-symbol text-base">
                {{ validationStep < 4 ? 'arrow_forward' : 'check_circle' }}
              </span>
            </button>
          </div>
        </section>
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
    .schedule-assignment-shell {
      background:
        radial-gradient(circle at top right, rgba(38, 198, 218, 0.14), transparent 35%),
        rgba(7, 27, 49, 0.76);
      backdrop-filter: blur(18px);
    }
    .schedule-assignment-sidebar {
      background: linear-gradient(135deg, rgba(7, 27, 49, 0.84) 0%, rgba(0, 191, 165, 0.12) 100%);
      backdrop-filter: blur(12px);
    }
    .schedule-assignment-form {
      background: linear-gradient(135deg, rgba(7, 27, 49, 0.72) 0%, rgba(38, 198, 218, 0.1) 100%);
      backdrop-filter: blur(12px);
    }
    .schedule-assignment-heading,
    .schedule-assignment-label {
      font-family: 'Manrope', var(--app-font-stack);
    }
    .schedule-assignment-input {
      background: rgba(7, 27, 49, 0.34);
      border: 1px solid rgba(38, 198, 218, 0.18);
      backdrop-filter: blur(8px);
      transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    }
    .schedule-assignment-input:focus {
      border-color: rgba(0, 191, 165, 0.9);
      box-shadow: 0 0 0 1px rgba(0, 191, 165, 0.4);
      background: rgba(7, 27, 49, 0.44);
    }
    .schedule-assignment-card {
      background: rgba(7, 27, 49, 0.42);
      border: 1px solid rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
    }
    .schedule-assignment-card--info {
      border-left: 3px solid #BB86FC;
    }
    .schedule-assignment-card--success {
      border-left: 3px solid #00BFA5;
    }
    .schedule-assignment-card--warning {
      border-left: 3px solid #F59E0B;
    }
    .schedule-assignment-card--neutral {
      border-left: 3px solid rgba(38, 198, 218, 0.45);
    }
    .schedule-assignment-symbol {
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    }
  `]
})
export class ScheduleComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  qualityService = inject(QualityService);
  fileExport = inject(FileExportService);
  notifications = inject(NotificationService);
  adminService = inject(AdminService);
  private zone = inject(NgZone);
  private changeDetectorRef = inject(ChangeDetectorRef);

  readonly scheduleContainer = viewChild<ElementRef>('scheduleContainer');
  selectedShift: 'DIA' | 'NOCHE' = this.getCurrentShift();
  selectedArea: 'IMPRESION' | 'TROQUELADO' | 'REBOBINADO' = 'IMPRESION';
  _jobs: ScheduledJob[] = [];
  showJobModal = false;
  isEditing = false;
  currentJob: Partial<ScheduledJob> = {};
  showValidationModal = false;
  validationStep = 1;
  tempStartDateTime = '';
  tempDurationHours = 0;
  nowLineTimer: ReturnType<typeof window.setInterval> | null = null;
  currentLinePosition = '0px';
  showNowLine = true;
  isSavingJob = false;
  isScheduleLoading = true;
  readonly validationSteps = [1, 2, 3, 4];
  private scheduleHydrationPending = false;
  private readonly scheduleMachineSyncEffect = effect(() => {
    const machineCount = this.state.adminMachines().length;
    if (!this.scheduleHydrationPending || machineCount === 0) return;

    this.scheduleHydrationPending = false;
    queueMicrotask(() => {
      void this.refreshScheduleFromBackend();
    });
  });

  async ngOnInit() {
    this.updateNowLine();
    await this.refreshScheduleFromBackend();
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
    const active = machines.filter(m => m.status === 'Activo').length;
    return Math.round((active / machines.length) * 100);
  }

  get kpiPendingJobs() {
    return this.ordersService.ots.filter(ot => ot.Estado_pedido === 'PENDIENTE').length;
  }
  // -----------------------------

  get filteredMachines() {
     let typeFilter = 'Impresión';
     if (this.selectedArea === 'TROQUELADO') typeFilter = 'Troquelado';
     if (this.selectedArea === 'REBOBINADO') typeFilter = 'Rebobinado';
     return this.state.adminMachines().filter(m => m.type === typeFilter);
  }
  get timeSlots() { return this.selectedShift === 'DIA' ? ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'] : ['19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00']; }
  setShift(shift: 'DIA' | 'NOCHE') { this.selectedShift = shift; this.updateNowLine(); }
  trackByMachine(index: number, item: Machine) { return item.id; }
  getJobsForMachine(machineId: string): ScheduledJob[] {
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
  async updateMachineStatus(machine: Machine | undefined, newStatus: Machine['status']) {
    if (!machine || machine.status === newStatus) return;

    const previousStatus = machine.status;
    this.state.updateMachine({ ...machine, status: newStatus });

    try {
      await this.adminService.updateMachine({ ...machine, status: newStatus });
    } catch (error: any) {
      this.state.updateMachine({ ...machine, status: previousStatus });
      this.notifications.showError(error?.message || 'No se pudo actualizar el estado de la maquina.');
    }
  }
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
  calculateLeft(job: ScheduledJob): number {
     const startHour = parseInt(job.start.split(':')[0]);
     const startMin = parseInt(job.start.split(':')[1]);
     const offset = this.getHourOffset(startHour, startMin);
     if (offset < 0) return -100;
     return (offset / 12) * 100;
   }
  calculateWidth(job: ScheduledJob): number { return ((job.duration / 60) / 12) * 100; }
  updateNowLine() {
    const now = new Date();
    const offset = this.getHourOffset(now.getHours(), now.getMinutes());

    this.commitScheduleViewUpdate(() => {
      if (offset >= 0 && offset <= 12) {
        this.currentLinePosition = `calc((1 - ${offset / 12}) * 16rem + ${(offset / 12) * 100}%)`;
        this.showNowLine = true;
        return;
      }

      this.showNowLine = false;
    });
  }
  private commitScheduleViewUpdate(callback: () => void) {
    const applyUpdate = () => {
      callback();
      this.changeDetectorRef.markForCheck();
    };

    if (NgZone.isInAngularZone()) {
      applyUpdate();
      return;
    }

    this.zone.run(() => {
      applyUpdate();
    });
  }
  private getCurrentLocalDate() {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
  private getCurrentShift(): 'DIA' | 'NOCHE' {
    const currentHour = new Date().getHours();
    return currentHour >= 7 && currentHour <= 18 ? 'DIA' : 'NOCHE';
  }
  private getDefaultModalTime() {
    return this.selectedShift === 'DIA' ? '08:00' : '20:00';
  }
  private composeLocalDateTime(date?: string, time?: string) {
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || '').trim())
      ? String(date).trim()
      : this.getCurrentLocalDate();
    const normalizedTime = /^\d{2}:\d{2}$/.test(String(time || '').trim())
      ? String(time).trim()
      : this.getDefaultModalTime();
    return `${normalizedDate}T${normalizedTime}`;
  }
  private getJobColor(seed: string) {
    const palette = ['#3b82f6', '#10b981', '#6366f1', '#0d9488', '#f59e0b', '#ec4899'];
    const normalized = String(seed || '').trim().toUpperCase();
    const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }
  private resolveMachineForWorkOrder(ot: Partial<OT>): Machine | null {
    const allMachines = this.state.adminMachines();
    const byId = allMachines.find((machine) => machine.id === String(ot.scheduleMachineId || '').trim());
    if (byId) return byId;

    const code = String(ot.codmaquina || '').trim().toUpperCase();
    if (code) {
      const byCode = allMachines.find((machine) => String(machine.code || '').trim().toUpperCase() === code);
      if (byCode) return byCode;
    }

    const name = String(ot.maquina || '').trim().toUpperCase();
    if (name) {
      const byName = allMachines.find((machine) => String(machine.name || '').trim().toUpperCase() === name);
      if (byName) return byName;
    }

    return null;
  }
  private mapWorkOrderToScheduledJob(ot: Partial<OT>): ScheduledJob | null {
    const machine = this.resolveMachineForWorkOrder(ot);
    const startTime = String(ot.scheduleStartTime || '').trim();
    if (!machine || !startTime || !ot.OT) return null;

    const durationMinutes = Number(ot.scheduleDurationMinutes || 0);

    return {
      id: String((ot as any).id || ot.OT),
      ot: String(ot.OT || '').trim().toUpperCase(),
      client: String(ot['Razon Social'] || '').trim(),
      description: String(ot.scheduleNotes || ot.ObsDes || '').trim(),
      machineId: machine.id,
      start: startTime,
      scheduledDate: String(ot.fechaPrd || '').trim(),
      duration: durationMinutes > 0 ? durationMinutes : 60,
      color: this.getJobColor(String(ot.OT || machine.code)),
      operator: String(ot.scheduleOperator || '').trim(),
      meters: Number(ot.total_mtl || 0) || 0,
      workOrderId: String((ot as any).id || ''),
    };
  }
  private hasPersistedSchedule(ot: Partial<OT>) {
    return Boolean(String(ot.scheduleStartTime || '').trim())
      && Boolean(String(ot.scheduleMachineId || ot.codmaquina || ot.maquina || '').trim());
  }
  private async refreshScheduleFromBackend() {
    this.commitScheduleViewUpdate(() => {
      this.isScheduleLoading = true;
    });

    try {
      const managementOrders = await this.ordersService.reloadManagementOrders();
      const backendJobs = managementOrders
        .map((ot) => this.mapWorkOrderToScheduledJob(ot))
        .filter((job): job is ScheduledJob => Boolean(job));
      const hasPersistedSchedule = managementOrders.some((ot) => this.hasPersistedSchedule(ot));

      this.scheduleHydrationPending = hasPersistedSchedule
        && !backendJobs.length
        && this.state.adminMachines().length === 0;

      this.commitScheduleViewUpdate(() => {
        this._jobs = backendJobs;
        this.isScheduleLoading = false;
      });
    } catch {
      this.scheduleHydrationPending = false;
      this.commitScheduleViewUpdate(() => {
        this._jobs = [];
        this.isScheduleLoading = false;
      });
    }
  }
  get workOrderSuggestions(): Partial<OT>[] {
    const search = String(this.currentJob?.ot || '').trim().toUpperCase();
    const merged = [...this.ordersService.ots, ...this.ordersService.internalDatabase];
    const seen = new Set<string>();
    const suggestions: Partial<OT>[] = [];

    for (const ot of merged) {
      const otNumber = String(ot.OT || '').trim().toUpperCase();
      if (!otNumber || seen.has(otNumber)) continue;

      const matchesSearch = !search
        || otNumber.includes(search)
        || String(ot['Razon Social'] || '').trim().toUpperCase().includes(search)
        || String(ot.descripcion || '').trim().toUpperCase().includes(search);

      if (!matchesSearch) continue;

      suggestions.push(ot);
      seen.add(otNumber);

      if (suggestions.length === 8) break;
    }

    return suggestions;
  }
  get selectedMachineForModal(): Machine | null {
    return this.state.adminMachines().find((machine) => machine.id === this.currentJob.machineId) || null;
  }
  get operatorOptions(): string[] {
    const scheduleArea = this.getSelectedOperatorArea();
    const dynamicUsers = this.state.adminUsers()
      .filter((user) => this.isAssignableScheduleUser(user, scheduleArea))
      .map((user) => String(user.name || '').trim())
      .filter(Boolean);
    const scheduledOperators = this._jobs
      .map((job) => String(job.operator || '').trim())
      .filter(Boolean);
    const hostName = String(this.state.userName() || '').trim();

    const unique = [...new Set([
      ...dynamicUsers,
      ...scheduledOperators,
      ...(hostName ? [hostName] : []),
    ])];

    return unique.sort((left, right) => left.localeCompare(right, 'es'));
  }
  get operatorSelectOptions() {
    const currentOperator = String(this.currentJob.operator || '').trim();
    return currentOperator && !this.operatorOptions.includes(currentOperator)
      ? [currentOperator, ...this.operatorOptions]
      : this.operatorOptions;
  }
  get resourceValidationTitle(): string {
    return String(this.currentJob?.ot || '').trim() ? 'OT PENDIENTE DE VALIDAR' : 'INGRESE UNA OT';
  }
  get resourceValidationDescription(): string {
    if (!String(this.currentJob?.ot || '').trim()) {
      return 'Busque una orden de trabajo para revisar sustrato, clises y troqueles asociados.';
    }
    if (this.isEditing) {
      return 'Revise sustrato, clises y troqueles antes de confirmar cambios sobre una asignacion existente.';
    }
    return 'Requiere confirmacion de estado de sustrato, clises y troqueles antes de liberar la orden.';
  }
  get currentScheduleWindow() {
    if (!this.tempStartDateTime || !Number.isFinite(this.tempDurationHours) || this.tempDurationHours <= 0) return null;
    const [datePart, timePart = ''] = this.tempStartDateTime.split('T');
    const [hours, minutes] = timePart.split(':').map((value) => Number(value) || 0);
    if (!datePart || !timePart) return null;
    const startMinutes = (hours * 60) + minutes;
    const durationMinutes = Math.round(this.tempDurationHours * 60);
    return {
      date: datePart,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
    };
  }
  get currentScheduleConflict(): ScheduledJob | null {
    const window = this.currentScheduleWindow;
    if (!window || !this.currentJob?.machineId) return null;

    return this._jobs.find((job) => {
      if (job.machineId !== this.currentJob.machineId) return false;
      if (this.isEditing && job.id === this.currentJob.id) return false;
      if ((job.scheduledDate || this.getCurrentLocalDate()) !== window.date) return false;

      const [hours, minutes] = String(job.start || '00:00').split(':').map((value) => Number(value) || 0);
      const jobStart = (hours * 60) + minutes;
      const jobEnd = jobStart + Number(job.duration || 0);

      return window.startMinutes < jobEnd && window.endMinutes > jobStart;
    }) || null;
  }
  get scheduleAvailabilityIcon(): string {
    if (this.currentScheduleConflict) return 'warning';
    if (!this.currentJob?.machineId) return 'precision_manufacturing';
    if (!this.currentScheduleWindow) return 'schedule';
    return 'check_circle';
  }
  get scheduleAvailabilityIconClass(): string {
    if (this.currentScheduleConflict) return 'text-amber-300';
    if (!this.currentJob?.machineId || !this.currentScheduleWindow) return 'text-[#26C6DA]';
    return 'text-[#00BFA5]';
  }
  get scheduleAvailabilityCardClass(): string {
    if (this.currentScheduleConflict) return 'schedule-assignment-card schedule-assignment-card--warning';
    if (!this.currentJob?.machineId || !this.currentScheduleWindow) return 'schedule-assignment-card schedule-assignment-card--neutral';
    return 'schedule-assignment-card schedule-assignment-card--success';
  }
  get scheduleAvailabilityTitle(): string {
    if (!this.currentJob?.machineId) return 'SELECCIONE UNA MAQUINA';
    if (!this.currentScheduleWindow) return 'DEFINA EL HORARIO';
    if (this.currentScheduleConflict) return 'CONFLICTO DETECTADO';
    return 'SIN CONFLICTOS DETECTADOS';
  }
  get scheduleAvailabilityDescription(): string {
    if (!this.currentJob?.machineId) {
      return 'Seleccione una maquina para revisar disponibilidad y detectar posibles solapes.';
    }
    if (!this.currentScheduleWindow) {
      return 'Ingrese inicio y duracion para validar la ventana operativa de la maquina seleccionada.';
    }
    if (this.currentScheduleConflict) {
      return `Se cruza con la OT #${this.currentScheduleConflict.ot} programada desde las ${this.currentScheduleConflict.start}.`;
    }
    return 'La maquina seleccionada tiene ventana libre en el horario programado.';
  }
  closeJobModal() { this.showJobModal = false; }
  openAddModal() {
    this.isEditing = false;
    const defaultTime = this.getDefaultModalTime();
    this.tempStartDateTime = this.composeLocalDateTime(undefined, defaultTime);
    this.tempDurationHours = 1; 
    this.currentJob = {
      start: defaultTime,
      duration: 60,
      scheduledDate: this.getCurrentLocalDate(),
      color: '#3b82f6',
      machineId: this.filteredMachines[0]?.id || '',
      operator: this.operatorOptions[0] || this.state.userName(),
      meters: 0,
    };
    this.showJobModal = true;
  }
  openEditModal(job: ScheduledJob) {
    this.isEditing = true; this.currentJob = { ...job };
    this.tempStartDateTime = this.composeLocalDateTime(job.scheduledDate, job.start);
    this.tempDurationHours = (job.duration || 60) / 60;
    this.showJobModal = true;
  }
  async saveJob() {
    if (!String(this.currentJob.ot || '').trim()) {
      this.notifications.showWarning('Ingrese una OT antes de confirmar la asignacion.');
      return;
    }
    if (!this.currentJob.machineId) {
      this.notifications.showWarning('Seleccione una maquina para programar la produccion.');
      return;
    }
    if (!this.tempStartDateTime) {
      this.notifications.showWarning('Defina la fecha y hora de inicio para continuar.');
      return;
    }
    if (!Number.isFinite(this.tempDurationHours) || this.tempDurationHours <= 0) {
      this.notifications.showWarning('Ingrese una duracion estimada valida.');
      return;
    }
    if (this.currentScheduleConflict) {
      this.notifications.showWarning(`La maquina ya tiene la OT ${this.currentScheduleConflict.ot} en ese rango horario.`);
      return;
    }

    const selectedMachine = this.selectedMachineForModal;
    if (!selectedMachine) {
      this.notifications.showWarning('Seleccione una maquina valida para programar la produccion.');
      return;
    }

    const normalizedOt = String(this.currentJob.ot || '').trim().toUpperCase();
    const [scheduledDate, scheduledTime = this.getDefaultModalTime()] = this.tempStartDateTime.split('T');
    const durationMinutes = Math.round(this.tempDurationHours * 60);

    this.isSavingJob = true;

    try {
      const existingOt = await this.ordersService.findWorkOrderByOtNumber(normalizedOt);
      if (!(existingOt as any)?.id) {
        this.notifications.showWarning(`La OT ${normalizedOt} no existe en backend. Seleccione una OT registrada antes de programarla.`);
        return;
      }

      await this.ordersService.saveOt({
        ...existingOt,
        OT: normalizedOt,
        fechaPrd: scheduledDate,
        maquina: selectedMachine.name,
        codmaquina: selectedMachine.code,
        Linea_produccion: this.selectedArea,
        Estado_pedido: 'PLANIFICADO',
        scheduleMachineId: selectedMachine.id,
        scheduleStartTime: scheduledTime,
        scheduleDurationMinutes: durationMinutes,
        scheduleOperator: String(this.currentJob.operator || '').trim(),
        scheduleNotes: String(this.currentJob.description || '').trim(),
        scheduleDateTime: this.tempStartDateTime,
      }, { activate: true });

      await this.refreshScheduleFromBackend();
      this.showJobModal = false;
      this.notifications.showSuccess(this.isEditing ? 'Asignacion actualizada correctamente.' : 'Produccion programada correctamente.');
    } catch (error: any) {
      this.notifications.showError(error?.message || 'No se pudo guardar la programacion de produccion.');
    } finally {
      this.isSavingJob = false;
    }
  }
  openValidationWizard() {
    if (!this.isEditing) return;
    this.showJobModal = false;
    this.validationStep = 1;
    this.showValidationModal = true;
  }
  nextValidationStep() { if (this.validationStep < 4) this.validationStep++; }
  async finishValidationWizard() {
    this.showValidationModal = false;
    const selectedMachine = this.state.adminMachines().find(m => m.id === this.currentJob.machineId);
    if (selectedMachine) await this.updateMachineStatus(selectedMachine, 'Activo');
    this.showJobModal = true;
  }
  closeValidationWizard() {
    this.showValidationModal = false;
    this.showJobModal = true;
  }
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

  private getSelectedOperatorArea(): OperatorProductionArea {
    if (this.selectedArea === 'TROQUELADO') return 'Troquelado';
    if (this.selectedArea === 'REBOBINADO') return 'Rebobinado';
    return 'Impresión';
  }

  private isAssignableScheduleUser(
    user: AppUser,
    scheduleArea: OperatorProductionArea,
  ) {
    if (!user.active || !String(user.name || '').trim()) {
      return false;
    }

    const roleToken = this.normalizeScheduleToken(
      user.roleCode || user.roleName || user.role,
    );

    if (roleToken.includes('SISTEM') || roleToken.includes('AUDIT')) {
      return false;
    }

    const assignedAreas = Array.isArray(user.assignedAreas)
      ? user.assignedAreas.filter(Boolean)
      : [];

    if (!assignedAreas.length) {
      return true;
    }

    return assignedAreas.some((area) => isOperatorAreaMatch(scheduleArea, area));
  }

  private normalizeScheduleToken(value: unknown) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }
}
