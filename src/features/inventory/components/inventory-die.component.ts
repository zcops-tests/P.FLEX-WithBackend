
import { Component, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../services/inventory.service';
import { DieItem } from '../models/inventory.models';
import { ExcelService } from '../../../services/excel.service';

@Component({
  selector: 'app-inventory-die',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-[#121921] flex-1 flex flex-col p-6 max-w-[1920px] mx-auto w-full overflow-hidden h-full">
          <!-- HEADER -->
          <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-[#2D3748] pb-6 shrink-0">
              <div>
                  <div class="flex items-center gap-3">
                      <div class="bg-[#3B82F6]/20 p-2 rounded-lg border border-[#3B82F6]/30">
                          <span class="material-icons text-[#3B82F6] text-3xl">token</span>
                      </div>
                      <div>
                          <h1 class="text-2xl lg:text-3xl font-bold text-white tracking-tight">Inventario de Troqueles</h1>
                          <p class="text-[#94A3B8] text-sm mt-0.5">Vista General • Planta Monterrey</p>
                      </div>
                  </div>
              </div>
              <div class="flex items-center gap-3 w-full md:w-auto">
                  <input #fileInputDie type="file" (change)="handleImport($event)" accept=".xlsx, .xls, .csv" class="hidden">
                  <button (click)="fileInputDie.click()" [disabled]="isLoading || isImporting" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] bg-[#1A222C] hover:bg-[#202A36] hover:text-white border border-[#2D3748] rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span *ngIf="!isLoading && !isImporting" class="material-icons text-[20px]">upload_file</span>
                      <span *ngIf="isLoading || isImporting" class="w-4 h-4 rounded-full border-2 border-slate-500/40 border-t-white animate-spin"></span>
                      {{ isLoading ? 'Analizando...' : (isImporting ? 'Importando...' : 'Importar CSV') }}
                  </button>
                  <button (click)="openModal(null, 'edit')" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-lg transition-all duration-200">
                      <span class="material-icons text-[20px]">add</span> Nuevo Troquel
                  </button>
              </div>
          </header>

          <!-- KPI Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
              <div class="bg-[#1A222C] rounded-xl p-5 border border-[#2D3748] overflow-hidden group relative">
                  <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-8xl text-[#3B82F6]">inventory_2</span></div>
                  <p class="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-1 relative z-10">Total Troqueles</p>
                  <span class="text-3xl font-bold text-white relative z-10">{{ stats.total | number }}</span>
              </div>
              <div class="bg-[#1A222C] rounded-xl p-5 border border-[#2D3748] overflow-hidden group relative hover:border-[#10B981]/50 transition-colors">
                  <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-8xl text-[#10B981]">check_circle</span></div>
                  <p class="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-1 relative z-10">Disponibles</p>
                  <span class="text-3xl font-bold text-white relative z-10">{{ stats.available | number }}</span>
              </div>
              <div class="bg-[#1A222C] rounded-xl p-5 border border-[#2D3748] overflow-hidden group relative hover:border-[#F59E0B]/50 transition-colors">
                  <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-8xl text-[#F59E0B]">build</span></div>
                  <p class="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-1 relative z-10">En Mantenimiento</p>
                  <span class="text-3xl font-bold text-white relative z-10">{{ stats.maintenance | number }}</span>
              </div>
              <div class="bg-[#1A222C] rounded-xl p-5 border border-[#2D3748] overflow-hidden group relative hover:border-[#EF4444]/50 transition-colors">
                  <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-8xl text-[#EF4444]">warning</span></div>
                  <p class="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-1 relative z-10">Uso Crítico</p>
                  <span class="text-3xl font-bold text-white relative z-10">{{ stats.critical | number }}</span>
              </div>
          </div>

          <!-- FILTERS BAR -->
          <div class="bg-[#1A222C] rounded-xl border border-[#2D3748] p-4 mb-6 shadow-lg flex flex-col lg:flex-row gap-4 justify-between items-center shrink-0">
                <div class="relative w-full lg:w-1/3">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="material-icons text-[#94A3B8]">search</span>
                    </div>
                    <input [(ngModel)]="searchTerm" (ngModelChange)="currentPage = 1"
                           class="block w-full pl-10 pr-3 py-2.5 bg-[#121921] border border-[#2D3748] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-colors" 
                           placeholder="Buscar por serie, medida, cliente..." type="text"/>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div class="relative">
                        <select [(ngModel)]="filterZ" (ngModelChange)="currentPage = 1" class="block w-full pl-3 pr-8 py-2.5 bg-[#121921] border border-[#2D3748] rounded-lg text-sm text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer appearance-none">
                            <option value="">Z (Todos)</option>
                            <option *ngFor="let z of uniqueZs" [value]="z">{{ z }}</option>
                        </select>
                    </div>
                    <div class="relative">
                        <select [(ngModel)]="filterMaterial" (ngModelChange)="currentPage = 1" class="block w-full pl-3 pr-8 py-2.5 bg-[#121921] border border-[#2D3748] rounded-lg text-sm text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer appearance-none">
                            <option value="">Material</option>
                            <option *ngFor="let m of uniqueMaterials" [value]="m">{{ m }}</option>
                        </select>
                    </div>
                    <div class="relative">
                        <select [(ngModel)]="filterShape" (ngModelChange)="currentPage = 1" class="block w-full pl-3 pr-8 py-2.5 bg-[#121921] border border-[#2D3748] rounded-lg text-sm text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer appearance-none">
                            <option value="">Forma</option>
                            <option *ngFor="let s of uniqueShapes" [value]="s">{{ s }}</option>
                        </select>
                    </div>
                    <button (click)="clearFilters()" class="flex items-center justify-center px-4 py-2.5 border border-[#2D3748] rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#121921] transition-colors whitespace-nowrap">
                        <span class="material-icons text-[18px] mr-1">filter_alt_off</span> Limpiar
                    </button>
                </div>
          </div>

          <!-- TABLE -->
          <div class="bg-[#1A222C] rounded-xl border border-[#2D3748] overflow-hidden shadow-xl flex-1 flex flex-col relative">
              <div *ngIf="isLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1A222C]/85 backdrop-blur-sm">
                  <div class="w-14 h-14 rounded-full border-4 border-[#2D3748] border-t-[#3B82F6] animate-spin mb-4"></div>
                  <h3 class="text-lg font-bold text-white">Analizando archivo de troqueles...</h3>
                  <p class="text-sm text-[#94A3B8] mt-1">Validando datos antes de mostrar la previsualización.</p>
              </div>
              <div class="overflow-x-auto custom-scrollbar flex-1">
                  <table class="w-full text-sm text-left">
                      <thead class="bg-[#151c24] text-[#94A3B8] font-bold sticky top-0 z-10">
                          <tr>
                              <th class="px-6 py-3 text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('medida')">
                                <div class="flex items-center gap-1">Medida / Forma <span *ngIf="sortColumn === 'medida'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('ubicacion')">
                                <div class="flex items-center gap-1">Ubicación <span *ngIf="sortColumn === 'ubicacion'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-center text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('z')">
                                <div class="flex items-center justify-center gap-1">Z <span *ngIf="sortColumn === 'z'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-center text-xs uppercase tracking-wider border-b border-[#2D3748]">Col / Rep</th>
                              <th class="px-6 py-3 text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('material')">
                                <div class="flex items-center gap-1">Material <span *ngIf="sortColumn === 'material'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('cliente')">
                                <div class="flex items-center gap-1">Cliente <span *ngIf="sortColumn === 'cliente'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('serie')">
                                <div class="flex items-center gap-1">Serie <span *ngIf="sortColumn === 'serie'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-center text-xs uppercase tracking-wider border-b border-[#2D3748] cursor-pointer hover:text-white transition-colors" (click)="toggleSort('estado')">
                                <div class="flex items-center justify-center gap-1">Estado <span *ngIf="sortColumn === 'estado'" class="material-icons text-xs font-bold">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                              </th>
                              <th class="px-6 py-3 text-right text-xs uppercase tracking-wider border-b border-[#2D3748]">Acciones</th>
                          </tr>
                      </thead>
                      <tbody class="divide-y divide-[#2D3748] text-sm">
                          <tr *ngFor="let item of paginatedDieList" class="bg-[#1A222C] hover:bg-[#202A36] transition-colors group">
                              <!-- MEDIDA / FORMA -->
                              <td class="px-6 py-3 whitespace-nowrap text-[#94A3B8]">
                                  <div class="flex items-center gap-2">
                                      <span class="material-icons text-[16px]">{{ getShapeIcon(item.forma) }}</span>
                                      <span class="font-bold text-white">{{ item.medida }}</span>
                                  </div>
                              </td>
                              <!-- UBICACIÓN -->
                              <td class="px-6 py-3 whitespace-nowrap font-mono text-[#94A3B8] font-bold">{{ item.ubicacion }}</td>
                              <!-- Z -->
                              <td class="px-6 py-3 whitespace-nowrap text-center text-white font-medium">{{ item.z }}</td>
                              <!-- COL / REP -->
                              <td class="px-6 py-3 whitespace-nowrap text-center text-[#94A3B8] text-xs">
                                  {{ item.columnas || '-' }} <span class="text-gray-600">/</span> {{ item.repeticiones || '-' }}
                              </td>
                              <!-- MATERIAL -->
                              <td class="px-6 py-3 whitespace-nowrap text-[#94A3B8]">{{ item.material || '---' }}</td>
                              <!-- CLIENTE -->
                              <td class="px-6 py-3 whitespace-nowrap text-white">{{ item.cliente }}</td>
                              <!-- SERIE -->
                              <td class="px-6 py-3 whitespace-nowrap font-mono text-[#3B82F6] font-medium">{{ item.serie }}</td>
                              <!-- ESTADO -->
                              <td class="px-6 py-3 whitespace-nowrap text-center">
                                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                      [ngClass]="{
                                          'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20': item.estado === 'OK',
                                          'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20': item.estado === 'Desgaste' || item.estado === 'Reparacion',
                                          'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20': item.estado === 'Dañado'
                                      }">
                                      {{ item.estado === 'Reparacion' ? 'Mantenimiento' : item.estado }}
                                  </span>
                              </td>
                              <!-- ACCIONES -->
                              <td class="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                  <div class="flex items-center justify-end gap-1">
                                      <button (click)="openModal(item, 'view')" class="text-[#94A3B8] hover:text-white transition-colors p-1"><span class="material-icons">visibility</span></button>
                                      <button (click)="openModal(item, 'edit')" class="text-[#94A3B8] hover:text-[#3B82F6] transition-colors p-1"><span class="material-icons">edit</span></button>
                                  </div>
                              </td>
                          </tr>
                          <tr *ngIf="paginatedDieList.length === 0">
                             <td colspan="9" class="p-8 text-center text-[#94A3B8]">
                                No hay troqueles que coincidan con los filtros.
                             </td>
                          </tr>
                      </tbody>
                  </table>
              </div>
              
              <!-- Pagination -->
              <div class="bg-[#151c24] px-6 py-3 border-t border-[#2D3748] flex items-center justify-between shrink-0">
                  <div class="text-xs text-[#94A3B8]">
                      Mostrando <span class="font-medium text-white">{{ showingStart }}</span> - <span class="font-medium text-white">{{ showingEnd }}</span> de <span class="font-medium text-white">{{ totalItems }}</span>
                  </div>
                  <div class="flex gap-2">
                      <button (click)="changePage('prev')" [disabled]="currentPage === 1" class="px-3 py-1.5 border border-[#2D3748] rounded text-xs font-medium text-[#94A3B8] hover:bg-[#2D3748] hover:text-white disabled:opacity-50">Anterior</button>
                      <button (click)="changePage('next')" [disabled]="currentPage >= totalPages" class="px-3 py-1.5 border border-[#2D3748] rounded text-xs font-medium text-[#94A3B8] hover:bg-[#2D3748] hover:text-white disabled:opacity-50">Siguiente</button>
                  </div>
              </div>
          </div>

      <!-- MODAL: DIE FORM (Updated to Dark Theme) -->
      <div *ngIf="showDieForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div class="bg-[#1e293b] rounded-xl shadow-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
             <div class="bg-[#0f172a] text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/10">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-blue-600/20 rounded-lg text-blue-400 border border-blue-500/30">
                        <span class="material-icons text-xl">token</span>
                    </div>
                    <h3 class="font-bold text-lg">{{ isReadOnly ? 'Detalle de Troquel' : 'Editar Troquel' }}</h3>
                </div>
                <button (click)="closeModal()" class="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"><span class="material-icons">close</span></button>
             </div>
             <div class="flex-1 overflow-y-auto p-8 bg-[#1e293b]">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Serie / Código</label>
                      <input type="text" [(ngModel)]="currentDie.serie" [readonly]="isReadOnly" 
                             class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-sm text-white font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600">
                   </div>
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cliente</label>
                      <input type="text" [(ngModel)]="currentDie.cliente" [readonly]="isReadOnly" 
                             class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600">
                   </div>
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medida</label>
                      <input type="text" [(ngModel)]="currentDie.medida" [readonly]="isReadOnly" 
                             class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600">
                   </div>
                   <div class="grid grid-cols-2 gap-4">
                      <div>
                          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Col</label>
                          <input type="number" [(ngModel)]="currentDie.columnas" [readonly]="isReadOnly" 
                                 class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-sm text-white font-mono text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                      </div>
                      <div>
                          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rep</label>
                          <input type="number" [(ngModel)]="currentDie.repeticiones" [readonly]="isReadOnly" 
                                 class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-sm text-white font-mono text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                      </div>
                   </div>
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado</label>
                      <div class="relative">
                          <select [(ngModel)]="currentDie.estado" [disabled]="isReadOnly" 
                                  class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-sm text-white appearance-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                             <option class="bg-[#0f172a]" value="OK">OK</option>
                             <option class="bg-[#0f172a]" value="Desgaste">Desgaste</option>
                             <option class="bg-[#0f172a]" value="Dañado">Dañado</option>
                             <option class="bg-[#0f172a]" value="Reparacion">En Reparación</option>
                          </select>
                          <span class="absolute right-3 top-3.5 pointer-events-none text-slate-500 material-icons text-lg">expand_more</span>
                      </div>
                   </div>
                </div>
             </div>
             <div class="bg-[#0f172a] px-6 py-4 flex justify-end gap-3 shrink-0 border-t border-white/10">
                <button (click)="closeModal()" class="px-5 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm font-bold hover:bg-white/5 hover:text-white transition-all">Cerrar</button>
                <button *ngIf="!isReadOnly" (click)="saveDie()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    <span class="material-icons text-sm">save</span> Guardar
                </button>
             </div>
          </div>
      </div>

      <!-- IMPORT MODAL (Updated) -->
      <div *ngIf="showImportPreviewModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
         <div class="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-700 animate-fadeIn">
            
            <!-- Header -->
            <div class="bg-[#0f172a] px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
               <div>
                   <h3 class="font-bold text-white text-lg flex items-center gap-2">
                       <span class="material-icons text-blue-500">upload_file</span>
                       Previsualización de Importación (Troqueles)
                   </h3>
                   <p class="text-xs text-slate-400 mt-1">
                       Se han procesado {{ previewData.length + conflictsData.length }} registros en total.
                   </p>
               </div>
               <button (click)="cancelImport()" [disabled]="isImporting" class="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
                        Los registros con conflictos (falta de serie o cliente) se marcarán para revisión manual.
                    </p>
                </div>

                <!-- Table Preview -->
                <div class="flex-1 overflow-auto custom-scrollbar p-6 relative">
                    <div *ngIf="isImporting" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1e293b]/80 backdrop-blur-sm">
                        <div class="w-14 h-14 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin mb-4"></div>
                        <h3 class="text-lg font-bold text-white">Importando troqueles...</h3>
                        <p class="text-sm text-slate-400 mt-1">No cierres esta ventana hasta que finalice.</p>
                    </div>
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="text-xs text-slate-400 uppercase bg-[#0f172a] sticky top-0 z-10 font-bold tracking-wider">
                            <tr>
                                <th class="px-4 py-3 border-b border-slate-700 w-16 text-center">#</th>
                                <th class="px-4 py-3 border-b border-slate-700 w-32 text-center">Estado</th>
                                <th class="px-4 py-3 border-b border-slate-700">Serie / Código</th>
                                <th class="px-4 py-3 border-b border-slate-700">Cliente</th>
                                <th class="px-4 py-3 border-b border-slate-700">Medida</th>
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
                                <td class="px-4 py-2 font-mono font-bold" [ngClass]="item.serie ? 'text-white' : 'text-red-500 italic'">{{ item.serie || '(VACÍO)' }}</td>
                                <td class="px-4 py-2" [ngClass]="item.cliente ? 'text-slate-300' : 'text-red-500 italic'">{{ item.cliente || '(VACÍO)' }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.medida || '---' }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.ubicacion || '-' }}</td>
                            </tr>
                            <!-- Valid Items -->
                            <tr *ngFor="let item of previewData; let i = index" class="hover:bg-slate-700/30 transition-colors">
                                <td class="px-4 py-2 text-slate-500 font-mono text-xs text-center">{{ conflictsData.length + i + 1 }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">OK</span>
                                </td>
                                <td class="px-4 py-2 font-mono text-white font-bold">{{ item.serie }}</td>
                                <td class="px-4 py-2 text-slate-300">{{ item.cliente }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.medida || '---' }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.ubicacion || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-[#0f172a] px-6 py-4 border-t border-slate-700 flex justify-end gap-4 shrink-0">
               <button (click)="cancelImport()" [disabled]="isImporting" class="px-6 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   Cancelar Importación
               </button>
               <button (click)="confirmImport()" [disabled]="isImporting" class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                   <span class="material-icons text-sm">save_alt</span>
                   Importar Todo (Resolver Conflictos Después)
               </button>
            </div>
         </div>
      </div>

    </div>
  `
})
export class InventoryDieComponent {
  inventoryService = inject(InventoryService);
  excelService = inject(ExcelService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  Math = Math;

  dieItems: DieItem[] = [];
  searchTerm = '';
  
  // Specific Filters
  filterZ = '';
  filterMaterial = '';
  filterShape = '';

  // Sorting
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  pageSize = 20;

  // Modal
  showDieForm = false;
  isReadOnly = false;
  currentDie: Partial<DieItem> = {};

  // Import
  isLoading = false;
  isImporting = false;
  showImportPreviewModal = false;
  previewData: DieItem[] = [];
  conflictsData: DieItem[] = [];

  constructor() {
    this.inventoryService.dieItems$.subscribe(items => {
        this.dieItems = items;
    });
  }

  // Derived list based only on Search Term (for dynamic filters)
  get baseList() {
      const term = this.searchTerm.toLowerCase().trim();
      return this.dieItems.filter(i => {
          return !term || 
                 i.serie.toLowerCase().includes(term) || 
                 i.cliente.toLowerCase().includes(term) || 
                 (i.medida && i.medida.toLowerCase().includes(term)) ||
                 (i.ubicacion && i.ubicacion.toLowerCase().includes(term));
      });
  }

  // Dynamic Options (based on search results)
  get uniqueMaterials() {
     return [...new Set(this.baseList.map(d => d.material).filter(m => !!m))].sort();
  }

  get uniqueShapes() {
     return [...new Set(this.baseList.map(d => d.forma).filter(f => !!f))].sort();
  }

  get uniqueZs() {
     return [...new Set(this.baseList.map(d => d.z).filter(z => !!z))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
  }

  get filteredAndSortedList() {
      let list = this.baseList;

      // Apply Filters
      if (this.filterZ) list = list.filter(i => i.z == this.filterZ);
      if (this.filterMaterial) list = list.filter(i => i.material === this.filterMaterial);
      if (this.filterShape) list = list.filter(i => i.forma === this.filterShape);

      // Apply Sort
      if (this.sortColumn) {
          list = [...list].sort((a, b) => {
              const valA = (a as any)[this.sortColumn];
              const valB = (b as any)[this.sortColumn];
              
              const strA = String(valA || '').toLowerCase();
              const strB = String(valB || '').toLowerCase();
              
              return this.sortDirection === 'asc' 
                  ? strA.localeCompare(strB, undefined, {numeric: true}) 
                  : strB.localeCompare(strA, undefined, {numeric: true});
          });
      }

      return list;
  }

  get paginatedDieList() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredAndSortedList.slice(start, start + this.pageSize);
  }

  get totalItems() { return this.filteredAndSortedList.length; }
  get totalPages() { return Math.ceil(this.totalItems / this.pageSize) || 1; }
  get showingStart() { return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get showingEnd() { return Math.min(this.currentPage * this.pageSize, this.totalItems); }

  get stats() {
      const total = this.dieItems.length;
      const available = this.dieItems.filter(d => d.estado === 'OK').length;
      const maintenance = this.dieItems.filter(d => d.estado === 'Reparacion' || d.estado === 'Mantenimiento').length;
      const critical = this.dieItems.filter(d => d.estado === 'Dañado' || d.estado === 'Desgaste').length;
      return { total, available, maintenance, critical };
  }

  // Actions
  toggleSort(column: string) {
      if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
          this.sortColumn = column;
          this.sortDirection = 'asc';
      }
  }

  changePage(dir: 'prev' | 'next') {
      if(dir === 'next' && this.currentPage < this.totalPages) this.currentPage++;
      if(dir === 'prev' && this.currentPage > 1) this.currentPage--;
  }

  clearFilters() {
      this.searchTerm = '';
      this.filterZ = '';
      this.filterMaterial = '';
      this.filterShape = '';
      this.sortColumn = '';
      this.currentPage = 1;
  }

  getShapeIcon(shape: string): string {
      const s = (shape || '').toLowerCase();
      if (s.includes('circ')) return 'circle';
      if (s.includes('cuad') || s.includes('rect')) return 'crop_square';
      return 'pentagon';
  }

  // --- CRUD ---
  openModal(item: any, mode: 'view' | 'edit') {
      this.isReadOnly = mode === 'view';
      if (item) this.currentDie = JSON.parse(JSON.stringify(item));
      else this.currentDie = { serie: '', linkedClises: [], id: Math.random().toString(36).substr(2, 9) };
      this.showDieForm = true;
  }

  closeModal() {
      this.showDieForm = false;
  }

  saveDie() {
      if (this.currentDie.id) {
          const item = this.currentDie as DieItem;
          const exists = this.dieItems.find(i => i.id === item.id);
          if (exists) {
             this.inventoryService.updateDie(item);
          } else {
             this.inventoryService.addDies([item]);
          }
      }
      this.closeModal();
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
            const { valid, conflicts } = this.inventoryService.normalizeDieData(rawData);
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

  async confirmImport() {
      if (this.isImporting) return;

      this.isImporting = true;
      this.cdr.detectChanges();

      try {
          await this.inventoryService.addDies([...this.previewData, ...this.conflictsData]);
          alert(`Se importaron ${this.previewData.length + this.conflictsData.length} registros.`);
          this.cancelImport();
      } catch (error: any) {
          alert(`Error al importar: ${error?.message || 'No se pudo completar la importación.'}`);
      } finally {
          this.isImporting = false;
          this.cdr.detectChanges();
      }
  }

  cancelImport() {
      if (this.isImporting) return;
      this.showImportPreviewModal = false;
      this.previewData = [];
      this.conflictsData = [];
  }
}
