
import { Component, inject, NgZone, ChangeDetectorRef, OnDestroy, DestroyRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventoryLoadStatus, InventoryService } from '../services/inventory.service';
import { DieItem } from '../models/inventory.models';
import { FileExportService } from '../../../services/file-export.service';
import { StateService } from '../../../services/state.service';
import { InventoryImportPreviewComponent } from './inventory-import-preview.component';
import { InventoryImportColumn } from '../models/inventory-import.models';
import { InventoryImportFlowService } from '../services/inventory-import-flow.service';

@Component({
  selector: 'app-inventory-die',
  standalone: true,
  imports: [CommonModule, FormsModule, InventoryImportPreviewComponent],
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
                  <ng-container *ngIf="canManageInventory">
                      <button (click)="openImportModal()" [disabled]="isLoading || isImporting" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] bg-[#1A222C] hover:bg-[#202A36] hover:text-white border border-[#2D3748] rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                          <span *ngIf="!isLoading && !isImporting" class="material-icons text-[20px]">upload_file</span>
                          <span *ngIf="isLoading || isImporting" class="w-4 h-4 rounded-full border-2 border-slate-500/40 border-t-white animate-spin"></span>
                          {{ isLoading ? 'Analizando...' : (isImporting ? 'Importando...' : 'Importar CSV') }}
                      </button>
                  </ng-container>
                  <button *ngIf="canManageInventory" (click)="openModal(null, 'edit')" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-lg transition-all duration-200">
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
              <div *ngIf="showInitialLoadingOverlay" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1A222C]/88 backdrop-blur-sm">
                  <div class="w-12 h-12 rounded-full border-4 border-[#2D3748] border-t-[#3B82F6] animate-spin mb-4"></div>
                  <h3 class="text-lg font-bold text-white">Cargando inventario de troqueles...</h3>
                  <p class="text-sm text-[#94A3B8] mt-1">Obteniendo registros y preparando la tabla.</p>
              </div>

              <div *ngIf="isLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1A222C]/85 backdrop-blur-sm">
                  <div class="w-14 h-14 rounded-full border-4 border-[#2D3748] border-t-[#3B82F6] animate-spin mb-4"></div>
                  <h3 class="text-lg font-bold text-white">Analizando archivo de troqueles...</h3>
                  <p class="text-sm text-[#94A3B8] mt-1">{{ loadingStatusText }}</p>
                  <div class="w-full max-w-md mt-4">
                      <div class="h-2 rounded-full bg-[#121921] overflow-hidden border border-[#2D3748]">
                          <div class="h-full bg-[#3B82F6] transition-all duration-300" [style.width.%]="loadingProgress"></div>
                      </div>
                      <p class="text-xs text-[#64748B] mt-2 text-center">{{ loadingProgress }}% completado</p>
                  </div>
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
                          <tr *ngFor="let item of paginatedDieList" class="bg-[#1A222C] hover:bg-[#202A36] transition-colors group" [ngClass]="{'bg-red-500/5': item.hasConflict}">
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
                                          'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20': !item.hasConflict && item.estado === 'OK',
                                          'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20': item.estado === 'Desgaste' || item.estado === 'Reparacion',
                                          'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20': item.hasConflict || item.estado === 'Dañado'
                                      }">
                                      {{ item.hasConflict ? 'Revisar' : (item.estado === 'Reparacion' ? 'Mantenimiento' : item.estado) }}
                                  </span>
                              </td>
                              <!-- ACCIONES -->
                              <td class="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                  <div class="flex items-center justify-end gap-1">
                                      <button (click)="openModal(item, 'view')" class="text-[#94A3B8] hover:text-white transition-colors p-1"><span class="material-icons">visibility</span></button>
                                      <button *ngIf="canManageInventory" (click)="openModal(item, 'edit')" class="text-[#94A3B8] hover:text-[#3B82F6] transition-colors p-1"><span class="material-icons">edit</span></button>
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
                  <div class="flex items-center gap-2">
                      <button (click)="goToPreviousPage()" [disabled]="currentPage === 1" class="px-3 py-1.5 border border-[#2D3748] rounded text-xs font-medium text-[#94A3B8] hover:bg-[#2D3748] hover:text-white disabled:opacity-50">Anterior</button>
                      <div class="flex items-center gap-1">
                          <button
                            *ngFor="let page of visiblePages"
                            (click)="goToPage(page)"
                            class="min-w-9 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors"
                            [ngClass]="page === currentPage ? 'bg-[#3B82F6] text-white' : 'border border-[#2D3748] text-[#94A3B8] hover:bg-[#2D3748] hover:text-white'">
                              {{ page }}
                          </button>
                      </div>
                      <button (click)="goToNextPage()" [disabled]="currentPage >= totalPages" class="px-3 py-1.5 border border-[#2D3748] rounded text-xs font-medium text-[#94A3B8] hover:bg-[#2D3748] hover:text-white disabled:opacity-50">Siguiente</button>
                  </div>
              </div>
          </div>

      <!-- MODAL: DIE DETAIL -->
      <div *ngIf="showDieForm" class="fixed inset-0 z-50 flex items-center justify-center bg-[#060e20]/90 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <div #dieDetailCard class="die-detail-modal animate-fadeIn flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#424754]/10 bg-[#131b2e] shadow-[0_24px_70px_rgba(0,0,0,0.62)]">
              <header class="flex flex-wrap items-center justify-between gap-4 border-b border-[#424754]/10 bg-[#171f33]/85 px-5 py-3 backdrop-blur-xl">
                  <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                          <span class="material-icons text-xl text-[#adc6ff]">settings_input_component</span>
                          <h3 class="text-base font-extrabold uppercase tracking-tight text-[#dae2fd]">Detalle del Troquel:</h3>
                          <ng-container *ngIf="isReadOnly; else editSerieHeader">
                              <p class="min-w-0 truncate text-base font-extrabold uppercase tracking-tight text-[#dae2fd]">
                                  {{ currentDie.serie || 'Sin serie' }}
                              </p>
                          </ng-container>
                          <ng-template #editSerieHeader>
                              <input type="text" [(ngModel)]="currentDie.serie" class="detail-header-input" placeholder="Serie">
                          </ng-template>
                          <div class="flex items-center gap-1.5 border-l border-[#424754]/20 pl-3 sm:ml-2">
                              <span class="detail-badge-dot h-2 w-2 rounded-full" [ngClass]="getStatusDotClass(currentDie)"></span>
                              <span class="text-[9px] font-bold uppercase tracking-[0.16em]" [ngClass]="getStatusTextClass(currentDie)">
                                  {{ getStatusLabel(currentDie) }}
                              </span>
                          </div>
                      </div>
                      <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-[#c2c6d6]">
                          <span>Cliente:</span>
                          <ng-container *ngIf="isReadOnly; else editClientHeader">
                              <span class="font-semibold text-[#dae2fd]">{{ currentDie.cliente || '---' }}</span>
                          </ng-container>
                          <ng-template #editClientHeader>
                              <input type="text" [(ngModel)]="currentDie.cliente" class="detail-inline-input max-w-[280px]" placeholder="Cliente">
                          </ng-template>
                          <span class="text-[#c2c6d6]/35">|</span>
                          <span>Ubicación:</span>
                          <ng-container *ngIf="isReadOnly; else editLocationHeader">
                              <span class="font-semibold text-[#dae2fd]">{{ currentDie.ubicacion || '---' }}</span>
                          </ng-container>
                          <ng-template #editLocationHeader>
                              <input type="text" [(ngModel)]="currentDie.ubicacion" class="detail-inline-input max-w-[180px]" placeholder="Ubicación">
                          </ng-template>
                      </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                      <button *ngIf="isReadOnly && canManageInventory" (click)="isReadOnly = false" class="detail-action detail-action--muted">
                          <span class="material-icons text-base">edit</span>
                          Editar
                      </button>
                      <ng-container *ngIf="!isReadOnly">
                          <button (click)="isReadOnly = true" class="detail-action detail-action--ghost">
                              <span class="material-icons text-base">undo</span>
                              Cancelar
                          </button>
                          <button (click)="saveDie()" class="detail-action detail-action--primary">
                              <span class="material-icons text-base">save</span>
                              Guardar
                          </button>
                      </ng-container>
                      <button (click)="closeModal()" class="detail-icon-button" aria-label="Cerrar detalle de troquel">
                          <span class="material-icons text-lg">close</span>
                      </button>
                  </div>
              </header>

              <div class="custom-scrollbar max-h-[95vh] flex-1 overflow-y-auto p-5">
                  <div class="space-y-4">
                      <section class="detail-panel p-4">
                          <h4 class="mb-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#adc6ff]">
                              <span class="h-1.5 w-1.5 rounded-full bg-[#adc6ff]"></span>
                              Especificaciones Técnicas
                          </h4>
                          <div class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 md:grid-cols-6">
                              <div class="space-y-0.5">
                                  <span class="detail-label">Medida</span>
                                  <input type="text" [(ngModel)]="currentDie.medida" [readonly]="isReadOnly" class="detail-input" placeholder="---">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Serie</span>
                                  <input type="text" [(ngModel)]="currentDie.serie" [readonly]="isReadOnly" class="detail-input" placeholder="---">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Z</span>
                                  <input type="text" [(ngModel)]="currentDie.z" [readonly]="isReadOnly" class="detail-input" placeholder="---">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Columnas</span>
                                  <input type="number" [(ngModel)]="currentDie.columnas" [readonly]="isReadOnly" class="detail-input" placeholder="0">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Repeticiones</span>
                                  <input type="number" [(ngModel)]="currentDie.repeticiones" [readonly]="isReadOnly" class="detail-input" placeholder="0">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Material</span>
                                  <input type="text" [(ngModel)]="currentDie.material" [readonly]="isReadOnly" class="detail-input" placeholder="---">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Forma</span>
                                  <input type="text" [(ngModel)]="currentDie.forma" [readonly]="isReadOnly" class="detail-input" placeholder="---">
                              </div>
                              <div class="space-y-0.5">
                                  <span class="detail-label">Tipo de troquel</span>
                                  <input type="text" [(ngModel)]="currentDie.tipo_troquel" [readonly]="isReadOnly" class="detail-input" placeholder="---">
                              </div>
                          </div>
                      </section>

                      <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
                          <section class="detail-panel flex flex-col p-4 lg:col-span-8">
                              <div class="mb-3 flex items-center justify-between">
                                  <h4 class="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#b7c8e1]">
                                      <span class="h-1.5 w-1.5 rounded-full bg-[#b7c8e1]"></span>
                                      Dimensiones Comparativas
                                  </h4>
                                  <div class="flex gap-2">
                                      <span class="rounded border border-[#adc6ff]/20 bg-[#adc6ff]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#adc6ff]">Metric</span>
                                      <span class="rounded border border-[#b7c8e1]/20 bg-[#b7c8e1]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#b7c8e1]">Imperial</span>
                                  </div>
                              </div>
                              <div class="overflow-x-auto">
                                  <table class="w-full border-collapse text-left">
                                      <thead>
                                          <tr class="border-b border-[#424754]/10">
                                              <th class="pb-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#c2c6d6]">Parámetro</th>
                                              <th class="pb-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#adc6ff]">MM</th>
                                              <th class="pb-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#b7c8e1]">PLG</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-[#424754]/5">
                                          <tr>
                                              <td class="py-2 text-xs font-medium text-[#dae2fd]">Ancho Total</td>
                                              <td class="py-2 text-xs font-bold text-[#dae2fd]">
                                                  <ng-container *ngIf="isReadOnly; else editAnchoMm">
                                                      {{ formatDecimal(currentDie.ancho_mm) }}
                                                  </ng-container>
                                                  <ng-template #editAnchoMm>
                                                      <input type="number" [(ngModel)]="currentDie.ancho_mm" class="detail-table-input" placeholder="0" step="any">
                                                  </ng-template>
                                              </td>
                                              <td class="py-2 text-xs font-bold text-[#c2c6d6]">
                                                  <ng-container *ngIf="isReadOnly; else editAnchoPlg">
                                                      {{ formatDecimal(currentDie.ancho_plg, 3) }}
                                                  </ng-container>
                                                  <ng-template #editAnchoPlg>
                                                      <input type="number" [(ngModel)]="currentDie.ancho_plg" class="detail-table-input" placeholder="0" step="any">
                                                  </ng-template>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td class="py-2 text-xs font-medium text-[#dae2fd]">Avance / Paso</td>
                                              <td class="py-2 text-xs font-bold text-[#dae2fd]">
                                                  <ng-container *ngIf="isReadOnly; else editAvanceMm">
                                                      {{ formatDecimal(currentDie.avance_mm) }}
                                                  </ng-container>
                                                  <ng-template #editAvanceMm>
                                                      <input type="number" [(ngModel)]="currentDie.avance_mm" class="detail-table-input" placeholder="0" step="any">
                                                  </ng-template>
                                              </td>
                                              <td class="py-2 text-xs font-bold text-[#c2c6d6]">
                                                  <ng-container *ngIf="isReadOnly; else editAvancePlg">
                                                      {{ formatDecimal(currentDie.avance_plg, 3) }}
                                                  </ng-container>
                                                  <ng-template #editAvancePlg>
                                                      <input type="number" [(ngModel)]="currentDie.avance_plg" class="detail-table-input" placeholder="0" step="any">
                                                  </ng-template>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td class="py-2 text-xs font-medium text-[#dae2fd]">PB</td>
                                              <td class="py-2 text-xs font-bold text-[#dae2fd]">
                                                  <ng-container *ngIf="isReadOnly; else editPb">
                                                      {{ currentDie.pb || '---' }}
                                                  </ng-container>
                                                  <ng-template #editPb>
                                                      <input type="text" [(ngModel)]="currentDie.pb" class="detail-table-input" placeholder="---">
                                                  </ng-template>
                                              </td>
                                              <td class="py-2 text-xs font-bold text-[#c2c6d6]">N/D</td>
                                          </tr>
                                          <tr>
                                              <td class="py-2 text-xs font-medium text-[#dae2fd]">SEP / AVA</td>
                                              <td class="py-2 text-xs font-bold text-[#dae2fd]">
                                                  <ng-container *ngIf="isReadOnly; else editSepAva">
                                                      {{ currentDie.sep_ava || '---' }}
                                                  </ng-container>
                                                  <ng-template #editSepAva>
                                                      <input type="text" [(ngModel)]="currentDie.sep_ava" class="detail-table-input" placeholder="---">
                                                  </ng-template>
                                              </td>
                                              <td class="py-2 text-xs font-bold text-[#c2c6d6]">N/D</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </section>

                          <div class="space-y-4 lg:col-span-4">
                              <section class="detail-panel p-4">
                                  <h4 class="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#4edea3]">Métricas de Uso</h4>
                                  <div class="space-y-3">
                                      <div class="flex items-end justify-between gap-4">
                                          <div>
                                              <p class="text-[8px] uppercase tracking-[0.16em] text-[#c2c6d6]">MTL Acum.</p>
                                              <ng-container *ngIf="isReadOnly; else editMtlAcum">
                                                  <p class="text-2xl font-black tracking-tight text-[#adc6ff]">
                                                      {{ currentDie.mtl_acum != null ? (currentDie.mtl_acum | number:'1.0-0') : '---' }}
                                                      <span class="text-[10px] font-medium text-[#c2c6d6]">mts</span>
                                                  </p>
                                              </ng-container>
                                              <ng-template #editMtlAcum>
                                                  <input type="number" [(ngModel)]="currentDie.mtl_acum" class="detail-input max-w-[180px] text-2xl font-black tracking-tight text-[#adc6ff]" placeholder="0">
                                              </ng-template>
                                          </div>
                                          <div class="text-right">
                                              <p class="text-[8px] uppercase tracking-[0.16em] text-[#c2c6d6]">Cantidad</p>
                                              <ng-container *ngIf="isReadOnly; else editCantidad">
                                                  <p class="text-base font-bold text-[#dae2fd]">
                                                      {{ currentDie.cantidad != null ? (currentDie.cantidad | number:'1.0-0') : '---' }}
                                                      <span class="text-[10px] font-medium text-[#c2c6d6]">unidad</span>
                                                  </p>
                                              </ng-container>
                                              <ng-template #editCantidad>
                                                  <input type="number" [(ngModel)]="currentDie.cantidad" class="detail-input max-w-[120px] text-right text-base font-bold" placeholder="0">
                                              </ng-template>
                                          </div>
                                      </div>

                                      <div class="h-1 overflow-hidden rounded-full bg-[#171f33]">
                                          <div class="h-full rounded-full bg-gradient-to-r from-[#adc6ff] to-[#4edea3]" [style.width.%]="getUsageBarWidth()"></div>
                                      </div>

                                      <div class="flex items-center justify-between text-[8px] text-[#c2c6d6]">
                                          <span>
                                              Estado físico:
                                              <span class="font-bold" [ngClass]="getPhysicalStateClass()">{{ getPhysicalStateLabel() }}</span>
                                          </span>
                                          <span>{{ getUsageLifePercent() }}% vida útil estimada</span>
                                      </div>

                                      <div class="flex items-center justify-between gap-3 text-[10px]">
                                          <span class="text-[#c2c6d6]">Estado</span>
                                          <ng-container *ngIf="isReadOnly; else editEstado">
                                              <span class="font-bold text-[#dae2fd]">{{ currentDie.estado || '---' }}</span>
                                          </ng-container>
                                          <ng-template #editEstado>
                                              <div class="relative w-36">
                                                  <select [(ngModel)]="currentDie.estado" class="detail-select w-full rounded-md border border-[#424754]/30 bg-[#060e20]/70 px-3 py-1.5 text-right">
                                                      <option value="OK">OK</option>
                                                      <option value="Desgaste">Desgaste</option>
                                                      <option value="Dañado">Dañado</option>
                                                      <option value="Reparacion">Reparación</option>
                                                      <option value="Mantenimiento">Mantenimiento</option>
                                                  </select>
                                                  <span class="pointer-events-none absolute right-2 top-1.5 material-icons text-sm text-[#c2c6d6]">expand_more</span>
                                              </div>
                                          </ng-template>
                                      </div>
                                  </div>
                              </section>
                              
                              <section class="detail-panel p-4">
                                  <h4 class="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#c2c6d6]">Ubicación y Logística</h4>
                                  <div class="grid grid-cols-1 gap-2">
                                      <div class="flex items-center justify-between gap-3 text-[10px]">
                                          <span class="text-[#c2c6d6]">Ubicación</span>
                                          <ng-container *ngIf="isReadOnly; else editUbicacionCard">
                                              <span class="font-bold text-[#dae2fd]">{{ currentDie.ubicacion || '---' }}</span>
                                          </ng-container>
                                          <ng-template #editUbicacionCard>
                                              <input type="text" [(ngModel)]="currentDie.ubicacion" class="detail-input max-w-[180px] text-right text-[10px]" placeholder="---">
                                          </ng-template>
                                      </div>
                                      <div class="flex items-center justify-between gap-3 text-[10px]">
                                          <span class="text-[#c2c6d6]">Almacén</span>
                                          <ng-container *ngIf="isReadOnly; else editAlmacen">
                                              <span class="font-bold text-[#dae2fd]">{{ currentDie.almacen || '---' }}</span>
                                          </ng-container>
                                          <ng-template #editAlmacen>
                                              <input type="text" [(ngModel)]="currentDie.almacen" class="detail-input max-w-[180px] text-right text-[10px]" placeholder="---">
                                          </ng-template>
                                      </div>
                                      <div class="flex items-center justify-between gap-3 text-[10px]">
                                          <span class="text-[#c2c6d6]">Ingreso</span>
                                          <ng-container *ngIf="isReadOnly; else editIngreso">
                                              <span class="font-medium text-[#dae2fd]">{{ currentDie.ingreso || '---' }}</span>
                                          </ng-container>
                                          <ng-template #editIngreso>
                                              <input type="text" [(ngModel)]="currentDie.ingreso" class="detail-input max-w-[180px] text-right text-[10px]" placeholder="---">
                                          </ng-template>
                                      </div>
                                  </div>
                              </section>
                          </div>
                      </div>

                      <section class="detail-panel p-4">
                          <h4 class="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#c2c6d6]">Observaciones (OBS)</h4>
                          <div class="min-h-[76px] rounded-lg border border-[#424754]/10 bg-[#060e20]/55 p-3">
                              <ng-container *ngIf="isReadOnly; else editObservaciones">
                                  <p class="whitespace-pre-wrap text-[11px] italic leading-relaxed text-[#c2c6d6]">
                                      {{ currentDie.observaciones || 'Sin observaciones registradas.' }}
                                  </p>
                              </ng-container>
                              <ng-template #editObservaciones>
                                  <textarea [(ngModel)]="currentDie.observaciones" class="detail-textarea" placeholder="Sin observaciones registradas."></textarea>
                              </ng-template>
                          </div>
                      </section>

                      <section *ngIf="showHistoryDetails" class="detail-panel p-4">
                          <h4 class="mb-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#b7c8e1]">
                              <span class="h-1.5 w-1.5 rounded-full bg-[#b7c8e1]"></span>
                              Historial de Mantenimiento
                          </h4>
                          <div class="custom-scrollbar max-h-56 overflow-auto">
                              <table class="w-full border-collapse text-left">
                                  <thead>
                                      <tr class="border-b border-[#424754]/10">
                                          <th class="pb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#c2c6d6]">Fecha</th>
                                          <th class="pb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#c2c6d6]">Usuario</th>
                                          <th class="pb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#c2c6d6]">Acción</th>
                                          <th class="pb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#c2c6d6]">Detalle</th>
                                      </tr>
                                  </thead>
                                  <tbody class="divide-y divide-[#424754]/5">
                                      <ng-container *ngIf="historyEntries.length > 0; else emptyHistory">
                                          <tr *ngFor="let h of historyEntries">
                                              <td class="py-2 text-[10px] text-[#dae2fd]">{{ h.date }}</td>
                                              <td class="py-2 text-[10px] font-semibold text-[#dae2fd]">{{ h.user }}</td>
                                              <td class="py-2">
                                                  <span class="inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold uppercase" [ngClass]="getHistoryBadgeClass(h.type)">
                                                      {{ h.type }}
                                                  </span>
                                              </td>
                                              <td class="py-2 text-[10px] text-[#c2c6d6]">{{ h.description }}</td>
                                          </tr>
                                      </ng-container>
                                      <ng-template #emptyHistory>
                                          <tr>
                                              <td colspan="4" class="py-8 text-center text-xs italic text-[#c2c6d6]">
                                                  No hay historial registrado para este troquel.
                                              </td>
                                          </tr>
                                      </ng-template>
                                  </tbody>
                              </table>
                          </div>
                      </section>

                      <div class="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-[#424754]/10 pt-4">
                          <button (click)="exportCurrentDieSheet()" [disabled]="isExporting" class="detail-action detail-action--ghost">
                              <span class="material-icons text-base">{{ isExporting ? 'hourglass_top' : 'download' }}</span>
                              {{ isExporting ? 'Exportando...' : 'Exportar ficha' }}
                          </button>
                          <button (click)="toggleHistoryDetails()" class="detail-action detail-action--ghost">
                              <span class="material-icons text-base">history</span>
                              {{ showHistoryDetails ? 'Ocultar historial' : 'Historial' }}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <app-inventory-import-preview
        [show]="showImportModal"
        [step]="importStep"
        title="Carga Masiva de Troqueles"
        subtitle="Importe registros de troqueles desde Excel o CSV"
        uploadHint="El sistema detectará campos faltantes y marcará los conflictos para resolverlos después."
        [isLoading]="isLoading"
        [validRows]="previewData"
        [conflictRows]="conflictsData"
        [discardedCount]="discardedRowsCount"
        [columns]="importPreviewColumns"
        [isImporting]="isImporting"
        [analysisPhase]="loadingPhaseLabel"
        [analysisPercentage]="loadingProgress"
        [analysisProcessedItems]="analysisProcessedItems"
        [analysisTotalItems]="analysisTotalItems"
        [analysisDetail]="loadingStatusText"
        importingTitle="Importando troqueles..."
        confirmButtonLabel="Confirmar Importación"
        [importProgressPercent]="importProgressPercent"
        [importProgressText]="importProgressText"
        [importProcessedItems]="importProcessedItems"
        [importTotalItems]="importTotalItems"
        [importTotalBatches]="importTotalBatches"
        [importCurrentBatchLabel]="importCurrentBatchLabel"
        [importStatusLabel]="importStatusLabel"
        [previewLimit]="importPreviewLimit"
        (closeRequested)="closeImportModal()"
        (fileSelected)="processImportFile($event)"
        (resetRequested)="resetImportFlow()"
        (confirmRequested)="confirmImport()">
      </app-inventory-import-preview>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #060e20; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 999px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.28s ease-out; }
    .die-detail-modal { font-family: sans-serif, 'Inter', system-ui; }
    .detail-panel { background: rgba(34, 42, 61, 0.4); border: 1px solid rgba(66, 71, 84, 0.08); border-radius: 0.75rem; }
    .detail-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #c2c6d6; }
    .detail-input,
    .detail-table-input,
    .detail-header-input,
    .detail-inline-input,
    .detail-textarea,
    .detail-select { width: 100%; border: 0; background: transparent; color: #dae2fd; outline: none; padding: 0; }
    .detail-input::placeholder,
    .detail-table-input::placeholder,
    .detail-header-input::placeholder,
    .detail-inline-input::placeholder,
    .detail-textarea::placeholder { color: rgba(194, 198, 214, 0.38); }
    .detail-input { font-size: 0.92rem; font-weight: 700; }
    .detail-table-input { font-size: 0.78rem; font-weight: 700; }
    .detail-header-input { min-width: 180px; max-width: 220px; font-size: 1rem; font-weight: 800; text-transform: uppercase; }
    .detail-inline-input { width: auto; min-width: 140px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .detail-textarea { min-height: 76px; resize: vertical; font-size: 11px; line-height: 1.6; }
    .detail-select { appearance: none; font-size: 0.85rem; font-weight: 700; }
    .detail-action { display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 0.5rem; padding: 0.55rem 0.9rem; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.18s ease; }
    .detail-action:hover { transform: translateY(-1px); }
    .detail-action:disabled { cursor: not-allowed; opacity: 0.65; transform: none; }
    .detail-action--primary { background: linear-gradient(135deg, #adc6ff, #4d8eff); color: #00285d; }
    .detail-action--muted,
    .detail-action--ghost { background: rgba(45, 52, 73, 0.72); }
    .detail-action--muted { color: #dae2fd; }
    .detail-action--ghost { color: #c2c6d6; }
    .detail-action--ghost:hover,
    .detail-action--muted:hover { background: #31394d; color: #dae2fd; }
    .detail-icon-button { display: inline-flex; align-items: center; justify-content: center; height: 2rem; width: 2rem; border-radius: 999px; color: #c2c6d6; transition: all 0.18s ease; }
    .detail-icon-button:hover { background: #2d3449; color: #dae2fd; }
    .detail-badge-dot { box-shadow: 0 0 8px rgba(78, 222, 163, 0.35); }
  `]
})
export class InventoryDieComponent implements OnDestroy {
  inventoryService = inject(InventoryService);
  importFlow = inject(InventoryImportFlowService);
  fileExport = inject(FileExportService);
  state = inject(StateService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  destroyRef = inject(DestroyRef);
  Math = Math;
  @ViewChild('dieDetailCard') dieDetailCard?: ElementRef<HTMLElement>;

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
  readonly importPreviewLimit = 120;
  readonly importPreviewColumns: InventoryImportColumn<DieItem>[] = [
    { label: 'Serie / Código', value: (item) => item.serie, emptyValue: '(VACÍO)', mono: true },
    { label: 'Cliente', value: (item) => item.cliente, emptyValue: '(VACÍO)' },
    { label: 'Medida', value: (item) => item.medida },
    { label: 'Ubicación', value: (item) => item.ubicacion, emptyValue: '-' },
  ];
  loadStatus: InventoryLoadStatus = {
      state: 'idle',
      lastSuccessfulSync: null,
      errorMessage: null,
  };

  // Modal
  showDieForm = false;
  isReadOnly = false;
  currentDie: Partial<DieItem> = {};
  showHistoryDetails = false;
  isExporting = false;

  // Import
  isLoading = false;
  showImportModal = false;
  importStep: 'upload' | 'preview' = 'upload';
  isImporting = false;
  loadingProgress = 0;
  loadingStatusText = 'Preparando archivo...';
  analysisTotalItems = 0;
  analysisProcessedItems = 0;
  importProgressPercent = 0;
  importProgressText = '';
  importProcessedItems = 0;
  importTotalItems = 0;
  importTotalBatches = 0;
  showImportPreviewModal = false;
  previewData: DieItem[] = [];
  conflictsData: DieItem[] = [];
  discardedRowsCount = 0;
  private loadingProgressInterval?: number;

  get canManageInventory() {
      return this.state.hasPermission('inventory.dies.manage');
  }

  get showInitialLoadingOverlay() {
      return this.loadStatus.state === 'loading' && this.dieItems.length === 0 && !this.isLoading;
  }

  get loadingPhaseLabel() {
      return this.importStep === 'preview' ? 'Análisis completado' : 'Analizando archivo';
  }

  get importCurrentBatchLabel() {
      if (this.importTotalBatches <= 0 || this.importProcessedItems <= 0) return '1';
      const approxBatchSize = Math.max(1, Math.ceil(this.importTotalItems / this.importTotalBatches));
      return String(Math.min(this.importTotalBatches, Math.max(1, Math.ceil(this.importProcessedItems / approxBatchSize))));
  }

  get importStatusLabel() {
      if (this.importTotalBatches <= 0 || this.importProcessedItems === 0) return 'Preparando lotes...';
      return this.importProgressPercent >= 100 ? 'Finalizando recarga...' : 'Aplicando cambios...';
  }

  constructor() {
    this.inventoryService.dieItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => {
        this.ngZone.run(() => {
          this.dieItems = items;
          this.currentPage = Math.min(this.currentPage, this.totalPages);
          this.requestViewRefresh();
        });
      });

    this.inventoryService.loadStatus$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.ngZone.run(() => {
          this.loadStatus = status;
          this.requestViewRefresh();
        });
      });
  }

  ngOnDestroy() {
      this.stopLoadingProgressSimulation();
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
  get visiblePages() {
      const total = this.totalPages;
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(total, start + 4);
      const adjustedStart = Math.max(1, end - 4);
      return Array.from(
        { length: end - adjustedStart + 1 },
        (_, index) => adjustedStart + index,
      );
  }

  get stats() {
      const total = this.dieItems.length;
      const available = this.dieItems.filter(d => !d.hasConflict && d.estado === 'OK').length;
      const maintenance = this.dieItems.filter(d => d.estado === 'Reparacion' || d.estado === 'Mantenimiento').length;
      const critical = this.dieItems.filter(d => d.hasConflict || d.estado === 'Dañado' || d.estado === 'Desgaste').length;
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

  goToPreviousPage() {
      this.goToPage(this.currentPage - 1);
  }

  goToNextPage() {
      this.goToPage(this.currentPage + 1);
  }

  goToPage(page: number) {
      this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
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

  get historyEntries() {
      return this.currentDie.history || [];
  }

  formatDecimal(value: number | null | undefined, digits = 2) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return '---';
      return new Intl.NumberFormat('es-PE', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
      }).format(Number(value));
  }

  getUsageBarWidth() {
      const percent = this.getUsageLifePercent();
      return percent === 0 ? 0 : Math.max(6, percent);
  }

  getUsageLifePercent() {
      const usage = Math.max(0, Number(this.currentDie.mtl_acum || 0));
      const reference = 500000;
      return Math.max(0, Math.min(100, 100 - Math.round((usage / reference) * 100)));
  }

  getPhysicalStateLabel() {
      if (this.currentDie.hasConflict) return 'REVISAR';

      switch (this.normalizeDieState(this.currentDie.estado)) {
          case 'danado':
              return 'CRITICO';
          case 'desgaste':
              return 'DESGASTE';
          case 'reparacion':
          case 'mantenimiento':
              return 'MANTENIMIENTO';
          default:
              return 'OPTIMO';
      }
  }

  getPhysicalStateClass() {
      if (this.currentDie.hasConflict) return 'text-[#ffb4ab]';

      switch (this.normalizeDieState(this.currentDie.estado)) {
          case 'danado':
              return 'text-[#ff8a80]';
          case 'desgaste':
          case 'reparacion':
          case 'mantenimiento':
              return 'text-[#ffd166]';
          default:
              return 'text-[#4edea3]';
      }
  }

  getStatusLabel(item: Partial<DieItem>) {
      if (item.hasConflict) return 'Revisar';

      switch (this.normalizeDieState(item.estado)) {
          case 'danado':
              return 'Dañado';
          case 'desgaste':
              return 'Desgaste';
          case 'reparacion':
          case 'mantenimiento':
              return 'Mantenimiento';
          default:
              return 'Listo para producción';
      }
  }

  getStatusTextClass(item: Partial<DieItem>) {
      if (item.hasConflict) return 'text-[#ffb4ab]';

      switch (this.normalizeDieState(item.estado)) {
          case 'danado':
              return 'text-[#ff8a80]';
          case 'desgaste':
          case 'reparacion':
          case 'mantenimiento':
              return 'text-[#ffd166]';
          default:
              return 'text-[#4edea3]';
      }
  }

  getStatusDotClass(item: Partial<DieItem>) {
      if (item.hasConflict) return 'bg-[#ff6b6b]';

      switch (this.normalizeDieState(item.estado)) {
          case 'danado':
              return 'bg-[#ff6b6b]';
          case 'desgaste':
          case 'reparacion':
          case 'mantenimiento':
              return 'bg-[#ffd166]';
          default:
              return 'bg-[#4edea3]';
      }
  }

  getHistoryBadgeClass(type: string | undefined) {
      switch (type) {
          case 'Mantenimiento':
              return 'bg-[#4edea3]/10 text-[#4edea3]';
          case 'Reparación':
          case 'Baja':
              return 'bg-[#ff5252]/10 text-[#ff8a80]';
          case 'Cambio Versión':
          case 'Creación':
              return 'bg-[#adc6ff]/10 text-[#adc6ff]';
          default:
              return 'bg-[#b7c8e1]/10 text-[#b7c8e1]';
      }
  }

  toggleHistoryDetails() {
      this.showHistoryDetails = !this.showHistoryDetails;
  }

  async exportCurrentDieSheet() {
      if (!this.dieDetailCard?.nativeElement || this.isExporting) return;

      this.isExporting = true;
      try {
          const dateStr = new Date().toISOString().slice(0, 10);
          const identifier = this.currentDie.serie || this.currentDie.id || 'detalle';
          await this.fileExport.exportElementToPdf(
              this.dieDetailCard.nativeElement,
              `Troquel_${identifier}_${dateStr}.pdf`,
              { orientation: 'l', backgroundColor: '#131b2e' },
          );
      } catch {
          alert('No se pudo exportar la ficha del troquel.');
      } finally {
          this.isExporting = false;
      }
  }

  private normalizeDieState(value: string | undefined) {
      const normalized = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes('repar')) return 'reparacion';
      if (normalized.includes('manten')) return 'mantenimiento';
      if (normalized.includes('desgast')) return 'desgaste';
      if (normalized.includes('dan')) return 'danado';
      if (normalized.includes('ok') || normalized.includes('listo') || normalized.includes('prod')) return 'ok';
      return normalized;
  }

  // --- CRUD ---
  openModal(item: any, mode: 'view' | 'edit') {
      if (!item && !this.canManageInventory) return;
      const effectiveMode = this.canManageInventory ? mode : 'view';
      this.isReadOnly = effectiveMode === 'view';
      this.showHistoryDetails = false;

      if (item) {
          this.currentDie = JSON.parse(JSON.stringify(item));
      } else {
          this.currentDie = {
              id: Math.random().toString(36).slice(2, 11),
              medida: '',
              ubicacion: '',
              serie: '',
              linkedClises: [],
              ancho_mm: null,
              avance_mm: null,
              ancho_plg: null,
              avance_plg: null,
              z: '',
              columnas: null,
              repeticiones: null,
              material: '',
              forma: '',
              cliente: '',
              observaciones: '',
              ingreso: '',
              pb: '',
              sep_ava: '',
              estado: 'OK',
              cantidad: null,
              almacen: '',
              mtl_acum: 0,
              tipo_troquel: '',
              history: [],
              hasConflict: false,
          };
      }
      this.showDieForm = true;
  }

  closeModal() {
      this.showDieForm = false;
      this.showHistoryDetails = false;
      this.isExporting = false;
  }

  async saveDie() {
      if (!this.canManageInventory) return;
      if (this.currentDie.id) {
          const item = this.currentDie as DieItem;
          const exists = this.dieItems.find(i => i.id === item.id);
          try {
             if (exists) {
                await this.inventoryService.updateDie(item);
             } else {
                await this.inventoryService.addDies([item]);
             }
             this.closeModal();
          } catch (error: any) {
             alert(`Error al guardar: ${error?.message || 'No se pudo persistir el troquel.'}`);
          }
      }
  }

  // --- IMPORT ---
  openImportModal() {
    if (!this.canManageInventory) return;
    this.showImportModal = true;
    this.importStep = 'upload';
    this.previewData = [];
    this.conflictsData = [];
    this.discardedRowsCount = 0;
    this.importProgressPercent = 0;
    this.importProgressText = '';
  }

  closeImportModal() {
    if (this.isLoading || this.isImporting) return;
    this.resetImportFlow();
    this.showImportModal = false;
  }

  resetImportFlow() {
    if (this.isImporting) return;
    this.importStep = 'upload';
    this.showImportPreviewModal = false;
    this.previewData = [];
    this.conflictsData = [];
    this.discardedRowsCount = 0;
    this.importProgressPercent = 0;
    this.importProgressText = '';
    this.importProcessedItems = 0;
    this.importTotalItems = 0;
    this.importTotalBatches = 0;
  }

  async processImportFile(file: File) {
    if (!this.canManageInventory || !file) return;
    this.isLoading = true;
    this.loadingProgress = 0;
    this.loadingStatusText = 'Preparando archivo para análisis...';
    this.analysisProcessedItems = 0;
    this.analysisTotalItems = 0;
    this.previewData = [];
    this.conflictsData = [];
    this.discardedRowsCount = 0;
    this.showImportPreviewModal = false;
    this.importStep = 'upload';
    this.cdr.detectChanges();
    await this.waitForNextPaint();

    try {
      const result = await this.importFlow.analyzeFile<DieItem>({
        entityLabel: 'troqueles',
        file,
        normalize: (rows) => this.inventoryService.normalizeDieData(rows),
        onProgress: (progress) => {
          this.loadingProgress = progress.percentage;
          this.loadingStatusText = progress.detail;
          this.analysisProcessedItems = progress.processedItems;
          this.analysisTotalItems = progress.totalItems;
          this.cdr.detectChanges();
        },
      });

      this.loadingProgress = 100;
      this.loadingStatusText = 'Archivo procesado. Preparando previsualización...';
      this.analysisProcessedItems = result.totalItems;
      this.analysisTotalItems = result.totalItems;
      this.previewData = result.valid;
      this.conflictsData = result.conflicts;
      this.discardedRowsCount = result.discarded.length;
      this.importStep = 'preview';
      this.showImportModal = true;
      this.showImportPreviewModal = true;
    } catch (error: any) {
      console.error('Error importing:', error);
      alert(`Error al leer el archivo: ${error?.message || 'No se pudo procesar el archivo.'}`);
      this.loadingProgress = 0;
      this.loadingStatusText = 'Preparando archivo...';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async confirmImport() {
      if (!this.canManageInventory) return;
      if (this.isImporting) return;
      const itemsToImport = [...this.conflictsData, ...this.previewData];
      if (itemsToImport.length === 0) return;

      this.isImporting = true;
      this.importProgressPercent = 0;
      this.importProgressText = 'Preparando lotes de importacion...';
      this.importProcessedItems = 0;
      this.importTotalItems = itemsToImport.length;
      this.importTotalBatches = Math.max(1, Math.ceil(itemsToImport.length / 200));
      this.cdr.detectChanges();
      await this.waitForNextPaint();

      try {
          const result = await this.inventoryService.importDies(
            itemsToImport,
            ({ currentBatch, totalBatches, processedItems, totalItems }) => {
              this.importProgressPercent = Math.max(5, Math.round((processedItems / Math.max(totalItems, 1)) * 100));
              this.importProgressText = `Lote ${currentBatch} de ${totalBatches} importado (${processedItems}/${totalItems} registros).`;
              this.importProcessedItems = processedItems;
              this.importTotalItems = totalItems;
              this.importTotalBatches = totalBatches;
              this.cdr.detectChanges();
            },
          );
          this.importProgressPercent = 100;
          this.importProcessedItems = itemsToImport.length;
          const summary = result.conflicts > 0
            ? `Se importaron ${result.imported} registros. ${result.conflicts} quedaron marcados para revision.`
            : `Se importaron ${result.imported} registros.`;
          alert(summary);
          this.isImporting = false;
          this.closeImportModal();
      } catch (error: any) {
          alert(`Error al importar: ${error?.message || 'No se pudo completar la importación.'}`);
      } finally {
          this.isImporting = false;
          this.importProgressPercent = 0;
          this.importProgressText = '';
          this.cdr.detectChanges();
      }
  }

  cancelImport() {
      this.closeImportModal();
  }

  private stopLoadingProgressSimulation() {
      if (this.loadingProgressInterval !== undefined) {
          window.clearInterval(this.loadingProgressInterval);
          this.loadingProgressInterval = undefined;
      }
  }

  private waitForNextPaint() {
      return new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
  }

  private requestViewRefresh() {
      this.ngZone.runOutsideAngular(() => {
          window.requestAnimationFrame(() => {
              this.ngZone.run(() => {
                  this.cdr.detectChanges();
              });
          });
      });
  }
}
