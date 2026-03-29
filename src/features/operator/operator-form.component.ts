
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';
import { StateService } from '../../services/state.service';
import { AuditService } from '../../services/audit.service';
import { NotificationService } from '../../services/notification.service';
import { ProductionService } from '../reports/services/production.service';

@Component({
  selector: 'app-operator-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

    <div class="bg-gradient-mesh font-sans min-h-screen w-full flex flex-col relative overflow-hidden selection:bg-blue-500 selection:text-white text-gray-100">
      
      <!-- Background Effects -->
      <div class="fixed inset-0 z-0 pointer-events-none">
          <div class="grid-overlay absolute inset-0 opacity-40"></div>
          <div class="orb orb-form"></div>
          <div class="scanline absolute inset-0 z-50 pointer-events-none opacity-10"></div>
      </div>

      <!-- Header -->
      <header class="w-full glass-panel h-24 flex items-center justify-between px-8 z-50 sticky top-0 border-b border-white/5">
         <div class="flex items-center gap-6">
            <button (click)="goBack()" class="w-14 h-14 rounded-2xl glass-button flex items-center justify-center group active:scale-95 cursor-pointer transition-all duration-300">
               <span class="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors text-2xl">arrow_back</span>
            </button>
            <div class="flex flex-col">
               <h1 class="text-xl font-tech font-bold uppercase tracking-[0.15em] text-white leading-none mb-1">
                  REPORTE DE {{ typeName }}
               </h1>
               <div class="flex items-center gap-3 text-xs font-mono text-gray-400 tracking-widest">
                  <span class="text-blue-400 font-bold">{{ machineName }}</span>
                  <span class="text-gray-600">|</span>
                  <span>{{ state.currentShift() || 'TURNO' }}</span>
               </div>
            </div>
         </div>
      </header>

      <!-- Main Content -->
      <main class="flex-grow flex flex-col p-8 w-full max-w-6xl mx-auto relative z-10 pb-32">
         
         <div class="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
            
            <!-- Machine Status Bar -->
            <div class="p-6 border-b border-white/10 bg-white/[0.02] flex flex-col md:flex-row items-start md:items-center gap-5">
               <div class="flex items-center gap-5 flex-1">
                   <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                      <span class="material-symbols-outlined text-3xl">precision_manufacturing</span>
                   </div>
                   <div>
                      <p class="text-xs text-blue-300/70 font-tech font-bold uppercase tracking-widest mb-0.5">Máquina Activa</p>
                      <h2 class="text-2xl font-bold text-white tracking-tight">{{ machineName }}</h2>
                   </div>
               </div>

               <!-- IDENTIFIED OPERATOR -->
               <div class="w-full md:w-auto min-w-[250px]">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Operador Identificado</label>
                  <div class="rounded-xl bg-[#0a0f18] border border-white/10 px-4 py-2.5">
                      <div class="text-sm font-bold text-white">{{ state.activeOperatorName() }}</div>
                      <div class="text-[10px] font-mono text-blue-300/70">DNI {{ state.activeOperatorDni() }}</div>
                  </div>
               </div>
            </div>

            <!-- Step 1: Select OT -->
            <div class="p-10 border-b border-white/5 relative">
               <label class="block text-sm font-tech font-bold text-blue-400 uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
                  <span class="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs text-blue-300 border border-blue-500/30">1</span>
                  Seleccionar Orden de Trabajo (OT)
               </label>
               
               <div class="relative group">
                  <span class="material-symbols-outlined absolute left-5 top-4 text-gray-500 group-focus-within:text-blue-400 transition-colors text-xl">search</span>
                  <input type="text" 
                     [(ngModel)]="otSearch"
                     (ngModelChange)="updateOtSearch($event)"
                     placeholder="ESCANEAR CÓDIGO O ESCRIBIR OT..." 
                     class="w-full pl-14 pr-4 py-4 bg-[#0a0f18] border border-white/10 rounded-2xl text-xl font-bold text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500/50 outline-none transition-all uppercase placeholder-gray-600 font-mono tracking-wide shadow-inner">
                  
                  <!-- Suggestions -->
                  <div *ngIf="showSuggestions && filteredOts.length > 0" class="absolute z-50 w-full bg-[#0a0f18] border border-white/10 rounded-2xl shadow-2xl mt-2 max-h-80 overflow-y-auto backdrop-blur-xl ring-1 ring-white/5">
                     <div *ngFor="let ot of filteredOts" (click)="selectOt(ot)" class="p-5 hover:bg-blue-600/10 cursor-pointer border-b border-white/5 last:border-0 flex flex-col group transition-colors">
                        <div class="flex justify-between items-center mb-1">
                           <span class="font-mono font-bold text-blue-400 text-lg group-hover:text-blue-300">#{{ ot.OT }}</span>
                           <span class="text-[10px] font-bold bg-white/5 px-2.5 py-1 rounded-md text-gray-400 border border-white/5 tracking-wide">{{ ot.Estado_pedido }}</span>
                        </div>
                        <div class="text-sm font-bold text-gray-200">{{ ot['Razon Social'] }}</div>
                        <div class="text-xs text-gray-500 truncate mt-1">{{ ot.descripcion }}</div>
                     </div>
                  </div>
               </div>

               <!-- Selected OT Card -->
               <div *ngIf="selectedOt" class="mt-8 glass-panel rounded-2xl p-6 border border-blue-500/30 flex flex-col md:flex-row gap-8 justify-between animate-fadeIn relative overflow-hidden group">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                  <div class="flex-1 pl-2">
                     <div class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5">Cliente</div>
                     <div class="font-bold text-white text-xl tracking-wide mb-3">{{ selectedOt['Razon Social'] }}</div>
                     
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-white/5">
                        <div>
                            <div class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5">Producto</div>
                            <div class="text-sm text-gray-300 leading-relaxed font-light">{{ selectedOt.descripcion || selectedOt.impresion }}</div>
                        </div>
                        
                        <!-- ITEM / CLISE / TROQUEL INPUT -->
                        <div>
                            <ng-container *ngIf="type === 'print'">
                                <div class="space-y-4">
                                    <div>
                                        <label class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5 block">Item / Cliché Ref.</label>
                                        <input type="text" [(ngModel)]="formData.cliseItem" class="glass-input w-full px-3 py-1.5 rounded-lg text-sm text-white border border-white/10 bg-[#0a0f18] focus:border-blue-500 outline-none placeholder-gray-600" placeholder="Código de Item/Cliché">
                                    </div>

                                    <div class="rounded-xl border border-white/10 bg-[#0a0f18]/70 p-4 space-y-4">
                                        <div>
                                            <label class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5 block">Tipo de Troquel</label>
                                            <select [(ngModel)]="formData.dieType" class="glass-input w-full px-3 py-2 rounded-lg text-sm text-white border border-white/10 bg-[#0a0f18] focus:border-blue-500 outline-none">
                                                <option value="">Selecciona el tipo</option>
                                                <option *ngFor="let option of printDieTypes" [value]="option.value">{{ option.label }}</option>
                                            </select>
                                        </div>

                                        <div *ngIf="formData.dieType" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5 block">
                                                    {{ isMagneticDieSelected ? 'Serie del Troquel' : 'Serie del Troquel (Opcional)' }}
                                                </label>
                                                <input type="text" [(ngModel)]="formData.dieSeries" class="glass-input w-full px-3 py-2 rounded-lg text-sm text-white border border-white/10 bg-[#0a0f18] focus:border-blue-500 outline-none placeholder-gray-600 uppercase" placeholder="Ej: TR-00125">
                                            </div>

                                            <div *ngIf="isFlatbedOrSolidDieSelected">
                                                <label class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5 block">Ubicación del Troquel (Opcional)</label>
                                                <input type="text" [(ngModel)]="formData.dieLocation" class="glass-input w-full px-3 py-2 rounded-lg text-sm text-white border border-white/10 bg-[#0a0f18] focus:border-blue-500 outline-none placeholder-gray-600 uppercase" placeholder="Ej: RACK-A1">
                                            </div>
                                        </div>

                                        <p class="text-[10px] text-slate-500 leading-relaxed">
                                            Magnético: requiere serie.
                                            Plano o sólido: requiere serie o ubicación.
                                        </p>
                                    </div>
                                </div>
                            </ng-container>
                            
                            <ng-container *ngIf="type === 'diecut'">
                                <label class="text-[10px] text-blue-300/70 font-tech font-bold uppercase tracking-wider mb-1.5 block">Troquel (Serie)</label>
                                <input type="text" [(ngModel)]="formData.dieSeries" class="glass-input w-full px-3 py-1.5 rounded-lg text-sm text-white border border-white/10 bg-[#0a0f18] focus:border-blue-500 outline-none placeholder-gray-600 uppercase" placeholder="Serie del Troquel">
                            </ng-container>
                        </div>
                     </div>
                  </div>
                  
                  <!-- ESTADO PRODUCCION SELECTOR -->
                  <div class="bg-[#0a0f18]/60 p-5 rounded-xl border border-white/10 min-w-[200px] flex flex-col justify-center gap-3 shadow-inner">
                     <div class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Estado Producción</div>
                     <div class="flex gap-2">
                        <button (click)="formData.productionStatus = 'PARCIAL'" 
                           class="flex-1 py-2 rounded text-xs font-bold transition-all border"
                           [ngClass]="formData.productionStatus === 'PARCIAL' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'">
                           PARCIAL
                        </button>
                        <button (click)="formData.productionStatus = 'TOTAL'"
                           class="flex-1 py-2 rounded text-xs font-bold transition-all border"
                           [ngClass]="formData.productionStatus === 'TOTAL' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'">
                           TOTAL
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Step 2: Form Data -->
            <div class="p-10 transition-all duration-500" [class.opacity-30]="!selectedOt" [class.pointer-events-none]="!selectedOt" [class.blur-sm]="!selectedOt">
               
               <!-- IMPRESIÓN FORM (MULTI-ACTIVITY) -->
               <div *ngIf="type === 'print'" class="animate-fadeIn">
                  <!-- (Existing Print Content - Unchanged) -->
                  <!-- Add Activity Card -->
                  <div class="bg-[#0a0f18]/60 border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
                      <div class="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                      
                      <h3 class="text-sm font-tech font-bold text-blue-300 uppercase tracking-widest mb-5 flex items-center gap-2">
                          <span class="material-symbols-outlined text-lg">playlist_add</span> 
                          Agregar Registro de Actividad
                      </h3>
                      
                      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                          <!-- Actividad -->
                          <div class="lg:col-span-4">
                              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Tipo de Actividad</label>
                              <div class="relative">
                                  <select [(ngModel)]="currentActivity.type" class="glass-input w-full px-4 py-3 rounded-xl text-sm font-bold text-white outline-none bg-[#0a0f18] border border-white/10 appearance-none cursor-pointer focus:border-blue-500 transition-colors shadow-inner">
                                      <option class="bg-[#0a0f18]" *ngFor="let act of printActivities" [value]="act">{{ act }}</option>
                                  </select>
                                  <span class="absolute right-3 top-3.5 pointer-events-none text-gray-500 material-symbols-outlined text-lg">expand_more</span>
                              </div>
                          </div>

                          <!-- Horas -->
                          <div class="lg:col-span-2">
                              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Hora Inicio</label>
                              <input type="time" [(ngModel)]="currentActivity.startTime" (input)="updateCurrentActivityTime('startTime', $event)" class="glass-input w-full px-3 py-3 rounded-xl text-sm font-mono font-bold text-white outline-none bg-[#0a0f18] border border-white/10 text-center focus:border-blue-500 transition-colors shadow-inner">
                          </div>
                          <div class="lg:col-span-2">
                              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Hora Fin</label>
                              <input type="time" [(ngModel)]="currentActivity.endTime" (input)="updateCurrentActivityTime('endTime', $event)" class="glass-input w-full px-3 py-3 rounded-xl text-sm font-mono font-bold text-white outline-none bg-[#0a0f18] border border-white/10 text-center focus:border-blue-500 transition-colors shadow-inner">
                          </div>

                          <!-- Metros -->
                          <div class="lg:col-span-2">
                              <label class="block text-[10px] font-bold text-emerald-400 uppercase mb-2 ml-1">Metros</label>
                              <input type="number" [(ngModel)]="currentActivity.meters" (input)="updateCurrentActivityMeters($event)" class="glass-input w-full px-4 py-3 rounded-xl text-sm font-mono font-bold text-emerald-400 outline-none bg-[#0a0f18] border border-white/10 text-right focus:border-emerald-500 transition-colors shadow-inner placeholder-gray-700" placeholder="0">
                          </div>

                          <!-- Add Button -->
                          <div class="lg:col-span-2">
                              <button (click)="addActivity()" [disabled]="!isValidActivity()" class="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95 border border-blue-400/20">
                                  <span class="material-symbols-outlined text-lg font-bold">add</span> 
                                  Agregar
                              </button>
                          </div>
                      </div>
                  </div>

                  <!-- Activity List Table -->
                  <div class="mb-8 rounded-2xl border border-white/10 bg-[#0a0f18]/30 overflow-hidden shadow-xl" *ngIf="reportActivities.length > 0">
                      <table class="w-full text-sm text-left">
                          <thead class="bg-[#020408]/80 text-gray-400 font-bold uppercase text-[10px] tracking-widest backdrop-blur-sm border-b border-white/5">
                              <tr>
                                  <th class="px-6 py-4">Actividad</th>
                                  <th class="px-6 py-4 text-center">Horario</th>
                                  <th class="px-6 py-4 text-center">Duración</th>
                                  <th class="px-6 py-4 text-right">Metros</th>
                                  <th class="px-6 py-4 text-center w-20"></th>
                              </tr>
                          </thead>
                          <tbody class="divide-y divide-white/5">
                              <tr *ngFor="let item of reportActivities; let i = index" class="hover:bg-white/5 transition-colors group">
                                  <td class="px-6 py-3 font-bold text-white flex items-center gap-3">
                                      <div class="w-1.5 h-1.5 rounded-full" [ngClass]="item.meters > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-600'"></div>
                                      {{ item.type }}
                                  </td>
                                  <td class="px-6 py-3 text-center font-mono text-gray-300 text-xs">{{ item.startTime }} - {{ item.endTime }}</td>
                                  <td class="px-6 py-3 text-center font-mono text-gray-500 text-xs">{{ calculateDuration(item.startTime, item.endTime) }}</td>
                                  <td class="px-6 py-3 text-right font-mono text-emerald-400 font-bold text-base">
                                      <span *ngIf="item.meters > 0">{{ item.meters | number }}</span>
                                      <span *ngIf="!item.meters" class="text-gray-600 text-xs">-</span>
                                  </td>
                                  <td class="px-6 py-3 text-center">
                                      <button (click)="removeActivity(i)" class="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                                          <span class="material-symbols-outlined text-lg">delete</span>
                                      </button>
                                  </td>
                              </tr>
                              <!-- Totals Row -->
                              <tr class="bg-blue-500/5 font-bold border-t border-blue-500/20">
                                  <td class="px-6 py-4 text-right text-blue-300 text-xs uppercase tracking-widest" colspan="3">Total Producción</td>
                                  <td class="px-6 py-4 text-right text-white font-mono text-xl drop-shadow-md">{{ totalMeters | number }} <span class="text-xs text-gray-500 font-normal">m</span></td>
                                  <td></td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

                  <div *ngIf="reportActivities.length === 0" class="text-center p-12 border-2 border-dashed border-white/10 rounded-2xl mb-8 bg-white/[0.02]">
                      <span class="material-symbols-outlined text-4xl text-gray-700 mb-2">playlist_add</span>
                      <p class="text-xs uppercase tracking-widest font-bold text-gray-500">No hay actividades registradas en este reporte</p>
                  </div>

                  <!-- General Obs -->
                  <div class="mb-8">
                      <label class="block text-xs font-tech font-bold text-gray-400 uppercase tracking-widest mb-3">Observaciones Generales</label>
                      <textarea [(ngModel)]="formData.observations" rows="3" class="glass-input w-full p-5 rounded-2xl text-sm text-gray-300 focus:border-blue-500 outline-none bg-[#0a0f18]/60 border border-white/10 resize-none placeholder-gray-600 transition-all focus:bg-[#0a0f18]" placeholder="Detalles adicionales, incidencias generales del turno..."></textarea>
                  </div>

                  <!-- TOOLING STATUS CHECK (New) -->
                  <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
                      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span class="material-symbols-outlined text-sm">fact_check</span> Verificación de Herramental
                      </h3>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <!-- Clise Status -->
                          <div>
                              <p class="text-[10px] text-gray-500 uppercase font-bold mb-2">Estado Cliché</p>
                              <div class="flex gap-2">
                                  <button (click)="formData.cliseStatus = 'OK'" class="flex-1 py-2 rounded-lg border text-xs font-bold transition-all" [ngClass]="formData.cliseStatus === 'OK' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-white/10 text-gray-500 hover:border-white/20'">OK</button>
                                  <button (click)="formData.cliseStatus = 'Desgaste'" class="flex-1 py-2 rounded-lg border text-xs font-bold transition-all" [ngClass]="formData.cliseStatus === 'Desgaste' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-white/10 text-gray-500 hover:border-white/20'">Desgaste</button>
                                  <button (click)="formData.cliseStatus = 'Dañado'" class="flex-1 py-2 rounded-lg border text-xs font-bold transition-all" [ngClass]="formData.cliseStatus === 'Dañado' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 text-gray-500 hover:border-white/20'">Dañado</button>
                              </div>
                          </div>
                          <!-- Die Status -->
                          <div>
                              <p class="text-[10px] text-gray-500 uppercase font-bold mb-2">Estado Troquel</p>
                              <div class="flex gap-2">
                                  <button (click)="formData.dieStatus = 'OK'" class="flex-1 py-2 rounded-lg border text-xs font-bold transition-all" [ngClass]="formData.dieStatus === 'OK' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-white/10 text-gray-500 hover:border-white/20'">OK</button>
                                  <button (click)="formData.dieStatus = 'Desgaste'" class="flex-1 py-2 rounded-lg border text-xs font-bold transition-all" [ngClass]="formData.dieStatus === 'Desgaste' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-white/10 text-gray-500 hover:border-white/20'">Desgaste</button>
                                  <button (click)="formData.dieStatus = 'Dañado'" class="flex-1 py-2 rounded-lg border text-xs font-bold transition-all" [ngClass]="formData.dieStatus === 'Dañado' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 text-gray-500 hover:border-white/20'">Dañado</button>
                              </div>
                          </div>
                      </div>
                  </div>

               </div>

               <!-- TROQUELADO FORM (NEW MULTI-ACTIVITY) -->
               <div *ngIf="type === 'diecut'" class="animate-fadeIn">
                  
                  <!-- Info Data Box -->
                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
                          <div>
                              <p class="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Total Metros OT</p>
                              <p class="text-2xl font-mono font-bold text-white">{{ selectedOt['total_mtl'] || 0 | number }} <span class="text-sm font-normal text-blue-400">m</span></p>
                          </div>
                          <span class="material-symbols-outlined text-blue-500 text-3xl">straighten</span>
                      </div>
                      
                      <div *ngIf="isFlatbed" class="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                          <label class="block text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2">Frecuencia (Troqueladora Plana)</label>
                          <input type="text" [(ngModel)]="formData.frequency" class="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-1.5 text-white font-mono text-sm outline-none focus:border-purple-400 transition-colors" placeholder="Ingrese frecuencia...">
                      </div>

                      <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                          <label class="block text-[10px] font-bold text-red-300 uppercase tracking-widest mb-2">Mermas Totales</label>
                          <input type="number" [(ngModel)]="formData.waste" (input)="updateFormNumber('waste', $event)" class="w-full bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2 text-red-100 font-mono text-lg outline-none focus:border-red-400 transition-colors text-right" placeholder="0">
                      </div>
                  </div>

                  <!-- Add Diecut Activity Card -->
                  <div class="bg-[#0a0f18]/60 border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
                      <div class="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
                      
                      <h3 class="text-sm font-tech font-bold text-purple-300 uppercase tracking-widest mb-5 flex items-center gap-2">
                          <span class="material-symbols-outlined text-lg">playlist_add</span> 
                          Agregar Actividad de Troquelado
                      </h3>
                      
                      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                          <!-- Actividad -->
                          <div class="lg:col-span-4">
                              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Tipo de Actividad</label>
                              <div class="relative">
                                  <select [(ngModel)]="currentDiecutActivity.type" class="glass-input w-full px-4 py-3 rounded-xl text-sm font-bold text-white outline-none bg-[#0a0f18] border border-white/10 appearance-none cursor-pointer focus:border-purple-500 transition-colors shadow-inner">
                                      <option class="bg-[#0a0f18]" *ngFor="let act of diecutActivityTypes" [value]="act">{{ act }}</option>
                                  </select>
                                  <span class="absolute right-3 top-3.5 pointer-events-none text-gray-500 material-symbols-outlined text-lg">expand_more</span>
                              </div>
                          </div>

                          <!-- Horas -->
                          <div class="lg:col-span-2">
                              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Hora Inicio</label>
                              <input type="time" [(ngModel)]="currentDiecutActivity.startTime" (input)="updateCurrentDiecutField('startTime', $event)" class="glass-input w-full px-3 py-3 rounded-xl text-sm font-mono font-bold text-white outline-none bg-[#0a0f18] border border-white/10 text-center focus:border-purple-500 transition-colors shadow-inner">
                          </div>
                          <div class="lg:col-span-2">
                              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Hora Fin</label>
                              <input type="time" [(ngModel)]="currentDiecutActivity.endTime" (input)="updateCurrentDiecutField('endTime', $event)" class="glass-input w-full px-3 py-3 rounded-xl text-sm font-mono font-bold text-white outline-none bg-[#0a0f18] border border-white/10 text-center focus:border-purple-500 transition-colors shadow-inner">
                          </div>

                          <!-- Metros -->
                          <div class="lg:col-span-2">
                              <label class="block text-[10px] font-bold text-purple-400 uppercase mb-2 ml-1">Metros Lineales</label>
                              <input type="number" [(ngModel)]="currentDiecutActivity.meters" (input)="updateCurrentDiecutMeters($event)" class="glass-input w-full px-4 py-3 rounded-xl text-sm font-mono font-bold text-purple-400 outline-none bg-[#0a0f18] border border-white/10 text-right focus:border-purple-500 transition-colors shadow-inner placeholder-gray-700" placeholder="0">
                          </div>

                          <!-- Add Button -->
                          <div class="lg:col-span-2">
                              <button (click)="addDiecutActivity()" [disabled]="!isValidDiecutActivity()" class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 active:scale-95 border border-purple-400/20">
                                  <span class="material-symbols-outlined text-lg font-bold">add</span> 
                                  Agregar
                              </button>
                          </div>
                          
                          <!-- Observacion por actividad -->
                          <div class="col-span-full">
                              <input type="text" [(ngModel)]="currentDiecutActivity.observations" (input)="updateCurrentDiecutField('observations', $event)" placeholder="Observaciones específicas de la actividad..." class="glass-input w-full px-4 py-2 rounded-lg text-xs text-gray-300 bg-[#0a0f18] border border-white/10 focus:border-purple-500 outline-none">
                          </div>
                      </div>
                  </div>

                  <!-- Diecut Activity List Table -->
                  <div class="mb-8 rounded-2xl border border-white/10 bg-[#0a0f18]/30 overflow-hidden shadow-xl" *ngIf="diecutReportActivities.length > 0">
                      <table class="w-full text-sm text-left">
                          <thead class="bg-[#020408]/80 text-gray-400 font-bold uppercase text-[10px] tracking-widest backdrop-blur-sm border-b border-white/5">
                              <tr>
                                  <th class="px-6 py-4">Actividad</th>
                                  <th class="px-6 py-4 text-center">Horario</th>
                                  <th class="px-6 py-4 text-center">Duración</th>
                                  <th class="px-6 py-4 text-right">Metros</th>
                                  <th class="px-6 py-4 text-left">Obs</th>
                                  <th class="px-6 py-4 text-center w-20"></th>
                              </tr>
                          </thead>
                          <tbody class="divide-y divide-white/5">
                              <tr *ngFor="let item of diecutReportActivities; let i = index" class="hover:bg-white/5 transition-colors group">
                                  <td class="px-6 py-3 font-bold text-white flex items-center gap-3">
                                      <div class="w-1.5 h-1.5 rounded-full" [ngClass]="item.meters > 0 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-gray-600'"></div>
                                      {{ item.type }}
                                  </td>
                                  <td class="px-6 py-3 text-center font-mono text-gray-300 text-xs">{{ item.startTime }} - {{ item.endTime }}</td>
                                  <td class="px-6 py-3 text-center font-mono text-gray-500 text-xs">{{ calculateDuration(item.startTime, item.endTime) }}</td>
                                  <td class="px-6 py-3 text-right font-mono text-purple-400 font-bold text-base">
                                      <span *ngIf="item.meters > 0">{{ item.meters | number }}</span>
                                      <span *ngIf="!item.meters" class="text-gray-600 text-xs">-</span>
                                  </td>
                                  <td class="px-6 py-3 text-left text-xs text-gray-500 italic truncate max-w-[150px]">
                                      {{ item.observations || '-' }}
                                  </td>
                                  <td class="px-6 py-3 text-center">
                                      <button (click)="removeDiecutActivity(i)" class="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                                          <span class="material-symbols-outlined text-lg">delete</span>
                                      </button>
                                  </td>
                              </tr>
                              <!-- Totals Row -->
                              <tr class="bg-purple-500/5 font-bold border-t border-purple-500/20">
                                  <td class="px-6 py-4 text-right text-purple-300 text-xs uppercase tracking-widest" colspan="3">Total Producción</td>
                                  <td class="px-6 py-4 text-right text-white font-mono text-xl drop-shadow-md">{{ totalDiecutMeters | number }} <span class="text-xs text-gray-500 font-normal">m</span></td>
                                  <td colspan="2"></td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

                  <div *ngIf="diecutReportActivities.length === 0" class="text-center p-12 border-2 border-dashed border-white/10 rounded-2xl mb-8 bg-white/[0.02]">
                      <span class="material-symbols-outlined text-4xl text-gray-700 mb-2">playlist_add</span>
                      <p class="text-xs uppercase tracking-widest font-bold text-gray-500">No hay actividades registradas</p>
                  </div>

                  <!-- General Obs Diecut -->
                  <div class="mb-8">
                      <label class="block text-xs font-tech font-bold text-gray-400 uppercase tracking-widest mb-3">Observaciones Generales</label>
                      <textarea [(ngModel)]="formData.observations" rows="3" class="glass-input w-full p-5 rounded-2xl text-sm text-gray-300 focus:border-purple-500 outline-none bg-[#0a0f18]/60 border border-white/10 resize-none placeholder-gray-600 transition-all focus:bg-[#0a0f18]" placeholder="Detalles adicionales..."></textarea>
                  </div>

               </div>

               <!-- OTROS PROCESOS (Generic Form - Preserved) -->
               <div *ngIf="type !== 'print' && type !== 'diecut'" class="animate-fadeIn">
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                      <div>
                         <label class="block text-xs font-tech font-bold text-gray-400 uppercase tracking-widest mb-3">Operador Auxiliar</label>
                         <input type="text" [(ngModel)]="formData.helper" class="glass-input w-full p-4 rounded-xl font-bold text-white focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.15)] outline-none transition-all placeholder-gray-600 bg-[#0a0f18]/80 border border-white/10" placeholder="Nombre del auxiliar (opcional)">
                      </div>
                      <div class="flex items-end">
                          <div class="w-full bg-blue-500/5 text-blue-300 p-4 rounded-xl text-xs border border-blue-500/10 flex items-center gap-4">
                             <span class="material-symbols-outlined text-xl">info</span>
                             <span class="leading-relaxed">Los registros se asociarán a la máquina <span class="font-bold text-white">{{ machineName }}</span>.</span>
                          </div>
                      </div>
                   </div>

                   <div class="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10"></div>

                   <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div class="col-span-1">
                         <label class="block text-xs font-tech font-bold text-blue-400 uppercase tracking-widest mb-3">
                            {{ type === 'rewind' ? 'Rollos Terminados' : 'Golpes / Unid' }}
                         </label>
                         <input type="number" [(ngModel)]="formData.goodQty" (input)="updateFormNumber('goodQty', $event)" class="glass-input w-full p-5 rounded-2xl text-4xl font-mono font-bold text-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-right placeholder-gray-800 bg-[#0a0f18] border border-white/10 shadow-inner" placeholder="0">
                      </div>

                      <div class="col-span-1">
                         <label class="block text-xs font-tech font-bold text-red-400 uppercase tracking-widest mb-3">Mermas (Total)</label>
                         <input type="number" [(ngModel)]="formData.waste" (input)="updateFormNumber('waste', $event)" class="glass-input w-full p-5 rounded-2xl text-4xl font-mono font-bold text-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right placeholder-gray-800 bg-[#0a0f18] border border-white/10 shadow-inner" placeholder="0">
                      </div>

                      <div class="col-span-1">
                         <ng-container *ngIf="type === 'rewind'">
                            <label class="block text-xs font-tech font-bold text-gray-400 uppercase tracking-widest mb-3">Etiquetas x Rollo</label>
                            <input type="number" [(ngModel)]="formData.labelsPerRoll" (input)="updateFormNumber('labelsPerRoll', $event)" class="glass-input w-full p-5 rounded-2xl text-2xl font-mono font-bold text-white focus:border-blue-500 outline-none text-right bg-[#0a0f18]/60 border border-white/10">
                         </ng-container>
                      </div>
                   </div>
                   
                   <div class="mt-10">
                       <label class="block text-xs font-tech font-bold text-gray-400 uppercase tracking-widest mb-3">Observaciones de Proceso</label>
                       <textarea [(ngModel)]="formData.notes" rows="3" class="glass-input w-full p-5 rounded-2xl text-sm text-gray-300 focus:border-blue-500 outline-none bg-[#0a0f18]/60 border border-white/10 resize-none placeholder-gray-600" placeholder="Ingrese cualquier incidencia o nota relevante..."></textarea>
                   </div>
               </div>

            </div>
            
            <!-- Actions -->
            <div class="p-8 border-t border-white/10 bg-[#0a0f18]/30 flex flex-col md:flex-row gap-5">
               <button (click)="goBack()" class="w-full md:w-auto px-10 py-4 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 hover:text-white transition-all uppercase tracking-widest text-xs font-tech">
                  Cancelar Operación
               </button>
               <button (click)="submitReport()" 
                  [disabled]="isSubmitting || !selectedOt || !state.canCreateProcessReport(type) || (type === 'print' ? reportActivities.length === 0 : (type === 'diecut' ? diecutReportActivities.length === 0 : !formData.goodQty))"
                  class="flex-1 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:border-blue-400 transition-all border border-blue-500/50 uppercase tracking-widest text-xs font-tech disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-4 group">
                  <span class="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">save</span> 
                  {{ isSubmitting ? 'Guardando...' : 'Confirmar y Guardar Reporte' }}
               </button>
            </div>

         </div>

      </main>
    </div>
  `,
  styles: [`
    .font-tech { font-family: var(--app-font-stack); }
    
    .orb-form { 
        top: 20%; right: 5%; 
        width: 800px; height: 800px; 
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%); 
        position: absolute; border-radius: 50%; filter: blur(100px); z-index: 0; 
    }
    
    .scanline {
        background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 51%);
        background-size: 100% 4px;
    }
    
    .glass-panel {
        background: rgba(2, 4, 8, 0.8);
        backdrop-filter: blur(24px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .glass-card {
        background: linear-gradient(170deg, rgba(15, 23, 42, 0.6) 0%, rgba(2, 4, 8, 0.9) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 30px 60px -10px rgba(0, 0, 0, 0.6);
    }
    
    .glass-button {
        background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.05);
    }
    
    .glass-input {
        background: rgba(255,255,255,0.03); 
        border: 1px solid rgba(255,255,255,0.1);
        color: white;
    }
    .glass-input:focus {
        background: rgba(255,255,255,0.05);
    }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
  `]
})
export class OperatorFormComponent {
  route: ActivatedRoute = inject(ActivatedRoute);
  router: Router = inject(Router);
  ordersService = inject(OrdersService);
  state = inject(StateService);
  audit = inject(AuditService);
  notifications = inject(NotificationService);
  production = inject(ProductionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  type = 'print';
  machineName = '';
  now = new Date();
  isSubmitting = false;

  otSearch = '';
  showSuggestions = false;
  selectedOt: Partial<OT> | null = null;

  // Print specific constants
  printActivities = [
    'Impresión', 'Troquelado', 'Setup', 'Refrigerio', 
    'Parada - Mto Mecanico', 'Parada - Mto Electrico', 
    'Parada - Espera de Material', 'Parada - Matizado', 
    'Parada - Espera de VB', 'Parada', 
    'Sin Operador', 'PARADA - VARIOS'
  ];
  printDieTypes = [
    { value: 'FLATBED', label: 'Plano' },
    { value: 'MAGNETIC', label: 'Magnético' },
    { value: 'SOLID', label: 'Sólido' },
  ];

  // Diecut specific constants
  diecutActivityTypes = [
      'SETUP', 'TROQUELADO', 'ESTAMPADO', 'LAMINADO', 'REPUJADO', 
      'TROQUELADO + PREPICADO', 'PREPICADO', 
      'PARADA-MANTENIMIENTO', 'PARADA-TROQUEL DAÑADO', 
      'PARADA-FALLA DE MÁQUINA', 'PARADA-OTROS'
  ];

  // Activities List Logic (Print)
  reportActivities: any[] = [];
  currentActivity = {
      type: 'Impresión',
      startTime: '',
      endTime: '',
      meters: null as number | null
  };

  // Activities List Logic (Diecut)
  diecutReportActivities: any[] = [];
  currentDiecutActivity = {
      type: 'TROQUELADO',
      startTime: '',
      endTime: '',
      meters: null as number | null,
      observations: ''
  };

  formData: any = {
     cliseItem: '',
     dieType: '',
     dieSeries: '',
     dieLocation: '',
     frequency: '',
     cliseStatus: 'OK',
     dieStatus: 'OK',
     productionStatus: 'PARCIAL',
     // Legacy fields for other types / global
     helper: '',
     goodQty: null,
     waste: null,
     status: 'OK',
     labelsPerRoll: null,
     notes: '',
     observations: ''
  };

  get filteredOts(): Partial<OT>[] {
     const term = this.otSearch.toLowerCase();
     if (!term) return [];
     return this.ordersService.ots
        .filter(ot =>
          String(ot.OT || '').toLowerCase().includes(term)
          || String(ot['Razon Social'] || '').toLowerCase().includes(term),
        )
        .slice(0, 5);
  }

  get totalMeters() {
      return this.reportActivities.reduce((acc, curr) => acc + (curr.meters || 0), 0);
  }

  get totalDiecutMeters() {
      return this.diecutReportActivities.reduce((acc, curr) => acc + (curr.meters || 0), 0);
  }

  get isMagneticDieSelected() {
      return this.formData.dieType === 'MAGNETIC';
  }

  get isFlatbedOrSolidDieSelected() {
      return this.formData.dieType === 'FLATBED' || this.formData.dieType === 'SOLID';
  }

  get isFlatbed(): boolean {
      return (this.machineName || '').toUpperCase().includes('PLANA');
  }

  constructor() {
    this.route.params.subscribe(params => {
      this.type = params['type'];
      this.machineName = params['machine'];
      if (!this.state.hasActiveOperator()) {
        this.router.navigate(['/operator']);
        return;
      }
      if ((this.type === 'print' || this.type === 'diecut') && !this.state.canCreateProcessReport(this.type)) {
        this.notifications.showError('La sesión anfitriona no tiene permiso para registrar reportes en esta área.');
        this.router.navigate(['/operator']);
        return;
      }
      this.resetForm();
    });

    this.ordersService.ots$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.otSearch && !this.showSuggestions) return;
        queueMicrotask(() => this.cdr.detectChanges());
      });

    setInterval(() => this.now = new Date(), 60000);
  }

  resetForm() {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      
      this.reportActivities = [];
      this.diecutReportActivities = [];
      
      this.currentActivity = {
          type: 'Impresión',
          startTime: currentHour,
          endTime: '',
          meters: null
      };

      this.currentDiecutActivity = {
          type: 'TROQUELADO',
          startTime: currentHour,
          endTime: '',
          meters: null,
          observations: ''
      };

      this.formData = {
         cliseItem: '',
         dieType: '',
         dieSeries: '',
         dieLocation: '',
         frequency: '',
         cliseStatus: 'OK',
         dieStatus: 'OK',
         productionStatus: 'PARCIAL',
         helper: '',
         goodQty: null,
         waste: null,
         labelsPerRoll: null,
         status: 'OK',
         notes: '',
         observations: ''
      };
  }

  // Print Activity Management
  addActivity() {
      if (!this.isValidActivity()) return;
      this.reportActivities.push({ ...this.currentActivity });
      this.currentActivity = {
          type: 'Impresión',
          startTime: this.currentActivity.endTime,
          endTime: '',
          meters: null
      };
  }

  removeActivity(index: number) {
      this.reportActivities.splice(index, 1);
  }

  isValidActivity() {
      return this.currentActivity.type && this.currentActivity.startTime && this.currentActivity.endTime;
  }

  // Diecut Activity Management
  addDiecutActivity() {
      if (!this.isValidDiecutActivity()) return;
      this.diecutReportActivities.push({ ...this.currentDiecutActivity });
      this.currentDiecutActivity = {
          type: 'TROQUELADO',
          startTime: this.currentDiecutActivity.endTime,
          endTime: '',
          meters: null,
          observations: ''
      };
  }

  removeDiecutActivity(index: number) {
      this.diecutReportActivities.splice(index, 1);
  }

  isValidDiecutActivity() {
      return this.currentDiecutActivity.type && this.currentDiecutActivity.startTime && this.currentDiecutActivity.endTime;
  }

  calculateDuration(start: string, end: string): string {
      if(!start || !end) return '-';
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if(diff < 0) diff += 24 * 60; // Handle midnight crossing
      
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      return `${hours}h ${mins}m`;
  }

  get typeName(): string {
     switch(this.type) {
        case 'print': return 'IMPRESIÓN';
        case 'diecut': return 'TROQUELADO';
        case 'rewind': return 'REBOBINADO';
        default: return 'PRODUCCIÓN';
     }
  }

  updateOtSearch(term: string) {
     this.otSearch = term;
     this.showSuggestions = true;
     if(!term) this.selectedOt = null;
  }

  selectOt(ot: Partial<OT>) {
     this.selectedOt = ot;
     this.otSearch = String(ot.OT);
     this.showSuggestions = false;
     if (!String(this.formData.dieSeries || '').trim()) {
        this.formData.dieSeries = String(ot.troquel || '').trim();
     }
  }

  goBack() {
     this.router.navigate(['/operator/select-machine', this.type]);
  }

  async submitReport() {
     if (this.isSubmitting) return;

     if (this.type !== 'print' && this.type !== 'diecut' && this.type !== 'rewind') {
        this.submitLegacyProcessReport();
        return;
     }

     if (!this.state.canCreateProcessReport(this.type)) {
        this.notifications.showError('La sesión anfitriona no tiene permiso para registrar reportes en esta área.');
        return;
     }

     const activeOperator = this.state.activeOperator();
     if (!activeOperator) {
        this.notifications.showWarning('Identifica primero al operario antes de registrar producción.');
        this.router.navigate(['/operator']);
        return;
     }

     if (!this.selectedOt) {
        this.notifications.showWarning('Selecciona una OT antes de guardar el reporte.');
        return;
     }

     const machine = this.resolveCurrentMachine();
     if (!machine) {
        this.notifications.showError('No se pudo resolver la máquina seleccionada para este reporte.');
        return;
     }

     const workOrderId = await this.resolveSelectedWorkOrderId();
     const shiftId = this.resolveShiftId();

     try {
        this.isSubmitting = true;

        if (this.type === 'print') {
          const printDieValidation = this.validatePrintDieData();
          if (printDieValidation) {
            this.notifications.showWarning(printDieValidation);
            return;
          }

          const created = await this.production.createPrintReport({
            reported_at: new Date().toISOString(),
            work_order_id: workOrderId || undefined,
            machine_id: machine.id,
            operator_id: activeOperator.id,
            shift_id: shiftId || undefined,
            clise_item_code: this.normalizeOptionalText(this.formData.cliseItem),
            die_type: this.normalizeOptionalText(this.formData.dieType),
            die_series: this.normalizeOptionalText(this.formData.dieSeries),
            die_location: this.normalizeOptionalText(this.formData.dieLocation),
            clise_status: this.formData.cliseStatus || 'OK',
            die_status: this.formData.dieStatus || 'OK',
            production_status: this.formData.productionStatus || 'PARCIAL',
            observations: this.normalizeOptionalText(this.formData.observations),
            activities: this.reportActivities.map((activity) => ({
              activity_type: this.mapPrintActivityType(activity.type),
              start_time: this.normalizeTime(activity.startTime),
              end_time: this.normalizeTime(activity.endTime),
              duration_minutes: this.calculateDurationMinutes(activity.startTime, activity.endTime),
              meters: Number(activity.meters || 0),
            })),
          });

          this.audit.log(
            this.state.userName(),
            this.state.userRole(),
            'PRODUCCIÓN',
            'Reporte Impresión',
            `Host: ${this.state.userName()}, Operario: ${activeOperator.name}, OT: ${this.selectedOt?.OT}, Máquina: ${machine.name}, Reporte: ${created.id}, Total Mts: ${created.totalMeters}`,
          );
          this.notifications.showSuccess(`Reporte de impresión ${created.id} guardado correctamente.`);
        }

        if (this.type === 'diecut') {
          const created = await this.production.createDiecutReport({
            reported_at: new Date().toISOString(),
            work_order_id: workOrderId || undefined,
            machine_id: machine.id,
            operator_id: activeOperator.id,
            shift_id: shiftId || undefined,
            die_series: this.normalizeOptionalText(this.formData.dieSeries || this.selectedOt?.troquel),
            frequency: this.isFlatbed ? this.normalizeOptionalText(this.formData.frequency) : undefined,
            die_status: this.formData.dieStatus || 'OK',
            waste_units: this.toNumberValue(this.formData.waste, 0),
            production_status: this.formData.productionStatus || 'PARCIAL',
            observations: this.normalizeOptionalText(this.formData.observations),
            activities: this.diecutReportActivities.map((activity) => ({
              activity_type: this.mapDiecutActivityType(activity.type),
              start_time: this.normalizeTime(activity.startTime),
              end_time: this.normalizeTime(activity.endTime),
              duration_minutes: this.calculateDurationMinutes(activity.startTime, activity.endTime),
              quantity: this.toNumberValue(activity.meters, 0),
              observations: this.normalizeOptionalText(activity.observations),
            })),
          });

          this.audit.log(
            this.state.userName(),
            this.state.userRole(),
            'PRODUCCIÓN',
            'Reporte Troquelado',
            `Host: ${this.state.userName()}, Operario: ${activeOperator.name}, OT: ${this.selectedOt?.OT}, Máquina: ${machine.name}, Reporte: ${created.id}, Total Und: ${created.goodUnits}`,
          );
          this.notifications.showSuccess(`Reporte de troquelado ${created.id} guardado correctamente.`);
        }

        if (this.type === 'rewind') {
          const rollsFinished = this.toNumberValue(this.formData.goodQty, 0);
          const labelsPerRoll = this.toNumberValue(this.formData.labelsPerRoll, 0);

          if (labelsPerRoll <= 0) {
            this.notifications.showWarning('Ingresa la cantidad de etiquetas por rollo antes de guardar el reporte.');
            return;
          }

          const created = await this.production.createRewindReport({
            reported_at: new Date().toISOString(),
            work_order_id: workOrderId || undefined,
            machine_id: machine.id,
            operator_id: activeOperator.id,
            shift_id: shiftId || undefined,
            rolls_finished: Math.max(0, Math.trunc(rollsFinished)),
            labels_per_roll: Math.max(0, Math.trunc(labelsPerRoll)),
            total_labels: Math.max(0, Math.trunc(rollsFinished)) * Math.max(0, Math.trunc(labelsPerRoll)),
            total_meters: this.resolveSelectedOtTotalMeters(),
            waste_rolls: Math.max(0, Math.trunc(this.toNumberValue(this.formData.waste, 0))),
            quality_check: true,
            production_status: this.formData.productionStatus || 'PARCIAL',
            observations: this.normalizeOptionalText(this.formData.notes || this.formData.observations),
          });

          this.audit.log(
            this.state.userName(),
            this.state.userRole(),
            'PRODUCCIÓN',
            'Reporte Rebobinado',
            `Host: ${this.state.userName()}, Operario: ${activeOperator.name}, OT: ${this.selectedOt?.OT}, Máquina: ${machine.name}, Reporte: ${created.id}, Rollos: ${created.rolls}`,
          );
          this.notifications.showSuccess(`Reporte de rebobinado ${created.id} guardado correctamente.`);
        }

        this.resetForm();
        this.otSearch = '';
        this.selectedOt = null;
        this.showSuggestions = false;
     } catch (error: any) {
        this.notifications.showError(this.resolveErrorMessage(error, 'No fue posible guardar el reporte.'));
     } finally {
        this.isSubmitting = false;
     }
  }

  private submitLegacyProcessReport() {
     const operator = this.state.activeOperatorName();
     const details = `Cant: ${this.formData.goodQty}`;
     this.audit.log(this.state.userName(), this.state.userRole(), 'PRODUCCIÓN', 'Reporte Turno', `Host: ${this.state.userName()}, Operario: ${operator}, OT: ${this.selectedOt?.OT}, Máquina: ${this.machineName}, ${details}`);
     this.notifications.showSuccess(`Reporte registrado localmente.\n\nOT: ${this.selectedOt?.OT}\nProceso: ${this.typeName}\nMáquina: ${this.machineName}\n${details}`);
     this.resetForm();
     this.otSearch = '';
     this.selectedOt = null;
     this.showSuggestions = false;
  }

  private resolveCurrentMachine() {
     const normalizedName = this.normalizeToken(this.machineName);
     return this.state.adminMachines().find((machine) => {
        const sameName = this.normalizeToken(machine.name) === normalizedName;
        if (!sameName) return false;
        if (this.type === 'print') return machine.type === 'Impresión';
        if (this.type === 'diecut') return machine.type === 'Troquelado';
        if (this.type === 'rewind') return machine.type === 'Rebobinado';
        return true;
     }) || null;
  }

  private resolveShiftId() {
     const currentShift = this.normalizeToken(this.state.currentShift());
     if (!currentShift) return undefined;

     return this.state.plantShifts().find((shift) => {
        const shiftName = this.normalizeToken(shift.name);
        const shiftCode = this.normalizeToken(shift.code);
        return shiftName === currentShift || shiftCode === currentShift || shiftName.includes(currentShift) || currentShift.includes(shiftName);
     })?.id;
  }

  private async resolveSelectedWorkOrderId() {
     if (this.selectedOt?.id) {
        return String(this.selectedOt.id);
     }

     const resolved = await this.ordersService.findWorkOrderByOtNumber(this.selectedOt?.OT);
     return resolved?.id ? String(resolved.id) : undefined;
  }

  updateCurrentActivityTime(field: 'startTime' | 'endTime', event: Event) {
     const input = event.target as HTMLInputElement | null;
     this.currentActivity[field] = String(input?.value || '');
  }

  updateCurrentActivityMeters(event: Event) {
     const input = event.target as HTMLInputElement | null;
     this.currentActivity.meters = this.readNullableNumber(input?.value);
  }

  updateCurrentDiecutField(field: 'startTime' | 'endTime' | 'observations', event: Event) {
     const input = event.target as HTMLInputElement | null;
     this.currentDiecutActivity[field] = String(input?.value || '');
  }

  updateCurrentDiecutMeters(event: Event) {
     const input = event.target as HTMLInputElement | null;
     this.currentDiecutActivity.meters = this.readNullableNumber(input?.value);
  }

  updateFormNumber(field: 'goodQty' | 'waste' | 'labelsPerRoll', event: Event) {
     const input = event.target as HTMLInputElement | null;
     this.formData[field] = this.readNullableNumber(input?.value);
  }

  private mapPrintActivityType(type: string) {
     const normalized = this.normalizeToken(type);
     if (normalized.includes('SETUP')) return 'SETUP';
     if (
       normalized.includes('PARADA')
       || normalized.includes('REFRIGERIO')
       || normalized.includes('MANTENIMIENTO')
       || normalized.includes('SIN OPERADOR')
     ) {
       return 'STOP';
     }
     return 'RUN';
  }

  private mapDiecutActivityType(type: string) {
     const normalized = this.normalizeToken(type);
     if (normalized.includes('SETUP')) return 'SETUP';
    if (normalized.includes('PARADA')) return 'STOP';
    return 'RUN';
  }

  private validatePrintDieData() {
     const dieType = String(this.formData.dieType || '').trim().toUpperCase();
     const dieSeries = String(this.formData.dieSeries || '').trim();
     const dieLocation = String(this.formData.dieLocation || '').trim();

     if (!dieType) {
        return 'Selecciona el tipo de troquel antes de guardar el reporte de impresión.';
     }

     if (dieType === 'MAGNETIC' && !dieSeries) {
        return 'Ingresa la serie del troquel magnético antes de guardar el reporte.';
     }

     if ((dieType === 'FLATBED' || dieType === 'SOLID') && !dieSeries && !dieLocation) {
        return 'Ingresa la serie o la ubicación del troquel antes de guardar el reporte.';
     }

     return null;
  }

  private normalizeTime(value: string) {
     const normalized = String(value || '').trim();
     if (!normalized) return '';
     return normalized.length === 5 ? `${normalized}:00` : normalized;
  }

  private resolveSelectedOtTotalMeters() {
     const candidates = [
       this.selectedOt?.['total_mtl'],
       this.selectedOt?.['MLL Pedido'],
     ];

     for (const candidate of candidates) {
       const parsed = this.toNumberValue(candidate, Number.NaN);
       if (Number.isFinite(parsed) && parsed > 0) {
         return parsed;
       }
     }

     return 0;
  }

  private calculateDurationMinutes(start: string, end: string) {
     if (!start || !end) return 0;
     const [h1, m1] = start.split(':').map(Number);
     const [h2, m2] = end.split(':').map(Number);
     let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
     if (diff < 0) diff += 24 * 60;
     return Math.max(0, diff);
  }

  private normalizeOptionalText(value: unknown) {
     const normalized = String(value ?? '').trim();
     return normalized || undefined;
  }

  private readNullableNumber(value: unknown) {
     const normalized = String(value ?? '').trim();
     if (!normalized) return null;
     const parsed = Number(normalized);
     return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumberValue(value: unknown, fallback = 0) {
     if (value === null || value === undefined || value === '') {
       return fallback;
     }

     const parsed = typeof value === 'number' ? value : Number(String(value).trim());
     return Number.isFinite(parsed) ? parsed : fallback;
  }

  private normalizeToken(value: unknown) {
     return String(value || '')
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .toUpperCase()
       .trim();
  }

  private resolveErrorMessage(error: any, fallback: string) {
     return error?.message || error?.error?.message || fallback;
  }
}
