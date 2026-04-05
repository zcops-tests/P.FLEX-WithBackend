
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InventoryLoadStatus, InventoryService } from '../services/inventory.service';
import { CliseItem, DieItem } from '../models/inventory.models';
import { InventoryCliseDetailModalComponent } from './inventory-clise-detail-modal.component';
import { StateService } from '../../../services/state.service';
import { InventoryImportPreviewComponent } from './inventory-import-preview.component';
import { InventoryImportColumn } from '../models/inventory-import.models';
import { InventoryImportFlowService } from '../services/inventory-import-flow.service';

@Component({
  selector: 'app-inventory-clise',
  standalone: true,
  imports: [CommonModule, FormsModule, InventoryCliseDetailModalComponent, InventoryImportPreviewComponent],
  template: `
    <div
      #viewportRoot
      class="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#0b1326] text-[#dae2fd]"
      [style.height.px]="viewportHeight">
      <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#424754]/30 bg-[#0b1326] px-8">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-[#dae2fd]">Inventario de Clisés</h1>
          <p class="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#c2c6d6]/45">Industrial Ops v2.4</p>
        </div>

        <div class="flex items-center gap-3">
          <ng-container *ngIf="canManageInventory">
            <button
              (click)="openImportModal()"
              [disabled]="isLoading || isImporting"
              class="inline-flex items-center gap-2 rounded-xl border border-[#424754]/60 px-5 py-2 text-sm font-semibold text-[#adc6ff] transition-all hover:bg-[#2d3449] disabled:cursor-not-allowed disabled:opacity-50">
              <span *ngIf="!isLoading && !isImporting" class="material-icons text-lg">download</span>
              <span *ngIf="isLoading || isImporting" class="h-4 w-4 rounded-full border-2 border-[#adc6ff]/30 border-t-[#adc6ff] animate-spin"></span>
              {{ isLoading ? 'Analizando...' : (isImporting ? 'Importando...' : 'Importar') }}
            </button>
          </ng-container>
          <button
            *ngIf="canManageInventory"
            (click)="openModal(null, 'edit')"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#448aff] to-[#2979ff] px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(68,138,255,0.4)] active:scale-95">
            <span class="material-icons text-lg">add</span>
            Nuevo Item
          </button>
        </div>
      </header>

      <div class="flex-1 min-h-0 flex flex-col gap-8 overflow-hidden p-8">

        <section class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 shrink-0">
          <div class="relative flex items-center rounded-lg border border-[#424754]/25 bg-[#171f33] p-6">
            <div class="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#448aff]"></div>
            <div class="flex items-center gap-5">
              <span class="material-icons text-5xl text-[#c2c6d6]/35">inventory_2</span>
              <div>
                <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Total Items</p>
                <h2 class="text-4xl font-extrabold tracking-tight text-[#dae2fd]">{{ stats.total | number }}</h2>
              </div>
            </div>
          </div>

          <div class="relative flex items-center rounded-lg border border-[#424754]/25 bg-[#171f33] p-6">
            <div class="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#ff5252]"></div>
            <div class="flex items-center gap-6">
              <div class="relative flex h-16 w-16 items-center justify-center">
                <svg class="gauge-svg h-full w-full" viewBox="0 0 100 100">
                  <circle class="text-[#2d3449]" cx="50" cy="50" fill="transparent" r="45" stroke="currentColor" stroke-width="8"></circle>
                  <circle
                    class="text-[#ff5252]"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="45"
                    stroke="currentColor"
                    [attr.stroke-dasharray]="2 * Math.PI * 45"
                    [attr.stroke-dashoffset]="2 * Math.PI * 45 * (1 - (stats.alert / (stats.total || 1)))"
                    stroke-linecap="round"
                    stroke-width="8"></circle>
                </svg>
                <span class="absolute text-xl font-bold text-[#dae2fd]">{{ stats.alert }}</span>
              </div>
              <div>
                <div class="mb-1 flex items-center gap-1.5 text-[#ff5252]">
                  <span class="material-icons text-sm">warning</span>
                  <p class="text-[10px] font-bold uppercase tracking-[0.28em]">Alertas / Mant.</p>
                </div>
                <h3 class="text-sm font-semibold text-[#dae2fd]">Clisés en revisión</h3>
                <p class="mt-0.5 text-[10px] leading-tight text-[#c2c6d6]">Acción requerida para evitar paros.</p>
              </div>
            </div>
          </div>

          <div class="relative rounded-lg border border-[#424754]/25 bg-[#171f33] p-6">
            <div class="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#adc6ff]"></div>
            <div class="flex justify-between">
              <div></div>
              <div class="text-right">
                <div class="mb-1 flex items-center justify-end gap-1.5 text-[#448aff]">
                  <p class="text-[10px] font-bold uppercase tracking-[0.28em]">Uso Acumulado (M)</p>
                  <span class="material-icons text-sm">open_in_new</span>
                </div>
                <h2 class="text-4xl font-extrabold tracking-tight text-[#dae2fd]">{{ stats.totalUsage / 1000 | number:'1.0-1' }}k</h2>
                <p class="mt-0.5 text-[10px] font-medium text-[#c2c6d6]">/ 1M Target</p>
              </div>
            </div>
          </div>

          <div class="relative rounded-lg border border-[#424754]/25 bg-[#171f33] p-6">
            <div class="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#00e676]"></div>
            <div class="flex flex-col items-end">
              <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#00e676]">Activos / OK</p>
              <div class="flex items-center gap-2">
                <h2 class="text-4xl font-extrabold tracking-tight text-[#00e676]">{{ stats.active | number }}</h2>
                <span class="material-icons text-2xl text-[#00e676]">check_circle</span>
              </div>
              <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6ffbbe]">Listo para Producción</p>
            </div>
          </div>
        </section>

        <section class="rounded-xl border border-[#424754]/25 bg-[#131b2e] p-4 shrink-0">
          <div class="flex flex-wrap items-end gap-4">
            <div class="min-w-[240px] flex-1 space-y-1.5">
              <label class="px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Buscar</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#c2c6d6]">search</span>
                <input [(ngModel)]="searchInput" (ngModelChange)="applyFilters()" class="w-full rounded-lg border-none bg-[#060e20] py-2 pl-10 pr-4 text-sm text-[#dae2fd] placeholder:text-[#c2c6d6]/30 focus:ring-1 focus:ring-[#448aff]/30" placeholder="Código o Cliente..." type="text"/>
              </div>
            </div>

            <div class="w-48 space-y-1.5">
              <label class="px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Columnas</label>
              <select [(ngModel)]="filterColumnInput" (ngModelChange)="applyFilters()" class="w-full rounded-lg border-none bg-[#060e20] px-3 py-2 text-sm text-[#dae2fd] focus:ring-1 focus:ring-[#448aff]/30">
                <option value="">Todas las Columnas</option>
                <option *ngFor="let option of uniqueColumnOptions" [value]="option">{{ option }}</option>
              </select>
            </div>

            <div class="w-24 space-y-1.5">
              <label class="px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Piñón (Z)</label>
              <select [(ngModel)]="filterZInput" (ngModelChange)="applyFilters()" class="w-full rounded-lg border-none bg-[#060e20] px-3 py-2 text-sm text-[#dae2fd] focus:ring-1 focus:ring-[#448aff]/30">
                <option value="">Todas</option>
                <option *ngFor="let option of uniqueZOptions" [value]="option">{{ option }}</option>
              </select>
            </div>

            <div class="w-32 space-y-1.5">
              <label class="px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Espesor</label>
              <select [(ngModel)]="filterEspesorInput" (ngModelChange)="applyFilters()" class="w-full rounded-lg border-none bg-[#060e20] px-3 py-2 text-sm text-[#dae2fd] focus:ring-1 focus:ring-[#448aff]/30">
                <option value="">Todos</option>
                <option *ngFor="let option of uniqueEspesorOptions" [value]="option">{{ option }}</option>
              </select>
            </div>

            <div class="w-44 space-y-1.5">
              <label class="px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Medida</label>
              <select [(ngModel)]="filterMeasureInput" (ngModelChange)="applyFilters()" class="w-full rounded-lg border-none bg-[#060e20] px-3 py-2 text-sm text-[#dae2fd] focus:ring-1 focus:ring-[#448aff]/30">
                <option value="">Cualquier Medida</option>
                <option *ngFor="let option of measureOptions" [value]="option.value">{{ option.label }}</option>
              </select>
            </div>

            <div class="flex items-center gap-2 pb-0.5">
              <button (click)="applyFilters()" class="inline-flex h-9 items-center gap-2 rounded-lg bg-[#448aff] px-6 text-xs font-bold text-white shadow-lg shadow-[#448aff]/20 transition-all hover:brightness-110">
                <span class="material-icons text-lg">filter_list</span>
                Aplicar
              </button>
              <button (click)="resetFilters()" class="flex h-9 w-9 items-center justify-center rounded-lg text-[#c2c6d6] transition-all hover:bg-[#2d3449] hover:text-[#dae2fd]" title="Reiniciar Filtros">
                <span class="material-icons text-lg">restart_alt</span>
              </button>
            </div>
          </div>
        </section>

        <section class="relative min-h-0 flex-1 rounded-xl border border-[#424754]/20 bg-[#171f33] shadow-2xl shadow-[#060e20]/40 flex flex-col overflow-hidden">
          <div *ngIf="showInitialLoadingOverlay" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#171f33]/88 backdrop-blur-sm">
            <div class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2d3449] border-t-[#448aff]"></div>
            <h3 class="text-lg font-bold text-[#dae2fd]">Cargando inventario de clisés...</h3>
            <p class="mt-1 text-sm text-[#c2c6d6]">Obteniendo registros y preparando la tabla.</p>
          </div>

          <div *ngIf="isLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#171f33]/90 backdrop-blur-sm">
            <div class="mb-4 h-14 w-14 animate-spin rounded-full border-4 border-[#2d3449] border-t-[#448aff]"></div>
            <h3 class="text-lg font-bold text-[#dae2fd]">Analizando archivo de clisés...</h3>
            <p class="mt-1 text-sm text-[#c2c6d6]">{{ loadingStatusText }}</p>
            <div class="mt-4 w-full max-w-md px-6">
              <div class="h-2 overflow-hidden rounded-full border border-[#424754] bg-[#060e20]">
                <div class="h-full bg-[#448aff] transition-all duration-300" [style.width.%]="loadingProgress"></div>
              </div>
              <p class="mt-2 text-center text-xs text-[#c2c6d6]">{{ loadingProgress }}% completado</p>
            </div>
          </div>

          <div #tableScroll class="overflow-x-auto overflow-y-hidden flex-1 min-h-0">
            <table class="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr class="border-b border-[#424754]/20 bg-[#222a3d]/50">
                  <th class="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Item ID</th>
                  <th class="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Cliente / Descripción</th>
                  <th class="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Medida</th>
                  <th class="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Piñón / Z</th>
                  <th class="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Espesor</th>
                  <th class="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Estado</th>
                  <th class="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.28em] text-[#c2c6d6]">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#424754]/10">
                <tr *ngFor="let item of paginatedCliseList; trackBy: trackByCliseId" class="group transition-colors hover:bg-[#222a3d]" [ngClass]="{ 'bg-[#93000a]/10': item.hasConflict }" (dblclick)="openModal(item, 'view')">
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[#424754]/20 bg-[#060e20]">
                        <img [src]="'https://picsum.photos/seed/' + item.id + '/100/100'" class="h-full w-full object-cover" alt="Clise">
                      </div>
                      <span class="text-sm font-bold text-[#448aff]">{{ item.item || '(Sin código)' }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <div class="flex flex-col">
                      <span class="text-sm font-semibold text-[#dae2fd]">{{ item.cliente || 'Sin cliente' }}</span>
                      <span class="text-xs text-[#c2c6d6]">{{ item.descripcion || 'Sin descripción' }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-sm text-[#dae2fd]">{{ getDisplayMeasure(item) }}</td>
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                      <span class="rounded bg-[#2d3449] px-2 py-0.5 font-mono text-xs text-[#b7c8e1]">{{ item.z || '---' }}</span>
                      <span class="text-xs text-[#c2c6d6]">{{ item.ubicacion || 'Sin ubicación' }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-sm font-mono text-[#dae2fd]">{{ item.espesor || '-' }}</td>
                  <td class="px-6 py-5">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" [ngClass]="getStatusBadgeClass(item)">
                      <span class="mr-1.5 h-1.5 w-1.5 rounded-full" [ngClass]="getStatusDotClass(item)"></span>
                      {{ getStatusLabel(item) }}
                    </span>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button *ngIf="canManageInventory" (click)="openModal(item, 'edit')" class="p-2 text-[#c2c6d6] transition-colors hover:text-[#448aff]" title="Editar">
                        <span class="material-icons text-lg">edit</span>
                      </button>
                      <button (click)="openHistory(item)" class="p-2 text-[#c2c6d6] transition-colors hover:text-[#448aff]" title="Historial">
                        <span class="material-icons text-lg">history</span>
                      </button>
                      <button (click)="openModal(item, 'view')" class="p-2 text-[#c2c6d6] transition-colors hover:text-[#ff5252]" title="Ver detalle">
                        <span class="material-icons text-lg">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="paginatedCliseList.length === 0">
                  <td colspan="7" class="px-6 py-14 text-center text-[#c2c6d6]">
                    <div class="flex flex-col items-center">
                      <span class="material-icons mb-2 text-4xl opacity-40">search_off</span>
                      <p>No se encontraron clisés con los filtros actuales.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-[#424754]/10 bg-[#131b2e]/30 px-6 py-4">
            <span class="text-xs text-[#c2c6d6]">{{ showingStart }} - {{ showingEnd }} de {{ totalItems | number }} items</span>
            <div class="flex items-center gap-1">
              <button (click)="goToPreviousPage()" [disabled]="currentPage === 1" class="flex h-8 w-8 items-center justify-center rounded-lg text-[#c2c6d6] transition-all hover:bg-[#2d3449] disabled:cursor-not-allowed disabled:opacity-40">
                <span class="material-icons text-lg">chevron_left</span>
              </button>

              <ng-container *ngFor="let page of visiblePages">
                <button (click)="goToPage(page)" class="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition-all" [ngClass]="page === currentPage ? 'bg-[#448aff] text-white' : 'text-[#c2c6d6] hover:bg-[#2d3449]'">
                  {{ page }}
                </button>
              </ng-container>

              <button (click)="goToNextPage()" [disabled]="currentPage >= totalPages" class="flex h-8 w-8 items-center justify-center rounded-lg text-[#c2c6d6] transition-all hover:bg-[#2d3449] disabled:cursor-not-allowed disabled:opacity-40">
                <span class="material-icons text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <app-inventory-clise-detail-modal
        *ngIf="showCliseForm"
        [currentClise]="currentClise"
        [isReadOnly]="isReadOnly"
        [canEdit]="canManageInventory"
        [activeDetailTab]="activeDetailTab"
        [compatibleDies]="compatibleDies"
        [dieSearchTerm]="dieSearchTerm"
        [dieSearchResults]="dieSearchResults"
        (closeRequested)="closeModal()"
        (saveRequested)="saveClise()"
        (printRequested)="printCliseLabel()"
        (isReadOnlyChange)="isReadOnly = $event"
        (dieSearchChange)="searchDies($event)"
        (dieLinkRequested)="addLinkedDie($event)"
        (dieUnlinkRequested)="removeLinkedDie($event)">
      </app-inventory-clise-detail-modal>

      <app-inventory-import-preview
        [show]="showImportModal"
        [step]="importStep"
        title="Carga Masiva de Clisés"
        subtitle="Importe registros de clisés desde Excel o CSV"
        uploadHint="El sistema detectará campos faltantes y conservará los conflictos para resolverlos después."
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
        importingTitle="Importando clisés..."
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

      <!-- MODAL: CLISE DETAIL (legacy inline, desactivado) -->
      <div *ngIf="false && showCliseForm" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#060e20]/90 backdrop-blur-md" role="dialog" aria-modal="true">
          <div class="w-full max-w-5xl max-h-[972px] bg-[#131b2e] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col border border-[#424754]/10 overflow-hidden animate-fadeIn">
              
              <!-- Header -->
              <header class="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-[#424754]/10 bg-[#171f33] shrink-0">
                  <div class="flex min-w-0 items-center gap-3">
                      <div class="rounded-lg bg-[#1193d4]/10 p-1.5">
                          <span class="material-icons text-xl text-[#1193d4]">precision_manufacturing</span>
                      </div>
                      <div class="min-w-0">
                          <h3 class="truncate text-lg font-bold tracking-tight text-[#dae2fd]">
                              {{ currentClise.descripcion || currentClise.item || 'Detalle de Clisé' }}
                          </h3>
                          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#c2c6d6]">
                              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium" [ngClass]="getStatusBadgeClass(currentClise)">
                                  <span class="mr-1.5 h-1.5 w-1.5 rounded-full" [ngClass]="getStatusDotClass(currentClise)"></span>
                                  {{ getStatusLabel(currentClise) }}
                              </span>
                              <span>{{ currentClise.item || 'Sin código' }}</span>
                              <span class="text-[#c2c6d6]/40">•</span>
                              <span>{{ isReadOnly ? 'Modo detalle' : 'Modo edición' }}</span>
                          </div>
                      </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                      <button *ngIf="isReadOnly" (click)="isReadOnly = false" class="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#adc6ff] to-[#4d8eff] text-[#00285d] font-bold shadow-md hover:brightness-110 transition-all text-xs">
                          <span class="material-icons text-base">edit</span>
                          Editar
                      </button>
                      <ng-container *ngIf="!isReadOnly">
                          <button (click)="isReadOnly = true" class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#9db0b9] hover:bg-[#1c2327] hover:text-white transition-colors text-xs font-semibold">
                              <span class="material-icons text-base">close</span>
                              Cancelar
                          </button>
                          <button (click)="saveClise()" class="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#adc6ff] to-[#4d8eff] text-[#00285d] font-bold shadow-md hover:brightness-110 transition-all text-xs">
                              <span class="material-icons text-base">save</span>
                              Guardar
                          </button>
                      </ng-container>
                      <button (click)="closeModal()" class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#9db0b9] hover:bg-[#1c2327] hover:text-[#ffb4ab] transition-colors text-xs font-semibold">
                          <span class="material-icons text-base">close</span>
                          Cerrar
                      </button>
                  </div>
              </header>

              <!-- Content Body -->
              <div class="flex-1 overflow-y-auto custom-scrollbar bg-[#0b1326]">
                  <div class="p-6 space-y-4">
                      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div class="lg:col-span-8 space-y-4">
                          
                          <!-- General Info -->
                          <section class="space-y-4">
                              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div class="bg-[#1c2327] px-4 py-3 rounded-lg border-l-4 border-[#1193d4] shadow-sm">
                                      <label class="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#9db0b9] mb-1">ITEM / Identificador</label>
                                      <input [readonly]="isReadOnly" [(ngModel)]="currentClise.item" class="w-full bg-transparent outline-none text-lg font-bold text-[#adc6ff]" placeholder="---">
                                  </div>
                                  <div class="bg-[#1c2327] px-4 py-3 rounded-lg border-l-4 border-[#b7c8e1] shadow-sm">
                                      <label class="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#9db0b9] mb-1">CLIENTE</label>
                                      <input [readonly]="isReadOnly" [(ngModel)]="currentClise.cliente" class="w-full bg-transparent outline-none text-base font-bold text-white uppercase" placeholder="---">
                                  </div>
                                  <div class="bg-[#1c2327] px-4 py-3 rounded-lg border-l-4 border-[#4edea3] shadow-sm">
                                      <label class="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#9db0b9] mb-1">UBICACIÓN</label>
                                      <div class="flex items-center gap-2">
                                          <span class="material-icons text-[#4edea3] text-base">location_on</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ubicacion" class="w-full bg-transparent outline-none text-base font-bold text-white uppercase" placeholder="---">
                                      </div>
                                  </div>
                              </div>

                              <div class="bg-[#1c2327]/60 rounded-xl p-4 border border-[#2a343b]">
                                  <label class="block text-[10px] uppercase tracking-[0.15em] font-bold text-[#9db0b9] mb-2">DESCRIPCIÓN</label>
                                  <textarea [readonly]="isReadOnly" [(ngModel)]="currentClise.descripcion" rows="2" class="w-full bg-transparent border-none outline-none resize-none text-sm text-white leading-relaxed" placeholder="Sin descripción"></textarea>
                              </div>
                          </section>

                          <!-- Specs -->
                          <section class="bg-[#222a3d]/40 rounded-xl p-4">
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">settings</span>
                                  Especificaciones Técnicas
                              </h3>
                              <div class="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-3">
                                  
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">Z</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.z" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="---">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">ESTÁNDAR</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.estandar" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="---">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">MEDIDAS</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.medidas" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="---">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">TROQUEL</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.troquel" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="---">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">ESPESOR</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.espesor" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="---">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">ANCHO</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ancho" type="number" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="0">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">AVANCE</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.avance" type="number" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="0">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">COL</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.col" type="number" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="0">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">REP</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.rep" type="number" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="0">
                                      </div>
                                      <div class="space-y-1">
                                          <span class="text-[10px] uppercase tracking-wider text-[#9db0b9]">CANTIDAD</span>
                                          <input [readonly]="isReadOnly" [(ngModel)]="currentClise.n_clises" type="number" class="w-full bg-transparent outline-none text-sm font-semibold text-white" placeholder="0">
                                      </div>
                              </div>
                          </section>

                          <!-- Operational Info -->
                          <section>
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">analytics</span>
                                  Información Operativa
                              </h3>
                              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div class="bg-[#1c2327]/50 rounded-xl border border-[#2a343b] p-4">
                                      <h4 class="text-[10px] font-bold text-[#b7c8e1] uppercase tracking-[0.15em] mb-3">Datos Operativos</h4>
                                      <div class="grid grid-cols-1 gap-2">
                                          <div class="flex justify-between items-center text-xs border-b border-[#2a343b] pb-1">
                                              <span class="text-[#9db0b9]">INGRESO</span>
                                              <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ingreso" class="bg-transparent outline-none text-right font-medium text-white w-40" placeholder="---">
                                          </div>
                                          <div class="flex justify-between items-center text-xs border-b border-[#2a343b] pb-1">
                                              <span class="text-[#9db0b9]">MAQ</span>
                                              <input [readonly]="isReadOnly" [(ngModel)]="currentClise.maq" class="bg-transparent outline-none text-right font-medium text-white w-40" placeholder="---">
                                          </div>
                                          <div class="flex justify-between items-center text-xs border-b border-[#2a343b] pb-1">
                                              <span class="text-[#9db0b9]">N° FICHA FLER</span>
                                              <input [readonly]="isReadOnly" [(ngModel)]="currentClise.n_ficha_fler" class="bg-transparent outline-none text-right font-medium text-white w-40" placeholder="---">
                                          </div>
                                          <div class="flex justify-between items-center text-xs">
                                              <span class="text-[#9db0b9]">MTL ACUM.</span>
                                              <input [readonly]="isReadOnly" [(ngModel)]="currentClise.mtl_acum" type="number" class="bg-transparent outline-none text-right font-bold text-[#4edea3] w-40" placeholder="0">
                                          </div>
                                      </div>
                                  </div>

                                  <div class="bg-[#1c2327]/50 rounded-xl border border-[#2a343b] p-4">
                                      <h4 class="text-[10px] font-bold text-[#b7c8e1] uppercase tracking-[0.15em] mb-3">COLORES</h4>
                                      <div class="flex flex-wrap gap-1.5 mb-3">
                                          <span *ngFor="let tag of cliseColorTags" class="px-2 py-0.5 bg-[#2d3449] rounded text-[9px] font-bold border border-[#424754]/10 text-[#dae2fd]">
                                              {{ tag }}
                                          </span>
                                          <span *ngIf="cliseColorTags.length === 0" class="text-xs italic text-[#9db0b9]">
                                              Sin colores registrados.
                                          </span>
                                      </div>
                                      <textarea [readonly]="isReadOnly" [(ngModel)]="currentClise.colores" rows="2" class="w-full bg-transparent border-none outline-none resize-none text-sm font-medium text-white" placeholder="---"></textarea>
                                  </div>
                              </div>
                          </section>

                          <!-- Dies -->
                          <section class="bg-[#222a3d]/40 rounded-xl p-4" [ngClass]="activeDetailTab === 'metrics' ? 'ring-1 ring-[#adc6ff]/35' : ''">
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
                          <section class="bg-[#222a3d]/40 rounded-xl p-4" [ngClass]="activeDetailTab === 'metrics' ? 'ring-1 ring-[#adc6ff]/35' : ''">
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
                          <section class="pb-2">
                              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <span class="material-icons text-[#1193d4] text-xl">sticky_note_2</span>
                                  Observaciones (OBS)
                              </h3>
                              <div class="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg">
                                  <textarea [readonly]="isReadOnly" [(ngModel)]="currentClise.obs" class="w-full bg-transparent border-none text-yellow-100/80 text-sm leading-relaxed outline-none resize-none" rows="3" placeholder="Sin observaciones."></textarea>
                              </div>
                          </section>

                      </div>
                  </div>

                  <!-- Right Sidebar -->
                  <div class="lg:col-span-4 flex flex-col gap-4">
                          <div class="bg-[#1c2327]/40 rounded-xl p-4 h-full flex flex-col">
                              <h4 class="text-[10px] font-bold text-[#1193d4] uppercase tracking-[0.15em] mb-3">Referencia Visual</h4>
                              <div class="flex-1 bg-[#0d1113] rounded-lg overflow-hidden relative group border border-[#2a343b] min-h-[220px]">
                                  <img [src]="currentClise.imagen || ('https://picsum.photos/seed/' + currentClise.id + '/400/400')" class="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-500" alt="Vista previa del clisé">
                                  <div class="absolute inset-0 bg-gradient-to-t from-[#111618]/70 via-transparent to-transparent"></div>
                                  <div class="absolute bottom-2 left-2 right-2">
                                      <div class="bg-[#31394d]/80 backdrop-blur-md px-2 py-1.5 rounded flex items-center justify-between">
                                          <span class="text-[8px] font-bold text-white">VISTA PREVIA</span>
                                          <button (click)="printCliseLabel()" class="hover:text-[#1193d4] transition-colors">
                                              <span class="material-icons text-sm">zoom_in</span>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                              <div class="mt-3 grid grid-cols-2 gap-2">
                                  <div class="bg-[#2a343b]/30 p-2 rounded border border-[#2a343b] text-center">
                                      <p class="text-[8px] text-[#9db0b9] uppercase mb-0.5">Última Revisión</p>
                                      <p class="text-[10px] font-bold text-white">{{ lastHistoryEntry?.date || 'Sin historial' }}</p>
                                  </div>
                                  <div class="bg-[#2a343b]/30 p-2 rounded border border-[#2a343b] text-center">
                                      <p class="text-[8px] text-[#9db0b9] uppercase mb-0.5">Estado Físico</p>
                                      <div class="flex items-center justify-center gap-1" [ngClass]="getPhysicalStateClass()">
                                          <span class="material-icons text-[10px]">verified</span>
                                          <p class="text-[10px] font-bold">{{ getPhysicalStateLabel() }}</p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="flex flex-col gap-3">
                              <div class="flex justify-between items-center mb-1">
                                  <p class="text-white text-sm font-bold uppercase tracking-wider">Ubicación Física</p>
                                  <span class="text-xs bg-[#1c2327] px-2 py-1 rounded text-[#9db0b9] border border-[#2a343b]">
                                      {{ currentClise.troquel || 'Sin troquel' }}
                                  </span>
                              </div>
                              <div class="bg-[#1c2327] rounded-xl p-4 border border-[#2a343b] flex flex-col gap-4">
                                  <div class="flex justify-between text-xs text-[#9db0b9] mb-1">
                                      <span>Estante {{ (currentClise.ubicacion || '---').split('-')[0] }}</span>
                                      <span>{{ currentClise.ubicacion || '---' }}</span>
                                  </div>
                                  <div class="grid grid-cols-4 gap-2 w-full aspect-video">
                                      <div *ngFor="let box of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]" 
                                           class="rounded flex items-center justify-center text-[10px] bg-[#2a343b] text-[#4a5e69]">
                                           <span>.</span>
                                      </div>
                                  </div>
                                  <div class="text-xs text-[#9db0b9] text-center mt-1">
                                      Posición Actual: <input [readonly]="isReadOnly" [(ngModel)]="currentClise.ubicacion" class="bg-transparent border-b border-[#1193d4] text-white font-mono w-28 text-center outline-none">
                                  </div>
                              </div>
                          </div>

                          <div>
                              <button *ngIf="isReadOnly" (click)="printCliseLabel()" class="w-full bg-[#1193d4] hover:bg-[#0c6fa1] text-white font-bold py-4 px-6 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98]">
                                  <span class="material-icons">print</span>
                                  Imprimir Etiqueta ID
                              </button>
                          </div>
                  </div>

              </div>

              <div class="px-6 py-2.5 bg-[#0d1113] border-t border-[#2a343b] flex flex-wrap justify-between items-center gap-3">
                  <div class="flex items-center gap-4">
                      <div class="flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full" [ngClass]="getStatusDotClass(currentClise)"></span>
                          <span class="text-[9px] font-bold text-[#9db0b9] uppercase tracking-tight">{{ getStatusLabel(currentClise) }}</span>
                      </div>
                      <div class="text-[9px] text-[#9db0b9]/70">
                          ID: <span class="font-mono text-white">{{ currentClise.id || 'Sin ID' }}</span>
                      </div>
                  </div>
                  <div class="text-[9px] text-[#9db0b9] italic">
                      Actualizado por: <span class="font-bold text-white">{{ lastHistoryEntry?.user || 'Sistema' }}</span>
                  </div>
              </div>
          </div>
      </div>

      <!-- MODAL: IMPORT PREVIEW (legacy position, desactivado) -->
      <div *ngIf="false && showImportPreviewModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
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
                        Todos los registros se importarán. Los conflictos quedarán marcados para revisión manual.
                    </p>
                </div>

                <!-- Table Preview -->
                <div class="flex-1 overflow-auto custom-scrollbar p-6 relative">
                    <div *ngIf="isImporting" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1e293b]/80 backdrop-blur-sm">
                        <div class="w-14 h-14 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin mb-4"></div>
                        <h3 class="text-lg font-bold text-white">Importando clisés...</h3>
                        <p class="text-sm text-slate-400 mt-1">{{ importProgressText || 'No cierres esta ventana hasta que finalice.' }}</p>
                        <div class="w-full max-w-md mt-4 px-6">
                            <div class="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                <div class="h-full bg-blue-500 transition-all duration-300" [style.width.%]="importProgressPercent"></div>
                            </div>
                            <p class="text-xs text-slate-500 mt-2 text-center">{{ importProgressPercent }}% completado</p>
                        </div>
                    </div>
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
                            <tr *ngFor="let item of previewConflictRows; let i = index; trackBy: trackByCliseId" class="bg-red-500/5 hover:bg-red-500/10 transition-colors">
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
                            <tr *ngFor="let item of previewValidRows; let i = index; trackBy: trackByCliseId" class="hover:bg-slate-700/30 transition-colors">
                                <td class="px-4 py-2 text-slate-500 font-mono text-xs text-center">{{ previewConflictRows.length + i + 1 }}</td>
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
                    <div *ngIf="hasHiddenPreviewRows" class="mt-4 rounded-lg border border-slate-700 bg-[#0f172a] px-4 py-3 text-xs text-slate-400">
                        Mostrando {{ previewConflictRows.length + previewValidRows.length }} de {{ previewData.length + conflictsData.length }} filas para mantener la importación fluida.
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-[#0f172a] px-6 py-4 border-t border-slate-700 flex justify-end gap-4 shrink-0">
               <button (click)="cancelImport()" [disabled]="isImporting" class="px-6 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   Cancelar Importación
               </button>
               <button (click)="confirmImport()" [disabled]="isImporting" class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed min-w-[260px] justify-center">
                   <span class="material-icons text-sm">save_alt</span>
                   Importar Todo (Resolver Conflictos Después)
               </button>
            </div>
         </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    .gauge-svg { transform: rotate(-90deg); }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #131b2e; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 999px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  `]
})
export class InventoryCliseComponent implements AfterViewInit, OnDestroy {
  inventoryService = inject(InventoryService);
  importFlow = inject(InventoryImportFlowService);
  state = inject(StateService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  Math = Math;

  @ViewChild('viewportRoot') viewportRootRef?: ElementRef<HTMLDivElement>;
  @ViewChild('tableScroll') tableScrollRef?: ElementRef<HTMLDivElement>;

  cliseItems: CliseItem[] = [];
  searchInput = '';
  searchTerm = '';
  filterColumnInput = '';
  filterColumn = '';
  filterZInput = '';
  filterZ = '';
  filterEspesorInput = '';
  filterEspesor = '';
  filterMeasureInput = '';
  filterMeasure = '';
  currentPage = 1;
  pageSize = 10;
  viewportHeight: number | null = null;
  loadStatus: InventoryLoadStatus = {
    state: 'idle',
    lastSuccessfulSync: null,
    errorMessage: null,
  };
  
  // Modal State
  showCliseForm = false;
  isReadOnly = false;
  currentClise: Partial<CliseItem> = {};
  activeDetailTab: 'general' | 'metrics' = 'general';

  // Import State
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
  previewData: CliseItem[] = [];
 conflictsData: CliseItem[] = [];
 discardedRowsCount = 0;
 readonly importPreviewLimit = 120;
 readonly importPreviewColumns: InventoryImportColumn<CliseItem>[] = [
   { label: 'Código (Item)', value: (item) => item.item, emptyValue: '(VACÍO)', mono: true },
   { label: 'Cliente', value: (item) => item.cliente, emptyValue: '(VACÍO)' },
   { label: 'Descripción', value: (item) => item.descripcion },
   { label: 'Ubicación', value: (item) => item.ubicacion, emptyValue: '-' },
 ];

  // Die Search Logic
  dieSearchTerm = '';
  dieSearchResults: DieItem[] = [];
  private cliseItemsSubscription?: Subscription;
  private loadStatusSubscription?: Subscription;
  private loadingProgressInterval?: number;
  private readonly minimumRowsPerPage = 4;
  private readonly compactRowHeight = 72;

  get canManageInventory() {
    return this.state.hasPermission('inventory.clises.manage');
  }

  get showInitialLoadingOverlay() {
    return this.loadStatus.state === 'loading' && this.cliseItems.length === 0 && !this.isLoading;
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
    this.cliseItemsSubscription = this.inventoryService.cliseItems$.subscribe((items) => {
      this.ngZone.run(() => {
        this.cliseItems = items;
        this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
        this.schedulePageSizeCalculation();
        this.requestViewRefresh();
      });
    });

    this.loadStatusSubscription = this.inventoryService.loadStatus$.subscribe((status) => {
      this.ngZone.run(() => {
        this.loadStatus = status;
        this.requestViewRefresh();
      });
    });
  }

  ngAfterViewInit() {
    this.schedulePageSizeCalculation();
  }

  ngOnDestroy() {
    this.cliseItemsSubscription?.unsubscribe();
    this.loadStatusSubscription?.unsubscribe();
    this.stopLoadingProgressSimulation();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.schedulePageSizeCalculation();
  }

  get paginatedCliseList() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCliseList.slice(start, start + this.pageSize);
  }

  get filteredCliseList() {
    const term = this.searchTerm.toLowerCase().trim();
    return this.cliseItems.filter((item) => {
      const matchesSearch = !term
        || item.item.toLowerCase().includes(term)
        || item.cliente.toLowerCase().includes(term)
        || item.descripcion.toLowerCase().includes(term);
      const matchesColumn = !this.filterColumn || String(item.col ?? '').trim() === this.filterColumn;
      const matchesZ = !this.filterZ || item.z === this.filterZ;
      const matchesEspesor = !this.filterEspesor || item.espesor === this.filterEspesor;
      const matchesMeasure = !this.filterMeasure || this.getMeasureCategory(item) === this.filterMeasure;

      return matchesSearch && matchesColumn && matchesZ && matchesEspesor && matchesMeasure;
    });
  }

  get totalItems() { return this.filteredCliseList.length; }
  get totalPages() { return Math.ceil(this.totalItems / this.pageSize) || 1; }
  get showingStart() { return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get showingEnd() { return Math.min(this.currentPage * this.pageSize, this.totalItems); }
  get uniqueColumnOptions() {
      return [...new Set(this.cliseItems.map((item) => String(item.col ?? '').trim()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  }

  get uniqueZOptions() {
      return [...new Set(this.cliseItems.map((item) => item.z).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  get uniqueEspesorOptions() {
      return [...new Set(this.cliseItems.map((item) => item.espesor).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  get measureOptions() {
      return [
        { value: 'small', label: 'Pequeño' },
        { value: 'medium', label: 'Mediano' },
        { value: 'large', label: 'Grande' },
      ];
  }

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

  applyFilters() {
      this.searchTerm = this.searchInput.trim();
      this.filterColumn = this.filterColumnInput;
      this.filterZ = this.filterZInput;
      this.filterEspesor = this.filterEspesorInput;
      this.filterMeasure = this.filterMeasureInput;
      this.currentPage = 1;
  }

  resetFilters() {
      this.searchInput = '';
      this.searchTerm = '';
      this.filterColumnInput = '';
      this.filterColumn = '';
      this.filterZInput = '';
      this.filterZ = '';
      this.filterEspesorInput = '';
      this.filterEspesor = '';
      this.filterMeasureInput = '';
      this.filterMeasure = '';
      this.currentPage = 1;
  }

  goToPage(page: number) {
      this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  goToPreviousPage() {
      this.goToPage(this.currentPage - 1);
  }

  goToNextPage() {
      this.goToPage(this.currentPage + 1);
  }

  // --- CRUD ---
  openModal(item: any, mode: 'view' | 'edit') {
      if (!item && !this.canManageInventory) return;
      const effectiveMode = this.canManageInventory ? mode : 'view';
      this.isReadOnly = effectiveMode === 'view';
      this.activeDetailTab = 'general';
      if (item) this.currentClise = JSON.parse(JSON.stringify(item));
      else this.currentClise = { item: '', linkedDies: [], id: Math.random().toString(36).substr(2, 9) };
      this.showCliseForm = true;
  }

  closeModal() {
      this.showCliseForm = false;
      this.dieSearchTerm = '';
      this.dieSearchResults = [];
  }

  openHistory(item: CliseItem) {
      this.openModal(item, 'view');
      this.activeDetailTab = 'metrics';
  }

  async saveClise() {
      if (!this.canManageInventory) return;
      if (this.currentClise.id) {
          const item = this.currentClise as CliseItem;
          if (!String(item.item || '').trim()) {
              alert('Complete el código del clisé antes de guardar.');
              return;
          }
          if (!String(item.cliente || '').trim()) {
              alert('Complete el cliente antes de guardar.');
              return;
          }

          try {
              const saved = await this.inventoryService.saveClise(item);
              this.currentClise = { ...saved };
              this.closeModal();
          } catch (error: any) {
              console.error('Error saving clise:', error);
              alert(`No se pudo guardar el clisé.\n${error?.message || 'Error desconocido.'}`);
          }
      }
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
          :root { --app-font-stack: sans-serif, 'Inter', system-ui; }
          body { font-family: var(--app-font-stack); padding: 20px; text-align: center; }
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
      const result = await this.importFlow.analyzeFile<CliseItem>({
        entityLabel: 'clisés',
        file,
        normalize: (rows) => this.inventoryService.normalizeCliseData(rows),
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
         const result = await this.inventoryService.importClises(
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
            ? `Se importaron ${result.imported} registros.\nNuevos: ${result.created}\nActualizados: ${result.updated}\n${result.conflicts} quedaron marcados para revision.`
            : `Se importaron ${result.imported} registros.\nNuevos: ${result.created}\nActualizados: ${result.updated}`;
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

  get previewConflictRows() {
      return this.conflictsData.slice(0, this.importPreviewLimit);
  }

  get previewValidRows() {
      return this.previewData.slice(0, this.importPreviewLimit);
  }

  get hasHiddenPreviewRows() {
      return this.previewConflictRows.length + this.previewValidRows.length < this.previewData.length + this.conflictsData.length;
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

  private schedulePageSizeCalculation() {
      this.ngZone.runOutsideAngular(() => {
          window.requestAnimationFrame(() => {
              const nextViewportHeight = this.calculateViewportHeight();
              const nextPageSize = this.calculatePageSize();
              const viewportChanged = nextViewportHeight !== this.viewportHeight;
              const pageSizeChanged = nextPageSize !== this.pageSize;

              if (!viewportChanged && !pageSizeChanged) return;

              this.ngZone.run(() => {
                  this.viewportHeight = nextViewportHeight;
                  this.pageSize = nextPageSize;
                  this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
                  this.cdr.detectChanges();
              });
          });
      });
  }

  private calculateViewportHeight() {
      const viewportRootElement = this.viewportRootRef?.nativeElement;
      if (!viewportRootElement) {
          return this.viewportHeight;
      }

      const rootRect = viewportRootElement.getBoundingClientRect();
      const availableHeight = Math.floor(window.innerHeight - rootRect.top);
      return availableHeight > 0 ? availableHeight : this.viewportHeight;
  }

  private calculatePageSize() {
      const tableScrollElement = this.tableScrollRef?.nativeElement;
      if (!tableScrollElement) {
          return this.pageSize;
      }

      const tableHeadElement = tableScrollElement.querySelector('thead');
      const scrollAreaHeight = tableScrollElement.clientHeight;
      const tableHeadHeight = tableHeadElement?.getBoundingClientRect().height ?? 0;
      const availableRowsHeight = scrollAreaHeight - tableHeadHeight;

      if (!scrollAreaHeight || !availableRowsHeight) {
          return this.pageSize;
      }

      const rowsThatFit = Math.floor(availableRowsHeight / this.compactRowHeight);
      return Math.max(this.minimumRowsPerPage, rowsThatFit || this.minimumRowsPerPage);
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

  get lastHistoryEntry() {
      return this.currentClise.history && this.currentClise.history.length > 0
        ? this.currentClise.history[0]
        : null;
  }

  get cliseColorTags() {
      const raw = this.currentClise.colores || '';
      return raw
        .split(/[;,/]+/)
        .flatMap((part) => part.split(','))
        .map((part) => part.trim())
        .filter(Boolean);
  }

  getPhysicalStateLabel() {
      if (this.currentClise.hasConflict) return 'REVISAR';
      if ((this.currentClise.mtl_acum || 0) >= 500000) return 'MANT.';
      return 'ÓPTIMO';
  }

  getPhysicalStateClass() {
      if (this.currentClise.hasConflict) return 'text-[#ff8a80]';
      if ((this.currentClise.mtl_acum || 0) >= 500000) return 'text-[#ffb4ab]';
      return 'text-[#4edea3]';
  }

  trackByCliseId(_: number, item: CliseItem) {
      return item.id;
  }

  getDisplayMeasure(item: CliseItem) {
      if (item.medidas) return item.medidas;
      if (item.ancho || item.avance) {
          return `${item.ancho || '-'} x ${item.avance || '-'}`;
      }
      return 'Sin medida';
  }

  getStatusLabel(item: Partial<CliseItem>) {
      if (item.hasConflict) return 'Revisar';
      if ((item.mtl_acum || 0) >= 500000) return 'Mantenimiento';
      return 'Listo para Uso';
  }

  getStatusBadgeClass(item: Partial<CliseItem>) {
      if (item.hasConflict) return 'bg-[#ff5252]/10 text-[#ff5252]';
      if ((item.mtl_acum || 0) >= 500000) return 'bg-[#ff5252]/10 text-[#ff8a80]';
      return 'bg-[#00e676]/10 text-[#00e676]';
  }

  getStatusDotClass(item: Partial<CliseItem>) {
      if (item.hasConflict) return 'bg-[#ff5252]';
      if ((item.mtl_acum || 0) >= 500000) return 'bg-[#ff8a80]';
      return 'bg-[#00e676]';
  }

  private getMeasureCategory(item: CliseItem) {
      const width = item.ancho || 0;
      const advance = item.avance || 0;
      const area = width * advance;

      if (area <= 120000) return 'small';
      if (area <= 350000) return 'medium';
      return 'large';
  }
}
