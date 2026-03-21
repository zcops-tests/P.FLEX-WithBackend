
import { Component, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../services/inventory.service';
import { CliseItem, DieItem } from '../models/inventory.models';
import { ExcelService } from '../../../services/excel.service';

@Component({
  selector: 'app-inventory-clise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 flex flex-col p-6 max-w-[1920px] mx-auto w-full overflow-hidden h-full bg-[#0f172a] text-slate-200">
          
      <!-- HEADER -->
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
        <div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
               <span class="material-icons text-blue-500 text-2xl">grid_view</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Inventario de Clisés</h1>
          </div>
          <p class="text-slate-400 text-sm mt-1 ml-12">Gestión, trazabilidad y localización de herramental</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <!-- Search -->
          <div class="relative group w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="material-icons text-slate-500 group-focus-within:text-blue-500 text-xl transition-colors">search</span>
            </div>
            <input [(ngModel)]="searchTerm" (ngModelChange)="currentPage = 1" 
                   class="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg leading-5 bg-[#1e293b] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all shadow-sm" 
                   placeholder="Búsqueda rápida..." type="text"/>
          </div>
          
          <input #fileInput type="file" (change)="handleImport($event)" accept=".xlsx, .xls, .csv" class="hidden">
          <button (click)="fileInput.click()" [disabled]="isLoading" 
                  class="inline-flex justify-center items-center px-4 py-2 border border-slate-700 shadow-sm text-sm font-medium rounded-lg text-slate-300 bg-[#1e293b] hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-blue-500 transition-all disabled:opacity-50">
            <span class="material-icons text-lg mr-2">upload_file</span> Importar
          </button>
          
          <button (click)="openModal(null, 'edit')" 
                  class="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-lg shadow-blue-500/20 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-blue-500 transition-all">
            <span class="material-icons text-lg mr-2">add</span> Nuevo Item
          </button>
        </div>
      </header>

      <!-- KPI STATS -->
      <section class="mb-8 flex-shrink-0">
        <div class="bg-[#1e293b] rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
          <div class="flex flex-col lg:flex-row w-full items-stretch divide-y lg:divide-y-0 lg:divide-x divide-slate-700/50">
            
            <div class="lg:w-[20%] p-6 flex flex-col justify-center items-center bg-slate-800/30">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Items</span>
              <div class="flex items-center gap-3">
                <span class="material-icons text-slate-500 text-3xl">inventory_2</span>
                <span class="text-4xl font-black text-white tracking-tight">{{ stats.total | number }}</span>
              </div>
            </div>

            <div class="lg:w-[30%] p-6 flex items-center gap-6 relative group cursor-pointer hover:bg-red-500/5 transition-colors">
              <div class="relative flex-shrink-0 w-20 h-20">
                <svg class="w-full h-full transform -rotate-90">
                  <circle class="text-slate-700" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" stroke-width="6"></circle>
                  <circle class="text-red-500 transition-all duration-1000 ease-out" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" 
                          [attr.stroke-dasharray]="2 * Math.PI * 34" 
                          [attr.stroke-dashoffset]="2 * Math.PI * 34 * (1 - (stats.alert / (stats.total || 1)))" 
                          stroke-width="6" stroke-linecap="round"></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-2xl font-black text-red-500">{{ stats.alert }}</span>
                </div>
              </div>
              <div class="flex-1">
                <h3 class="text-xs font-black text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <span class="material-icons text-sm">warning</span> Alertas / Mant.
                </h3>
                <p class="text-sm font-medium text-slate-300">Clisés en revisión</p>
                <p class="text-[11px] text-slate-500 mt-1 leading-tight">Acción requerida para evitar paros.</p>
              </div>
            </div>

            <div class="lg:w-[30%] p-6 flex items-center gap-6 relative hover:bg-blue-500/5 transition-colors">
              <div class="flex-1 text-right">
                <h3 class="text-xs font-black text-blue-500 uppercase tracking-wide mb-1 flex items-center justify-end gap-1">
                  Uso Acumulado (M) <span class="material-icons text-sm">speed</span>
                </h3>
                <div class="flex flex-col items-end">
                  <span class="text-3xl font-black text-white leading-none">{{ stats.totalUsage / 1000 | number:'1.0-1' }}k</span>
                  <span class="text-[10px] font-bold text-slate-500 uppercase">/ 1M Target</span>
                </div>
              </div>
            </div>

            <div class="lg:w-[20%] p-6 flex flex-col justify-center items-center bg-emerald-500/5 border-l border-emerald-500/20">
              <span class="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Activos / OK</span>
              <div class="flex items-center gap-2">
                <span class="text-4xl font-black text-emerald-400">{{ stats.active | number }}</span>
                <span class="material-icons text-emerald-500 text-xl">check_circle</span>
              </div>
              <span class="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-wide">Listo para Producción</span>
            </div>

          </div>
        </div>
      </section>

      <!-- TABLE -->
      <div class="bg-[#1e293b] rounded-xl shadow-lg border border-slate-700/60 overflow-hidden flex-1 flex flex-col relative">
        <div class="overflow-auto custom-scrollbar flex-1">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#020617]/50 text-slate-400 font-bold sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700">Item</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700">Cliente / Descripción</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-center">Medida</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-center">Parámetros (Z/Ubic)</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-center">Espesor</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-center">Estado</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50 bg-[#1e293b]">
              <tr *ngFor="let item of paginatedCliseList" 
                  class="hover:bg-slate-700/30 transition-colors group cursor-default"
                  [ngClass]="{'bg-red-500/5': item.hasConflict}"
                  (dblclick)="openModal(item, 'view')">
                <td class="px-6 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-4">
                    <div class="h-10 w-10 rounded-lg overflow-hidden border border-slate-600 bg-slate-800 flex-shrink-0 relative group/img">
                      <img [src]="'https://picsum.photos/seed/' + item.id + '/100/100'" 
                           class="h-full w-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" alt="Thumb">
                    </div>
                    <span class="text-sm font-bold text-white font-mono tracking-tight">{{ item.item }}</span>
                  </div>
                </td>
                <td class="px-6 py-3">
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-slate-400 mb-0.5">{{ item.cliente }}</span>
                    <span class="text-sm text-slate-200 font-medium truncate max-w-[240px]" [title]="item.descripcion">
                      {{ item.descripcion }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center">
                  <span class="text-sm font-bold text-slate-300 font-mono">{{ item.ancho || '-' }} X {{ item.avance || '-' }}</span>
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center">
                  <div class="flex items-center justify-center gap-4">
                    <div class="flex flex-col items-center">
                      <span class="text-[9px] text-slate-500 uppercase font-black mb-0.5">Z</span>
                      <span class="text-sm font-bold text-white">{{ item.z }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                      <span class="text-[9px] text-slate-500 uppercase font-black mb-0.5">Ubic</span>
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">
                        {{ item.ubicacion }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center">
                  <span class="text-sm font-medium text-slate-400">{{ item.espesor || '-' }}</span>
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center">
                  <span *ngIf="!item.hasConflict && (item.mtl_acum || 0) < 500000" class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">OK</span>
                  <span *ngIf="item.hasConflict" class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider animate-pulse">REVISAR</span>
                  <span *ngIf="!item.hasConflict && (item.mtl_acum || 0) >= 500000" class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">MANT.</span>
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openModal(item, 'view')" class="text-slate-400 hover:text-blue-400 transition-colors p-1.5 hover:bg-slate-700/50 rounded-lg" title="Ver detalle">
                      <span class="material-icons text-lg">visibility</span>
                    </button>
                    <button (click)="openModal(item, 'edit')" class="text-slate-400 hover:text-blue-400 transition-colors p-1.5 hover:bg-slate-700/50 rounded-lg" title="Editar">
                      <span class="material-icons text-lg">edit</span>
                    </button>
                  </div>
                </td>
              </tr>
              
              <tr *ngIf="paginatedCliseList.length === 0">
                 <td colspan="7" class="p-12 text-center text-slate-500">
                    <div class="flex flex-col items-center">
                       <span class="material-icons text-4xl mb-2 opacity-50">search_off</span>
                       <p>No se encontraron resultados.</p>
                    </div>
                 </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="bg-[#020617]/30 border-t border-slate-700/50 p-4 flex justify-between items-center shrink-0">
           <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Mostrando <span class="text-white">{{ showingStart }} - {{ showingEnd }}</span> de <span class="text-white">{{ totalItems }}</span>
           </p>
           <div class="flex gap-2">
              <button (click)="changePage('prev')" [disabled]="currentPage === 1" 
                      class="p-2 border border-slate-700 bg-[#1e293b] rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors">
                 <span class="material-icons text-sm">chevron_left</span>
              </button>
              <button (click)="changePage('next')" [disabled]="currentPage >= totalPages" 
                      class="p-2 border border-slate-700 bg-[#1e293b] rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors">
                 <span class="material-icons text-sm">chevron_right</span>
              </button>
           </div>
        </div>
      </div>

      <!-- MODAL: CLISE FORM / DETAIL (New Dark Reference Design) -->
      <div *ngIf="showCliseForm" class="fixed inset-0 z-[70] flex items-center justify-center p-0 bg-black/80 backdrop-blur-sm overflow-hidden" role="dialog" aria-modal="true">
          <!-- Main Container -->
          <div class="relative w-full max-w-[1200px] h-full sm:h-[95vh] bg-[#111618] sm:rounded-xl shadow-2xl flex flex-col border border-[#2a343b] overflow-hidden animate-fadeIn">
              
              <!-- Header -->
              <header class="flex items-center justify-between px-8 py-6 border-b border-[#2a343b] bg-[#111618] shrink-0">
                  <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-lg bg-[#1193d4]/20 flex items-center justify-center text-[#1193d4]">
                          <span class="material-icons text-3xl">print</span>
                      </div>
                      <div>
                          <div class="flex items-center gap-3">
                             <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                <span *ngIf="isReadOnly">Detalle de Clisé #{{ currentClise.item }}</span>
                                <input *ngIf="!isReadOnly" [(ngModel)]="currentClise.item" class="bg-[#0d1113] border border-blue-500/50 rounded px-2 py-1 text-white text-xl font-bold w-48" placeholder="Código Item">
                             </h1>
                          </div>
                          <div class="flex items-center gap-2 mt-1">
                              <span class="inline-flex items-center rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20 uppercase">
                                  {{ currentClise.hasConflict ? 'Revisión' : 'Activo' }}
                              </span>
                              <span class="text-[#9db0b9] text-sm">• Datos de Sistema</span>
                          </div>
                      </div>
                  </div>
                  <div class="flex items-center gap-3">
                      <ng-container *ngIf="isReadOnly">
                          <button (click)="isReadOnly = false" class="p-2 text-[#9db0b9] hover:text-white hover:bg-[#1c2327] rounded-lg transition-colors" title="Editar">
                              <span class="material-icons">edit</span>
                          </button>
                          <button class="p-2 text-[#9db0b9] hover:text-white hover:bg-[#1c2327] rounded-lg transition-colors">
                              <span class="material-icons">more_vert</span>
                          </button>
                          <div class="h-6 w-px bg-[#2a343b] mx-2"></div>
                          <button (click)="closeModal()" class="p-2 text-[#9db0b9] hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Cerrar">
                              <span class="material-icons">close</span>
                          </button>
                      </ng-container>
                      <ng-container *ngIf="!isReadOnly">
                          <button (click)="isReadOnly = true" class="px-4 py-2 text-gray-400 hover:text-white font-bold transition-colors">Cancelar</button>
                          <button (click)="saveClise()" class="px-6 py-2 bg-[#1193d4] hover:bg-[#0c6fa1] text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all">
                              <span class="material-icons text-sm">save</span> Guardar
                          </button>
                      </ng-container>
                  </div>
              </header>

              <!-- Content Body -->
              <div class="flex flex-1 overflow-hidden font-sans">
                  
                  <!-- Left Scrollable Area -->
                  <div class="w-full lg:w-2/3 overflow-y-auto custom-scrollbar border-r border-[#2a343b] bg-[#111618]">
                      <div class="p-8 space-y-10">
                          
                          <!-- General Info -->
                          <section>
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">info</span>
                                  Información General
                              </h3>
                              <div class="grid grid-cols-2 gap-x-8 gap-y-6 bg-[#1c2327]/50 p-6 rounded-xl border border-[#2a343b]">
                                  <div class="group">
                                      <p class="text-[#9db0b9] text-xs uppercase tracking-wider font-semibold mb-1">Cliente</p>
                                      <input [readonly]="isReadOnly" [(ngModel)]="currentClise.cliente" class="text-white text-base font-medium bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full placeholder-gray-600" placeholder="---">
                                  </div>
                                  <div>
                                      <p class="text-[#9db0b9] text-xs uppercase tracking-wider font-semibold mb-1">Item Relacionado</p>
                                      <input [readonly]="isReadOnly" [(ngModel)]="currentClise.descripcion" class="text-white text-base font-medium bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full truncate placeholder-gray-600" placeholder="---">
                                  </div>
                                  <div>
                                      <p class="text-[#9db0b9] text-xs uppercase tracking-wider font-semibold mb-1">Orden de Trabajo (OT)</p>
                                      <p class="text-white text-base font-medium">---</p>
                                  </div>
                                  <div>
                                      <p class="text-[#9db0b9] text-xs uppercase tracking-wider font-semibold mb-1">Fecha Ingreso</p>
                                      <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ingreso" type="date" class="text-white text-base font-medium bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full">
                                  </div>
                              </div>
                          </section>

                          <!-- Specs -->
                          <section>
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">settings</span>
                                  Especificaciones Técnicas
                              </h3>
                              <div class="bg-[#1c2327]/50 rounded-xl border border-[#2a343b] divide-y divide-[#2a343b]">
                                  <div class="grid grid-cols-3 p-4">
                                      <div class="px-2">
                                          <p class="text-[#9db0b9] text-xs font-normal">N° FICHA FLER</p>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.n_ficha_fler" class="text-white text-sm font-medium mt-1 bg-transparent w-full outline-none" placeholder="---">
                                      </div>
                                      <div class="px-2 border-l border-[#2a343b]">
                                          <p class="text-[#9db0b9] text-xs font-normal">RODILLO (Z)</p>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.z" class="text-white text-sm font-medium mt-1 bg-transparent w-full outline-none" placeholder="---">
                                      </div>
                                      <div class="px-2 border-l border-[#2a343b]">
                                          <p class="text-[#9db0b9] text-xs font-normal">TIPO IMPRESIÓN</p>
                                          <p class="text-white text-sm font-medium mt-1">Flexografía</p>
                                      </div>
                                  </div>
                                  <div class="grid grid-cols-3 p-4">
                                      <div class="px-2">
                                          <p class="text-[#9db0b9] text-xs font-normal">ANCHO</p>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ancho" class="text-white text-sm font-medium mt-1 bg-transparent w-16 outline-none" placeholder="0"> mm
                                      </div>
                                      <div class="px-2 border-l border-[#2a343b]">
                                          <p class="text-[#9db0b9] text-xs font-normal">AVANCE</p>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.avance" class="text-white text-sm font-medium mt-1 bg-transparent w-16 outline-none" placeholder="0"> mm
                                      </div>
                                      <div class="px-2 border-l border-[#2a343b]">
                                          <p class="text-[#9db0b9] text-xs font-normal">DISTORSIÓN</p>
                                          <p class="text-white text-sm font-medium mt-1">---</p>
                                      </div>
                                  </div>
                                  <div class="grid grid-cols-3 p-4">
                                      <div class="px-2">
                                          <p class="text-[#9db0b9] text-xs font-normal">COLORES</p>
                                          <div class="flex gap-1 mt-1 flex-wrap">
                                               <!-- Placeholder if no data, text input if needed -->
                                              <input [readonly]="isReadOnly" [(ngModel)]="currentClise.colores" class="text-white text-sm font-medium bg-transparent w-full outline-none" placeholder="---">
                                          </div>
                                      </div>
                                      <div class="px-2 border-l border-[#2a343b]">
                                          <p class="text-[#9db0b9] text-xs font-normal">ACABADO</p>
                                          <p class="text-white text-sm font-medium mt-1">---</p>
                                      </div>
                                      <div class="px-2 border-l border-[#2a343b]">
                                          <p class="text-[#9db0b9] text-xs font-normal">TIPO MATERIAL</p>
                                          <p class="text-white text-sm font-medium mt-1">---</p>
                                      </div>
                                  </div>
                              </div>
                          </section>

                          <!-- Metrics -->
                          <section>
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">analytics</span>
                                  Métricas de Uso
                              </h3>
                              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div class="bg-[#1c2327]/50 p-5 rounded-xl border border-[#2a343b] flex flex-col gap-3">
                                      <div class="flex items-center justify-between mb-1">
                                          <div class="flex items-center gap-2">
                                              <div class="p-1.5 bg-blue-500/10 rounded-md text-blue-400">
                                                  <span class="material-icons text-lg">straighten</span>
                                              </div>
                                              <p class="text-[#9db0b9] text-xs uppercase font-semibold tracking-wide">Metros Acumulados</p>
                                          </div>
                                          <span class="text-[10px] text-[#9db0b9] bg-[#2a343b] px-1.5 py-0.5 rounded">Total: {{ (currentClise.mtl_acum || 0) / 1000 | number:'1.1-1' }}km</span>
                                      </div>
                                      
                                      <div class="space-y-3">
                                          <!-- Real Data Loop -->
                                          <ng-container *ngIf="currentClise.colorUsage && currentClise.colorUsage.length > 0; else noColorData">
                                              <div *ngFor="let color of currentClise.colorUsage" class="flex items-center justify-between text-sm group">
                                                  <div class="flex items-center gap-3">
                                                      <div class="w-3 h-3 rounded-full ring-2 ring-opacity-20" [ngStyle]="{'background-color': getColorHex(color.name), '--tw-ring-color': getColorHex(color.name)}"></div>
                                                      <span class="text-white font-medium">{{ color.name }}</span>
                                                  </div>
                                                  <div class="flex items-center gap-4 flex-1 justify-end">
                                                      <div class="w-24 h-1.5 bg-[#2a343b] rounded-full overflow-hidden">
                                                          <!-- Calculate width relative to max or total if needed, here just 100 for simplicity or logic -->
                                                          <div class="h-full rounded-full w-full" [style.background-color]="getColorHex(color.name)"></div>
                                                      </div>
                                                      <span class="text-white font-mono min-w-[60px] text-right">{{ color.meters | number }} m</span>
                                                  </div>
                                              </div>
                                          </ng-container>
                                          <ng-template #noColorData>
                                              <div class="text-center p-4 text-gray-500 text-xs italic">
                                                  No hay desglose por color registrado.
                                              </div>
                                          </ng-template>
                                      </div>
                                  </div>
                                  
                                  <div class="bg-[#1c2327]/50 p-4 rounded-xl border border-[#2a343b] flex items-center gap-4">
                                      <div class="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                                          <span class="material-icons">loop</span>
                                      </div>
                                      <div>
                                          <p class="text-[#9db0b9] text-xs uppercase">Ciclos de Impresión</p>
                                          <p class="text-2xl font-bold text-white tracking-tight">--- <span class="text-sm text-[#9db0b9] font-normal">órdenes</span></p>
                                      </div>
                                  </div>
                              </div>
                          </section>

                          <!-- Dies -->
                          <section>
                              <div class="flex items-center justify-between mb-4">
                                  <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                      <span class="material-icons text-[#1193d4] text-xl">content_cut</span>
                                      Troqueles Compatibles
                                  </h3>
                              </div>

                              <!-- Search Input (Only Edit Mode) -->
                              <div *ngIf="!isReadOnly" class="relative mb-4">
                                  <div class="flex items-center bg-[#1c2327] border border-[#2a343b] rounded-lg px-3 py-2 focus-within:border-[#1193d4] transition-colors">
                                      <span class="material-icons text-gray-500 mr-2">search</span>
                                      <input type="text" 
                                             [ngModel]="dieSearchTerm" 
                                             (ngModelChange)="searchDies($event)"
                                             placeholder="Buscar y agregar troquel..." 
                                             class="bg-transparent border-none text-white text-sm w-full focus:outline-none placeholder-gray-600">
                                  </div>
                                  
                                  <!-- Dropdown Results -->
                                  <div *ngIf="dieSearchResults.length > 0" class="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1c2327] border border-[#2a343b] rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                      <div *ngFor="let result of dieSearchResults" 
                                           (click)="addLinkedDie(result)"
                                           class="px-4 py-2 hover:bg-[#2a343b] cursor-pointer flex justify-between items-center group">
                                          <div>
                                              <div class="text-white font-bold text-sm">{{ result.serie }}</div>
                                              <div class="text-xs text-gray-500">{{ result.medida }} • Z: {{ result.z }}</div>
                                          </div>
                                          <span class="material-icons text-[#1193d4] opacity-0 group-hover:opacity-100 text-sm">add_circle</span>
                                      </div>
                                  </div>
                              </div>

                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <!-- Linked Dies Logic -->
                                  <ng-container *ngIf="compatibleDies.length > 0; else noDies">
                                      <div *ngFor="let die of compatibleDies" class="bg-[#1c2327]/50 p-4 rounded-xl border border-[#2a343b] hover:border-[#1193d4]/50 transition-colors group relative">
                                          
                                          <!-- Delete Button (Only manual links in edit mode) -->
                                          <button *ngIf="!isReadOnly && isExplicitlyLinked(die.id)" 
                                                  (click)="removeLinkedDie(die.id)"
                                                  class="absolute top-2 right-2 text-gray-600 hover:text-red-500 transition-colors z-10" title="Desvincular">
                                              <span class="material-icons text-sm">close</span>
                                          </button>

                                          <div class="flex justify-between items-start mb-2">
                                              <div class="flex items-center gap-2">
                                                  <span class="material-icons text-[#9db0b9] group-hover:text-[#1193d4] transition-colors">crop_square</span>
                                                  <div>
                                                      <p class="text-white text-sm font-bold">{{ die.serie }}</p>
                                                      <p class="text-[#9db0b9] text-xs">{{ die.forma || 'Troquel' }}</p>
                                                  </div>
                                              </div>
                                              <span class="inline-flex items-center rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400 ring-1 ring-inset ring-green-500/20 uppercase">
                                                  {{ die.estado || 'OK' }}
                                              </span>
                                          </div>
                                          <div class="grid grid-cols-2 gap-2 text-xs mt-3">
                                              <div class="bg-[#2a343b]/50 p-2 rounded">
                                                  <span class="block text-[#9db0b9] text-[10px] uppercase">Z</span>
                                                  <span class="text-white font-medium">{{ die.z }}</span>
                                              </div>
                                              <div class="bg-[#2a343b]/50 p-2 rounded">
                                                  <span class="block text-[#9db0b9] text-[10px] uppercase">Medidas</span>
                                                  <span class="text-white font-medium">{{ die.medida }}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </ng-container>
                                  <ng-template #noDies>
                                      <div class="col-span-2 text-center p-6 text-gray-500 text-sm border border-[#2a343b] border-dashed rounded-lg bg-[#1c2327]/30">
                                          <p>No se encontraron troqueles vinculados a "{{ currentClise.troquel || '---' }}"</p>
                                      </div>
                                  </ng-template>
                              </div>
                          </section>

                          <!-- History -->
                          <section>
                              <div class="flex items-center justify-between mb-4">
                                  <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                      <span class="material-icons text-[#1193d4] text-xl">history</span>
                                      Registro de Operaciones
                                  </h3>
                              </div>
                              <div class="bg-[#1c2327] border border-[#2a343b] rounded-xl overflow-hidden">
                                  <div class="max-h-[300px] overflow-y-auto custom-scrollbar">
                                      <table class="w-full text-left text-sm border-collapse">
                                          <thead>
                                              <tr class="bg-[#1c2327] text-[#9db0b9] uppercase text-[10px] tracking-wider border-b border-[#2a343b] sticky top-0 z-10">
                                                  <th class="px-4 py-3 font-semibold">Fecha</th>
                                                  <th class="px-4 py-3 font-semibold">Tipo</th>
                                                  <th class="px-4 py-3 font-semibold">Usuario</th>
                                                  <th class="px-4 py-3 font-semibold">Descripción</th>
                                              </tr>
                                          </thead>
                                          <tbody class="divide-y divide-[#2a343b] text-white">
                                              <ng-container *ngIf="currentClise.history && currentClise.history.length > 0; else emptyHistory">
                                                  <tr *ngFor="let h of currentClise.history" class="hover:bg-white/5 transition-colors">
                                                      <td class="px-4 py-3 font-medium">{{ h.date }}</td>
                                                      <td class="px-4 py-3 text-[#9db0b9]">{{ h.type }}</td>
                                                      <td class="px-4 py-3">{{ h.user }}</td>
                                                      <td class="px-4 py-3 text-sm text-gray-400">{{ h.description }}</td>
                                                  </tr>
                                              </ng-container>
                                              <ng-template #emptyHistory>
                                                  <tr>
                                                      <td colspan="4" class="px-4 py-8 text-center text-gray-500 italic text-xs">
                                                          No hay historial registrado.
                                                      </td>
                                                  </tr>
                                              </ng-template>
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          </section>

                          <!-- Notes -->
                          <section class="pb-10">
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">sticky_note_2</span>
                                  Observaciones
                              </h3>
                              <div class="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg">
                                  <textarea [readonly]="isReadOnly" [(ngModel)]="currentClise.obs" class="w-full bg-transparent border-none text-yellow-100/80 text-sm leading-relaxed outline-none resize-none" rows="3" placeholder="Sin observaciones."></textarea>
                              </div>
                          </section>

                      </div>
                  </div>

                  <!-- Right Sidebar -->
                  <div class="w-full lg:w-1/3 bg-[#161b1e] flex flex-col h-full border-l border-[#2a343b] overflow-y-auto custom-scrollbar">
                      <div class="p-6 flex flex-col gap-6">
                          
                          <!-- Preview Box -->
                          <div class="flex flex-col gap-3">
                              <div class="flex justify-between items-center">
                                  <p class="text-white text-sm font-bold uppercase tracking-wider">Vista Previa</p>
                                  <button class="text-xs text-[#1193d4] hover:text-[#0c6fa1] font-medium flex items-center gap-1">
                                      <span class="material-icons text-sm">download</span> PDF
                                  </button>
                              </div>
                              <div class="w-full aspect-square bg-[#1c2327] rounded-xl border border-[#2a343b] flex items-center justify-center relative overflow-hidden group">
                                  <img [src]="'https://picsum.photos/seed/' + currentClise.id + '/400/400'" class="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-110" alt="Preview">
                                  <div class="absolute inset-0 bg-gradient-to-t from-[#1c2327] via-transparent to-transparent opacity-80"></div>
                                  <div class="absolute bottom-4 left-4">
                                      <span class="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs text-white border border-white/10">v{{ currentClise.n_clises || 1 }}.0</span>
                                  </div>
                              </div>
                          </div>

                          <div class="h-px bg-[#2a343b] w-full"></div>

                          <!-- Location -->
                          <div class="flex flex-col gap-3">
                              <div class="flex justify-between items-center mb-1">
                                  <p class="text-white text-sm font-bold uppercase tracking-wider">Ubicación Física</p>
                                  <span class="text-xs bg-[#1c2327] px-2 py-1 rounded text-[#9db0b9] border border-[#2a343b]">
                                      Planta Monterrey
                                  </span>
                              </div>
                              <div class="bg-[#1c2327] rounded-xl p-4 border border-[#2a343b] flex flex-col gap-4">
                                  <div class="flex justify-between text-xs text-[#9db0b9] mb-1">
                                      <span>Estante {{ (currentClise.ubicacion || '---').split('-')[0] }}</span>
                                      <span>---</span>
                                  </div>
                                  <!-- Visual Grid Placeholder (Static representation) -->
                                  <div class="grid grid-cols-4 gap-2 w-full aspect-video">
                                      <div *ngFor="let box of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]" 
                                           class="rounded flex items-center justify-center text-[10px] bg-[#2a343b] text-[#4a5e69]">
                                           <span>.</span>
                                      </div>
                                  </div>
                                  <div class="text-xs text-[#9db0b9] text-center mt-1">
                                      Posición Actual: <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ubicacion" class="bg-transparent border-b border-[#1193d4] text-white font-mono w-16 text-center outline-none">
                                  </div>
                              </div>
                          </div>

                          <div class="mt-auto pt-6">
                              <button *ngIf="isReadOnly" (click)="printCliseLabel()" class="w-full bg-[#1193d4] hover:bg-[#0c6fa1] text-white font-bold py-4 px-6 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98]">
                                  <span class="material-icons">print</span>
                                  Imprimir Etiqueta ID
                              </button>
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </div>

      <!-- MODAL: IMPORT PREVIEW -->
      <div *ngIf="showImportPreviewModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
         <div class="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-700 animate-fadeIn">
            
            <!-- Header -->
            <div class="bg-[#0f172a] px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
               <div>
                   <h3 class="font-bold text-white text-lg flex items-center gap-2">
                       <span class="material-icons text-blue-500">upload_file</span>
                       Previsualización de Importación
                   </h3>
                   <p class="text-xs text-slate-400 mt-1">
                       Se han procesado {{ previewData.length + conflictsData.length }} registros en total.
                   </p>
               </div>
               <button (click)="cancelImport()" class="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                   <span class="material-icons">close</span>
               </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-hidden flex flex-col bg-[#1e293b]">
                
                <!-- Tabs/Summary -->
                <div class="px-6 py-3 bg-[#1e293b] border-b border-slate-700 flex gap-4 items-center">
                    <div class="px-4 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2">
                        <span class="material-icons text-sm">check_circle</span>
                        {{ previewData.length }} Válidos
                    </div>
                    <div class="px-4 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2" [class.animate-pulse]="conflictsData.length > 0">
                        <span class="material-icons text-sm">warning</span>
                        {{ conflictsData.length }} Conflictos Detectados
                    </div>
                    <p class="text-xs text-slate-500 ml-auto italic">
                        Los registros con conflictos (falta de código o cliente) se marcarán para revisión manual.
                    </p>
                </div>

                <!-- Table Preview -->
                <div class="flex-1 overflow-auto custom-scrollbar p-6">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="text-xs text-slate-400 uppercase bg-[#0f172a] sticky top-0 z-10 font-bold tracking-wider">
                            <tr>
                                <th class="px-4 py-3 border-b border-slate-700 w-16 text-center">#</th>
                                <th class="px-4 py-3 border-b border-slate-700 w-32 text-center">Estado</th>
                                <th class="px-4 py-3 border-b border-slate-700">Código (Item)</th>
                                <th class="px-4 py-3 border-b border-slate-700">Cliente</th>
                                <th class="px-4 py-3 border-b border-slate-700">Descripción</th>
                                <th class="px-4 py-3 border-b border-slate-700">Ubicación</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            <!-- Conflicts First -->
                            <tr *ngFor="let item of conflictsData; let i = index" class="bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                <td class="px-4 py-2 text-slate-500 font-mono text-xs text-center">{{ i + 1 }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wide">
                                        Falta Dato
                                    </span>
                                </td>
                                <td class="px-4 py-2 font-mono font-bold" [ngClass]="item.item ? 'text-white' : 'text-red-500 italic'">{{ item.item || '(VACÍO)' }}</td>
                                <td class="px-4 py-2" [ngClass]="item.cliente ? 'text-slate-300' : 'text-red-500 italic'">{{ item.cliente || '(VACÍO)' }}</td>
                                <td class="px-4 py-2 text-slate-400 truncate max-w-xs">{{ item.descripcion || '---' }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.ubicacion || '-' }}</td>
                            </tr>
                            <!-- Valid Items -->
                            <tr *ngFor="let item of previewData; let i = index" class="hover:bg-slate-700/30 transition-colors">
                                <td class="px-4 py-2 text-slate-500 font-mono text-xs text-center">{{ conflictsData.length + i + 1 }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">OK</span>
                                </td>
                                <td class="px-4 py-2 font-mono text-white font-bold">{{ item.item }}</td>
                                <td class="px-4 py-2 text-slate-300">{{ item.cliente }}</td>
                                <td class="px-4 py-2 text-slate-400 truncate max-w-xs">{{ item.descripcion }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.ubicacion || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-[#0f172a] px-6 py-4 border-t border-slate-700 flex justify-end gap-4 shrink-0">
               <button (click)="cancelImport()" class="px-6 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-colors">
                   Cancelar Importación
               </button>
               <button (click)="confirmImport()" class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
                   <span class="material-icons text-sm">save_alt</span>
                   Importar Todo (Resolver Conflictos Después)
               </button>
            </div>
         </div>
      </div>

    </div>
  `
})
export class InventoryCliseComponent {
  inventoryService = inject(InventoryService);
  excelService = inject(ExcelService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  Math = Math;

  cliseItems: CliseItem[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 20;
  
  // Modal State
  showCliseForm = false;
  isReadOnly = false;
  currentClise: Partial<CliseItem> = {};
  activeDetailTab: 'general' | 'metrics' = 'general';

  // Import State
  isLoading = false;
  showImportPreviewModal = false;
  previewData: CliseItem[] = [];
  conflictsData: CliseItem[] = [];

  // Die Search Logic
  dieSearchTerm = '';
  dieSearchResults: DieItem[] = [];

  constructor() {
    this.inventoryService.cliseItems$.subscribe(items => {
        this.cliseItems = items;
    });
  }

  get paginatedCliseList() {
    const start = (this.currentPage - 1) * this.pageSize;
    const term = this.searchTerm.toLowerCase();
    const filtered = this.cliseItems.filter(i => 
        (this.searchTerm === '' || i.item.toLowerCase().includes(term) || i.descripcion.toLowerCase().includes(term))
    );
    return filtered.slice(start, start + this.pageSize);
  }

  get totalItems() { return this.cliseItems.length; }
  get totalPages() { return Math.ceil(this.totalItems / this.pageSize); }
  get showingStart() { return (this.currentPage - 1) * this.pageSize + 1; }
  get showingEnd() { return Math.min(this.currentPage * this.pageSize, this.totalItems); }

  get stats() {
      const list = this.cliseItems;
      const total = list.length;
      const active = list.filter((i) => !i.hasConflict).length;
      const alert = list.filter((i) => i.hasConflict || (i.mtl_acum || 0) > 500000).length;
      const totalUsage = list.reduce((acc, i) => acc + (i.mtl_acum || 0), 0);
      return { total, active, alert, totalUsage };
  }

  // --- Linked Data Logic ---
  get compatibleDies(): DieItem[] {
      if (!this.currentClise) return [];
      
      const targetSerie = (this.currentClise.troquel || '').trim();
      const linkedIds = this.currentClise.linkedDies || [];

      // Find dies that match the name stored in 'troquel' OR are explicitly linked by ID
      return this.inventoryService.dieItems.filter(die => {
          const matchName = targetSerie && die.serie === targetSerie;
          const matchLink = linkedIds.includes(die.id);
          return matchName || matchLink;
      });
  }

  searchDies(term: string) {
      this.dieSearchTerm = term;
      if (!term.trim()) {
          this.dieSearchResults = [];
          return;
      }
      
      const lowerTerm = term.toLowerCase();
      // Exclude ones already showing to avoid visual duplicates
      const currentLinkedIds = this.compatibleDies.map(d => d.id); 

      this.dieSearchResults = this.inventoryService.dieItems.filter(d => {
          const matchesSearch = d.serie.toLowerCase().includes(lowerTerm) || 
                                (d.medida && d.medida.toLowerCase().includes(lowerTerm));
          const notAlreadyLinked = !currentLinkedIds.includes(d.id);
          return matchesSearch && notAlreadyLinked;
      }).slice(0, 5); // Limit suggestions
  }

  addLinkedDie(die: DieItem) {
      if (!this.currentClise.linkedDies) {
          this.currentClise.linkedDies = [];
      }
      // Avoid duplicates
      if (!this.currentClise.linkedDies.includes(die.id)) {
          this.currentClise.linkedDies.push(die.id);
      }
      this.dieSearchTerm = '';
      this.dieSearchResults = [];
  }

  removeLinkedDie(dieId: string) {
      if (!this.currentClise.linkedDies) return;
      this.currentClise.linkedDies = this.currentClise.linkedDies.filter(id => id !== dieId);
  }

  isExplicitlyLinked(dieId: string): boolean {
      return (this.currentClise.linkedDies || []).includes(dieId);
  }

  getColorHex(name: string): string {
      const n = (name || '').toLowerCase();
      if (n.includes('cyan') || n.includes('cian')) return '#06b6d4'; // Cyan
      if (n.includes('magenta')) return '#d946ef'; // Magenta
      if (n.includes('yellow') || n.includes('amarillo')) return '#facc15'; // Yellow
      if (n.includes('black') || n.includes('negro') || n.includes('key')) return '#e5e7eb'; // Black/White for dark mode contrast
      if (n.includes('orange') || n.includes('naranja')) return '#f97316';
      if (n.includes('green') || n.includes('verde')) return '#22c55e';
      if (n.includes('red') || n.includes('rojo')) return '#ef4444';
      if (n.includes('blue') || n.includes('azul')) return '#3b82f6';
      return '#94a3b8'; // Default slate
  }

  changePage(dir: 'prev' | 'next') {
      if(dir === 'next' && this.currentPage < this.totalPages) this.currentPage++;
      if(dir === 'prev' && this.currentPage > 1) this.currentPage--;
  }

  // --- CRUD ---
  openModal(item: any, mode: 'view' | 'edit') {
      this.isReadOnly = mode === 'view';
      if (item) this.currentClise = JSON.parse(JSON.stringify(item));
      else this.currentClise = { item: '', linkedDies: [], id: Math.random().toString(36).substr(2, 9) };
      this.showCliseForm = true;
  }

  closeModal() {
      this.showCliseForm = false;
      this.dieSearchTerm = '';
      this.dieSearchResults = [];
  }

  saveClise() {
      if (this.currentClise.id) {
          const item = this.currentClise as CliseItem;
          // Check if exists
          const exists = this.cliseItems.find(i => i.id === item.id);
          if (exists) {
             this.inventoryService.updateClise(item);
          } else {
             this.inventoryService.addClises([item]);
          }
      }
      this.closeModal();
  }

  printCliseLabel() {
    const c = this.currentClise as CliseItem;
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;

    const html = `
      <html>
      <head>
        <title>Etiqueta ${c.item}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; text-align: center; }
          .label { border: 2px solid black; padding: 20px; width: 300px; margin: 0 auto; }
          h1 { margin: 0 0 10px; font-size: 24px; }
          p { margin: 5px 0; font-size: 14px; }
        </style>
      </head>
      <body onload="window.print();">
        <div class="label">
          <h1>${c.item}</h1>
          <p><strong>Cliente:</strong> ${c.cliente}</p>
          <p><strong>Descripción:</strong> ${c.descripcion}</p>
          <p><strong>Ubicación:</strong> ${c.ubicacion}</p>
          <p><strong>Ingreso:</strong> ${c.ingreso}</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // --- IMPORT ---
  async handleImport(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.ngZone.runOutsideAngular(async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300)); 
        const rawData = await this.excelService.readExcel(file);
        
        this.ngZone.run(() => {
            const { valid, conflicts } = this.inventoryService.normalizeCliseData(rawData);
            this.previewData = valid;
            this.conflictsData = conflicts;
            this.showImportPreviewModal = true;
            this.isLoading = false;
            event.target.value = '';
        });
      } catch (error: any) {
        this.ngZone.run(() => {
            console.error('Error importing:', error);
            alert(`Error al leer el archivo: ${error.message}`);
            this.isLoading = false;
            event.target.value = '';
        });
      }
    });
  }

  confirmImport() {
      this.inventoryService.addClises([...this.previewData, ...this.conflictsData]);
      alert(`Se importaron ${this.previewData.length + this.conflictsData.length} registros.`);
      this.cancelImport();
  }

  cancelImport() {
      this.showImportPreviewModal = false;
      this.previewData = [];
      this.conflictsData = [];
  }
}
