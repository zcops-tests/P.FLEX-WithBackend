
import { Component, ViewChild, ElementRef, inject, ChangeDetectorRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OtDetailComponent } from './ot-detail.component';
import { OtImportComponent } from './ot-import.component';
import { OtFormComponent } from './ot-form.component';
import { OrdersService } from '../services/orders.service';
import { OT } from '../models/orders.models';
import { StateService } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-ot-list',
  standalone: true,
  imports: [CommonModule, FormsModule, OtDetailComponent, OtImportComponent, OtFormComponent],
  template: `
    <div class="bg-gradient-mesh text-slate-200 font-sans min-h-screen w-full p-4 md:p-6 flex flex-col overflow-hidden relative pb-20">
      
      <!-- MODALS -->
      <app-ot-import *ngIf="showImportModal" (close)="showImportModal = false" (dataImported)="handleImport($event)"></app-ot-import>
      
      <!-- NEW: INTERNAL DB SELECTOR MODAL (Glassmorphism) -->
      <div *ngIf="showDbSelector" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div class="glassmorphism-card rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-white/20">
            <!-- Header -->
            <div class="bg-white/5 px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/10 backdrop-blur-md">
               <div>
                  <h2 class="text-xl font-bold text-white flex items-center gap-2">
                     <span class="material-icons text-primary">storage</span> Base de Datos Interna
                  </h2>
                  <p class="text-xs text-slate-400 mt-1">Seleccione las OTs que desea activar en la lista de trabajo.</p>
               </div>
               <button (click)="showDbSelector = false" class="text-slate-400 hover:text-white transition-colors"><span class="material-icons">close</span></button>
            </div>
            
            <!-- Search Bar inside Modal -->
            <div class="p-4 bg-white/5 border-b border-white/10 shrink-0">
               <div class="relative">
                  <span class="material-icons absolute left-3 top-2.5 text-slate-400">search</span>
                  <input type="text" [(ngModel)]="dbSearchTerm" placeholder="Buscar OT, Cliente o Producto en base de datos..." 
                     class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 outline-none placeholder-slate-500 backdrop-blur-sm">
               </div>
            </div>

            <!-- DB Table -->
            <div class="flex-1 overflow-auto custom-scrollbar">
                <table class="w-full text-sm text-left">
                   <thead class="bg-white/5 text-slate-300 font-bold sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                         <th class="px-4 py-3 w-10 border-b border-white/10"></th>
                         <th class="px-4 py-3 border-b border-white/10">OT</th>
                         <th class="px-4 py-3 border-b border-white/10">Cliente</th>
                         <th class="px-4 py-3 border-b border-white/10">Descripción</th>
                         <th class="px-4 py-3 text-right border-b border-white/10">Estado Actual</th>
                      </tr>
                   </thead>
                   <tbody class="divide-y divide-white/5">
                      <tr *ngFor="let item of filteredDbItems" 
                          class="hover:bg-white/5 transition-colors cursor-pointer group"
                          (click)="toggleDbSelection(item)">
                         <td class="px-4 py-2">
                            <div class="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                               [ngClass]="isDbSelected(item) ? 'bg-primary border-primary' : 'border-slate-500 bg-transparent group-hover:border-primary'">
                               <span *ngIf="isDbSelected(item)" class="material-icons text-white text-xs font-bold">check</span>
                            </div>
                         </td>
                         <td class="px-4 py-2 font-mono font-bold text-white">{{ item.OT }}</td>
                         <td class="px-4 py-2 text-slate-300">{{ item['Razon Social'] }}</td>
                         <td class="px-4 py-2 text-slate-400 truncate max-w-xs">{{ item.descripcion }}</td>
                         <td class="px-4 py-2 text-right">
                            <span *ngIf="isAlreadyInList(item)" class="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">En Lista</span>
                            <span *ngIf="!isAlreadyInList(item)" class="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/10">Disponible</span>
                         </td>
                      </tr>
                      <tr *ngIf="filteredDbItems.length === 0">
                          <td colspan="5" class="p-8 text-center text-slate-500">
                              No se encontraron registros en la Base de Datos.
                          </td>
                      </tr>
                   </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div class="bg-white/5 px-6 py-4 border-t border-white/10 flex justify-between items-center shrink-0">
               <span class="text-sm font-bold text-primary">{{ dbSelectedItems.size }} seleccionados</span>
               <div class="flex gap-3">
                  <button (click)="showDbSelector = false" class="px-4 py-2 text-slate-300 font-bold hover:bg-white/10 rounded-xl text-sm transition-colors border border-transparent hover:border-white/10">Cancelar</button>
                  <button (click)="addSelectedToActiveList()" [disabled]="dbSelectedItems.size === 0" 
                     class="px-6 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-primary/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10">
                     <span class="material-icons text-sm">playlist_add</span> Agregar a Lista
                  </button>
               </div>
            </div>
        </div>
      </div>

      <app-ot-detail *ngIf="selectedOt" [ot]="selectedOt" (close)="closeDetail()"></app-ot-detail>
      <app-ot-form *ngIf="showFormModal" [otToEdit]="editingOt" (save)="handleFormSave($event)" (cancel)="closeForm()"></app-ot-form>

      <!-- MAIN CONTENT -->
      <div class="max-w-[1920px] mx-auto space-y-6 w-full flex flex-col h-full">
        <!-- (Existing Content preserved via selector) -->
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </div>
      
      <!-- Reusing template to avoid huge file duplication in prompt, logic is what changed -->
      <ng-template #mainContent>
        <!-- HEADER -->
        <div class="glassmorphism-card rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 relative overflow-hidden">
          <!-- Decorator -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div>
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Gestión de OTs
              <span *ngIf="ordersService.dbLastUpdated" class="text-xs font-mono font-medium px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                BD: {{ ordersService.dbLastUpdated | date:'dd/MM HH:mm' }}
              </span>
            </h1>
            <p class="text-slate-400 text-xs mt-1 font-medium">Panel de control y seguimiento de órdenes de trabajo activas</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button (click)="showImportModal = true" class="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all text-xs">
              <span class="material-icons text-emerald-400 text-sm">sync</span>
              Actualizar BD
            </button>
            <button (click)="openDbSelector()" class="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-all text-xs">
              <span class="material-icons text-blue-400 text-sm">search</span>
              Buscar en BD
            </button>
            <button (click)="openForm(null)" class="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 text-xs border border-white/10">
              <span class="material-icons text-sm">add</span>
              Crear Manual
            </button>
          </div>
        </div>

        <!-- FILTERS -->
        <div class="glassmorphism-card p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-center flex-shrink-0">
          
          <!-- SEARCH (3 cols) -->
          <div class="col-span-2 lg:col-span-3 relative group">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-icons">search</span>
            <input [(ngModel)]="searchTerm" (ngModelChange)="updateSearch($event)" 
                   class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-400 bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 outline-none transition-all shadow-sm backdrop-blur-sm" 
                   placeholder="Buscar OT, producto..." type="text"/>
          </div>

          <!-- STATUS (2 cols) -->
          <div class="col-span-1 lg:col-span-2 relative">
            <select [(ngModel)]="statusFilter" (ngModelChange)="updateStatusFilter($event)" 
                    class="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 cursor-pointer outline-none appearance-none shadow-sm backdrop-blur-sm truncate">
              <option value="" class="bg-slate-900">Estado: Todos</option>
              <option value="PENDIENTE" class="bg-slate-900 text-gray-400">Pendiente</option>
              <option value="EN PROCESO" class="bg-slate-900 text-blue-400">En Proceso</option>
              <option value="FINALIZADO" class="bg-slate-900 text-green-400">Terminado</option>
              <option value="PAUSADA" class="bg-slate-900 text-yellow-400">Pausada</option>
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 material-icons text-sm">expand_more</span>
          </div>

          <!-- MACHINE (2 cols) -->
          <div class="col-span-1 lg:col-span-2 relative">
            <select [(ngModel)]="machineFilter" (ngModelChange)="updateMachineFilter($event)" 
                    class="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 cursor-pointer outline-none appearance-none shadow-sm backdrop-blur-sm truncate">
              <option value="" class="bg-slate-900">Máquina: Todas</option>
              <option *ngFor="let m of state.adminMachines()" [value]="m.name" class="bg-slate-900">{{ m.name }}</option>
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 material-icons text-sm">expand_more</span>
          </div>

          <!-- CLIENT (2 cols) -->
          <div class="col-span-2 lg:col-span-2 relative">
            <select [(ngModel)]="clientFilter" (ngModelChange)="currentPage = 1" 
                    class="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 cursor-pointer outline-none appearance-none shadow-sm backdrop-blur-sm truncate">
              <option value="" class="bg-slate-900">Cliente: Todos</option>
              <option *ngFor="let c of uniqueClients" [value]="c" class="bg-slate-900">{{ c }}</option>
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 material-icons text-sm">expand_more</span>
          </div>

          <!-- SELLER (1 col) -->
          <div class="col-span-1 lg:col-span-1 relative">
            <select [(ngModel)]="sellerFilter" (ngModelChange)="currentPage = 1" 
                    class="w-full py-2.5 px-2 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 cursor-pointer outline-none appearance-none shadow-sm backdrop-blur-sm truncate">
              <option value="" class="bg-slate-900">Vend: Todos</option>
              <option *ngFor="let s of uniqueSellers" [value]="s" class="bg-slate-900">{{ s }}</option>
            </select>
          </div>

          <!-- MONTH (1 col) -->
          <div class="col-span-1 lg:col-span-1 relative">
            <select [(ngModel)]="monthFilter" (ngModelChange)="currentPage = 1" 
                    class="w-full py-2.5 px-2 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 cursor-pointer outline-none appearance-none shadow-sm backdrop-blur-sm truncate">
              <option value="" class="bg-slate-900">Mes: Todos</option>
              <option *ngFor="let m of uniqueMonths" [value]="m" class="bg-slate-900">{{ m }}</option>
            </select>
          </div>

          <!-- RESET (1 col) -->
          <div class="col-span-2 lg:col-span-1 flex gap-2">
            <button (click)="clearFilters()" class="w-full flex items-center justify-center gap-2 py-2.5 px-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors text-xs font-bold shadow-sm backdrop-blur-sm">
              <span class="material-icons text-sm">filter_alt_off</span>
            </button>
          </div>
        </div>

        <!-- TABLE LIST -->
        <div class="glassmorphism-card rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0 border border-white/10">
          <div class="overflow-auto flex-grow relative custom-scrollbar">
            <table class="w-full text-left border-collapse table-fixed min-w-[1200px]">
              <thead class="sticky top-0 z-10">
                <tr class="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-widest font-bold text-slate-400 backdrop-blur-md">
                  <th class="p-4 w-36">Estado</th>
                  <th class="p-4 w-44">Máquina</th>
                  <th class="p-4 w-28">OT</th>
                  <th class="p-4 w-52">Cliente</th>
                  <th class="p-4 w-64">Descripción</th>
                  <th class="p-4 w-28 text-right">Mts Tot.</th>
                  <th class="p-4 w-36">Fecha Ingreso</th>
                  <th class="p-4 w-32">Entrega</th>
                  <th class="p-4 w-24 text-right">Cantidad</th>
                  <th class="p-4 w-40 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-sm">
                <tr *ngFor="let ot of paginatedOts; trackBy: trackByOt" 
                    class="transition-colors group hover:bg-white/5 border-l-4"
                    [ngClass]="{
                        'border-l-primary hover:bg-primary/5': ot.Estado_pedido === 'EN PROCESO',
                        'border-l-slate-500': ot.Estado_pedido === 'PENDIENTE' || !ot.Estado_pedido,
                        'border-l-emerald-500 hover:bg-emerald-500/5': ot.Estado_pedido === 'FINALIZADO',
                        'border-l-yellow-500 hover:bg-yellow-500/5': ot.Estado_pedido === 'PAUSADA'
                    }">
                  
                  <!-- STATUS (INLINE EDITABLE) -->
                  <td class="p-4">
                    <div (click)="$event.stopPropagation()" class="relative">
                       <select [ngModel]="ot.Estado_pedido"
                               (ngModelChange)="updateOtField(ot, 'Estado_pedido', $event)"
                               class="appearance-none cursor-pointer w-full px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg border backdrop-blur-sm focus:outline-none focus:ring-1 transition-all"
                               [ngClass]="{
                                  'bg-primary/20 text-blue-100 border-primary/30 focus:ring-primary': ot.Estado_pedido === 'EN PROCESO',
                                  'bg-white/5 text-slate-300 border-white/10 focus:ring-slate-500': ot.Estado_pedido === 'PENDIENTE' || !ot.Estado_pedido,
                                  'bg-emerald-500/20 text-emerald-100 border-emerald-500/30 focus:ring-emerald-500': ot.Estado_pedido === 'FINALIZADO',
                                  'bg-yellow-500/20 text-yellow-100 border-yellow-500/30 focus:ring-yellow-500': ot.Estado_pedido === 'PAUSADA'
                               }">
                          <option class="bg-[#161B22] text-slate-300" value="PENDIENTE">PENDIENTE</option>
                          <option class="bg-[#161B22] text-blue-400" value="EN PROCESO">EN PROCESO</option>
                          <option class="bg-[#161B22] text-emerald-400" value="FINALIZADO">FINALIZADO</option>
                          <option class="bg-[#161B22] text-yellow-400" value="PAUSADA">PAUSADA</option>
                       </select>
                       <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
                          <span class="material-icons text-[14px]">expand_more</span>
                       </div>
                    </div>
                  </td>

                  <!-- MACHINE -->
                  <td class="p-4">
                    <div class="flex flex-col group/edit relative">
                      <span class="font-bold text-white truncate cursor-pointer hover:text-primary transition-colors" (click)="$event.stopPropagation(); openDetail(ot)">
                          {{ ot.maquina || 'Sin Asignar' }}
                      </span>
                      <span class="text-[10px] text-slate-500 uppercase font-mono">ID: {{ getMachineCode(ot.maquina) }}</span>
                    </div>
                  </td>

                  <!-- OT -->
                  <td class="p-4 font-mono font-bold text-primary text-base group-hover:text-blue-400 transition-colors">
                      {{ ot.OT }}
                  </td>

                  <!-- CLIENT -->
                  <td class="p-4">
                    <span class="font-semibold text-slate-200 truncate block" [title]="ot['Razon Social']">{{ ot['Razon Social'] }}</span>
                  </td>

                  <!-- DESC -->
                  <td class="p-4 text-slate-400 truncate text-xs" [title]="ot.descripcion">
                      {{ ot.descripcion }}
                  </td>

                  <!-- MTS -->
                  <td class="p-4 text-right font-mono text-slate-300">{{ ot.total_mtl | number:'1.0-2' }}</td>

                  <!-- FECHA INGRESO (INLINE EDITABLE) -->
                  <td class="p-4">
                    <div (click)="$event.stopPropagation()" class="flex items-center gap-1.5 bg-transparent rounded hover:bg-white/5 transition-colors p-1 border border-transparent hover:border-white/10 group/date">
                        <span class="material-icons text-[14px] text-slate-500 group-hover/date:text-primary">input</span>
                        <input type="date" 
                               [ngModel]="toInputDate(ot['FECHA INGRESO PLANTA'])"
                               (ngModelChange)="updateOtField(ot, 'FECHA INGRESO PLANTA', $event)"
                               class="bg-transparent border-none p-0 text-xs font-medium text-slate-400 focus:ring-0 cursor-pointer w-full text-left" />
                    </div>
                  </td>

                  <!-- FECHA ENTREGA -->
                  <td class="p-4">
                    <div class="flex items-center gap-1.5 text-xs font-medium" [ngClass]="isLate(ot['FECHA ENT']) ? 'text-red-400' : 'text-industrial-orange'">
                        <span class="material-icons !text-sm">event</span>
                        {{ formatDate(ot['FECHA ENT']) }}
                    </div>
                  </td>

                  <!-- QTY -->
                  <td class="p-4 text-right font-mono font-medium text-white">{{ ot['CANT PED'] | number }} <span class="text-[10px] text-slate-500">{{ ot.Und }}</span></td>

                  <!-- ACTIONS -->
                  <td class="p-4 text-center">
                     <div class="flex items-center justify-center gap-2">
                        <button (click)="openDetail(ot)" 
                                [ngClass]="{
                                    'bg-white text-black hover:bg-slate-200 shadow-white/20': ot.Estado_pedido === 'EN PROCESO',
                                    'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30': ot.Estado_pedido === 'PENDIENTE' || !ot.Estado_pedido,
                                    'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10': ot.Estado_pedido === 'FINALIZADO' || ot.Estado_pedido === 'PAUSADA'
                                }"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-lg active:scale-95 whitespace-nowrap backdrop-blur-sm">
                            {{ getActionButtonText(ot.Estado_pedido) }}
                        </button>
                        
                        <!-- Mini Actions -->
                        <button (click)="openForm(ot)" class="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Editar">
                            <span class="material-icons text-base">edit</span>
                        </button>
                        <button (click)="deleteOt(ot)" class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Eliminar">
                            <span class="material-icons text-base">delete</span>
                        </button>
                     </div>
                  </td>
                </tr>

                <tr *ngIf="paginatedOts.length === 0">
                    <td colspan="10" class="p-12 text-center text-slate-500">
                        <div class="flex flex-col items-center justify-center">
                            <span class="material-icons text-5xl mb-3 opacity-30">search_off</span>
                            <p class="font-medium text-lg text-slate-400">No se encontraron OTs</p>
                            <p class="text-sm">Intente ajustar los filtros o importe nuevos datos.</p>
                        </div>
                    </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PAGINATION -->
          <div class="border-t border-white/10 p-4 bg-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm flex-shrink-0 backdrop-blur-md">
            <div class="flex items-center gap-3 text-slate-400">
                <span class="flex items-center gap-2">
                    <span class="material-icons !text-sm text-primary">analytics</span>
                    Mostrando <span class="font-bold text-white">{{ showingStart }} - {{ showingEnd }}</span> de <span class="font-bold text-white">{{ filteredOts.length }}</span> OTs
                </span>
            </div>
            <div class="flex items-center gap-2">
                <button (click)="changePage('prev')" [disabled]="currentPage === 1" 
                        class="flex items-center px-3 py-2 border border-white/10 rounded-lg text-slate-400 bg-transparent hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span class="material-icons !text-base">chevron_left</span>
                </button>
                
                <div class="flex items-center gap-1">
                    <!-- Simple pagination numbers logic -->
                    <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">{{ currentPage }}</button>
                    <span class="text-slate-500 text-xs font-medium px-2">de {{ totalPages }}</span>
                </div>

                <button (click)="changePage('next')" [disabled]="currentPage >= totalPages"
                        class="flex items-center px-3 py-2 border border-white/10 rounded-lg text-slate-400 bg-transparent hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span class="material-icons !text-base">chevron_right</span>
                </button>
            </div>
          </div>
        </div>
      </ng-template>

    </div>
  `
})
export class OtListComponent implements OnInit, OnDestroy {
  ordersService = inject(OrdersService);
  state = inject(StateService);
  audit = inject(AuditService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);

  // Filters
  searchTerm = '';
  statusFilter = '';
  machineFilter = '';
  clientFilter = '';
  monthFilter = '';
  sellerFilter = '';
  
  currentPage = 1;
  pageSize = 10; 

  // Modals
  showImportModal = false;
  showFormModal = false;
  showDbSelector = false;
  
  selectedOt: OT | null = null;
  editingOt: OT | null = null;

  // DB Selector
  dbSearchTerm = '';
  dbSelectedItems = new Set<string>();

  // Local State
  localOts: OT[] = [];
  subscription: Subscription | null = null;

  ngOnInit() {
    this.subscription = this.ordersService.ots$.subscribe(ots => {
        this.localOts = ots as OT[];
        this.cdr.markForCheck(); // Ensure change detection runs
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
        this.subscription.unsubscribe();
    }
  }

  get uniqueClients() {
    const clients = new Set(this.localOts.map(o => o['Razon Social']).filter(Boolean));
    return Array.from(clients).sort();
  }

  get uniqueSellers() {
    const sellers = new Set(this.localOts.map(o => o.Vendedor).filter(v => !!v));
    return Array.from(sellers).sort();
  }

  get uniqueMonths() {
    const months = new Set<string>();
    this.localOts.forEach(ot => {
        const dateStr = this.toInputDate(ot['FECHA ENT']); // Use normalized YYYY-MM-DD
        if(dateStr && dateStr.length >= 7) {
            months.add(dateStr.substring(0, 7)); // YYYY-MM
        }
    });
    return Array.from(months).sort().reverse();
  }

  get filteredOts() {
    const term = this.searchTerm.toLowerCase().trim();
    const status = this.statusFilter;
    const machine = this.machineFilter;
    const client = this.clientFilter;
    const seller = this.sellerFilter;
    const month = this.monthFilter;

    return this.localOts.filter(ot => {
      const displayId = String(ot.OT || '').toLowerCase();
      const otClient = String(ot['Razon Social'] || '').toLowerCase();
      const desc = String(ot.descripcion || '').toLowerCase();
      const otStatus = String(ot.Estado_pedido || '').trim();
      const otMachine = String(ot.maquina || '').trim();
      const otSeller = String(ot.Vendedor || '').trim();
      const otDate = this.toInputDate(ot['FECHA ENT']);

      const matchesSearch = term === '' || 
                            displayId.includes(term) || 
                            otClient.includes(term) ||
                            desc.includes(term);

      const matchesStatus = status === '' || otStatus === status;
      const matchesMachine = machine === '' || otMachine === machine;
      const matchesClient = client === '' || ot['Razon Social'] === client;
      const matchesSeller = seller === '' || ot.Vendedor === seller;
      const matchesMonth = month === '' || (otDate && otDate.startsWith(month));

      return matchesSearch && matchesStatus && matchesMachine && matchesClient && matchesSeller && matchesMonth;
    });
  }

  get paginatedOts() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredOts.slice(start, end);
  }

  get totalPages() { return Math.ceil(this.filteredOts.length / this.pageSize) || 1; }
  get showingStart() { return this.filteredOts.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get showingEnd() { return Math.min(this.currentPage * this.pageSize, this.filteredOts.length); }

  get filteredDbItems() {
     const term = this.dbSearchTerm.toLowerCase().trim();
     const fullDb = this.ordersService.internalDatabase;
     if (!term) return fullDb.slice(0, 50);
     return fullDb.filter(ot => 
        String(ot.OT).toLowerCase().includes(term) ||
        String(ot['Razon Social']).toLowerCase().includes(term) ||
        String(ot.descripcion).toLowerCase().includes(term)
     ).slice(0, 50);
  }

  trackByOt(index: number, ot: OT) { return ot.OT; }

  // Actions
  updateSearch(term: string) { this.searchTerm = term; this.currentPage = 1; }
  updateStatusFilter(status: string) { this.statusFilter = status; this.currentPage = 1; }
  updateMachineFilter(machine: string) { this.machineFilter = machine; this.currentPage = 1; }
  changePage(dir: 'next' | 'prev') {
    if (dir === 'next' && this.currentPage < this.totalPages) this.currentPage++;
    if (dir === 'prev' && this.currentPage > 1) this.currentPage--;
  }
  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.machineFilter = '';
    this.clientFilter = '';
    this.sellerFilter = '';
    this.monthFilter = '';
    this.currentPage = 1;
  }

  // Helpers
  getActionButtonText(status: string | undefined): string {
      switch(status) {
          case 'EN PROCESO': return 'VER DETALLES';
          case 'FINALIZADO': return 'VER REPORTE';
          case 'PENDIENTE': return 'INICIAR OT';
          case 'PAUSADA': return 'REANUDAR';
          default: return 'INICIAR OT';
      }
  }

  getMachineCode(machineName: string | undefined): string {
      if(!machineName) return '---';
      if(machineName.includes('SUPERPRIMA')) return 'SEC-07';
      if(machineName.includes('MARK ANDY')) return 'SEC-03';
      if(machineName.includes('FOCUS')) return 'SEC-05';
      return 'GEN-01';
  }

  formatDate(val: any): string {
    if (!val) return '';
    if (typeof val === 'number' && val > 20000) {
       const date = new Date((val - (25567 + 2)) * 86400 * 1000);
       return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = val.split('-');
        return `${d}/${m}/${y.slice(2)}`;
    }
    return String(val);
  }

  toInputDate(val: any): string {
      if (!val) return '';
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
      if (typeof val === 'number' && val > 20000) {
          const date = new Date((val - (25567 + 2)) * 86400 * 1000);
          return date.toISOString().split('T')[0];
      }
      if (typeof val === 'string' && val.includes('/')) {
          const parts = val.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return '';
  }

  isLate(dateVal: any): boolean {
      return false; 
  }

  // CRUD & Modals
  openDetail(ot: OT) { this.selectedOt = ot; }
  closeDetail() { this.selectedOt = null; }
  
  openForm(ot: OT | null) { this.editingOt = ot; this.showFormModal = true; }
  closeForm() { this.showFormModal = false; this.editingOt = null; }
  
  async updateOtField(ot: OT, field: keyof OT, value: any) {
      const oldVal = (ot as any)[field];
      const updatedOt = { ...ot, [field]: value };

      if (field === 'Estado_pedido') {
          await this.ordersService.updateStatus(updatedOt, String(value || ''));
          this.audit.log(this.state.userName(), this.state.userRole(), 'OTS', 'Cambio Estado', `OT ${ot.OT} cambió de ${oldVal} a ${value}`);
          return;
      }

      await this.ordersService.saveOt(updatedOt);
  }

  async handleFormSave(formData: Partial<OT>) {
    let action = '';

    if (this.editingOt) {
      action = 'Edición de OT';
    } else {
      action = 'Creación de OT';
    }

    await this.ordersService.saveOt({
      ...formData,
      Estado_pedido: formData.Estado_pedido || 'PENDIENTE',
      'FECHA INGRESO PLANTA': formData['FECHA INGRESO PLANTA'] || new Date().toISOString().split('T')[0],
    }, { activate: true });

    this.audit.log(this.state.userName(), this.state.userRole(), 'OTS', action, `OT afectada: ${formData.OT}`);
    this.closeForm();
  }

  async deleteOt(ot: OT) {
    if(confirm(`¿Eliminar OT ${ot.OT}?`)) {
        await this.ordersService.deleteOt(String(ot.OT));
        this.audit.log(this.state.userName(), this.state.userRole(), 'OTS', 'Eliminar OT', `Se eliminó la OT ${ot.OT} permanentemente.`);
    }
  }

  async handleImport(data: any[]) {
    try {
      const result = await this.ordersService.importWorkOrders(data);
      this.showImportModal = false;
      this.audit.log(this.state.userName(), this.state.userRole(), 'OTS', 'Importación Masiva', `Se procesaron ${result.total} registros. Nuevos: ${result.created}, Actualizados: ${result.updated}.`);
      alert(`Proceso completado.\n\nBase de Datos:\n- Nuevos: ${result.created}\n- Actualizados: ${result.updated}\n- Total procesados: ${result.total}`);
    } catch (error: any) {
      console.error('Error importing work orders:', error);
      this.showImportModal = false;
      alert(`No se pudo completar la importación de OTs.\n${error?.message || 'Error desconocido.'}`);
    }
  }

  // DB Selector
  openDbSelector() {
      if(this.ordersService.internalDatabase.length === 0) {
          alert('Base de datos vacía. Importe primero.');
          return;
      }
      this.dbSearchTerm = '';
      this.dbSelectedItems.clear();
      this.showDbSelector = true;
  }
  toggleDbSelection(item: any) {
      const id = String(item.OT);
      this.dbSelectedItems.has(id) ? this.dbSelectedItems.delete(id) : this.dbSelectedItems.add(id);
  }
  isDbSelected(item: any) { return this.dbSelectedItems.has(String(item.OT)); }
  
  isAlreadyInList(item: any) { 
      return this.ordersService.isOtActive(item.OT); 
  }

  addSelectedToActiveList() {
      const db = this.ordersService.internalDatabase;
      const selected = db.filter(i => this.dbSelectedItems.has(String(i.OT)));
      const newItems = selected
          .filter(s => !this.ordersService.isOtActive(String(s.OT)))
          .map(s => ({
              ...s, 
              Estado_pedido: 'PENDIENTE',
              'FECHA INGRESO PLANTA': s['FECHA INGRESO PLANTA'] || new Date().toISOString().split('T')[0]
          }));
      
      if(newItems.length > 0) {
          this.ordersService.activateOts(newItems);
          this.audit.log(this.state.userName(), this.state.userRole(), 'OTS', 'Activar OTs', `Se activaron ${newItems.length} OTs desde la base de datos.`);
          alert(`${newItems.length} OTs agregadas.`);
      } else {
          alert('Las OTs seleccionadas ya están en la lista.');
      }
      this.showDbSelector = false;
  }
}
