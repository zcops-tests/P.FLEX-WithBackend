import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventoryLoadStatus, InventoryService } from '../services/inventory.service';
import { StockItem } from '../models/inventory.models';
import { StateService } from '../../../services/state.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryImportPreviewComponent } from './inventory-import-preview.component';
import { InventoryImportColumn } from '../models/inventory-import.models';
import { InventoryImportFlowService } from '../services/inventory-import-flow.service';

@Component({
  selector: 'app-inventory-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, InventoryImportPreviewComponent],
  template: `
    <div
      #viewportRoot
      class="flex-1 flex flex-col p-6 max-w-[1920px] mx-auto w-full overflow-hidden min-h-0 bg-[#0f172a] text-slate-200"
      [style.height.px]="viewportHeight">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
        <div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <span class="material-icons text-indigo-500 text-2xl">check_circle</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Stock Producto Terminado</h1>
          </div>
          <p class="text-slate-400 text-sm mt-1 ml-12">Gestión de producto terminado según estructura estándar de importación.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            [(ngModel)]="searchTerm"
            (ngModelChange)="handleSearchChange()"
            class="w-full sm:w-80 px-4 py-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar medida, material, etiqueta, caja o ubicación">
          <ng-container *ngIf="canManageInventory">
            <button (click)="openImportModal()" [disabled]="isLoading || isImporting" class="btn-secondary">
              {{ isLoading ? 'Analizando...' : (isImporting ? 'Importando...' : 'Importar') }}
            </button>
            <button (click)="openModal(null)" class="btn-primary">Ingreso PT</button>
          </ng-container>
        </div>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
        <div class="stat-card"><span>Total Millares</span><strong>{{ stats.totalMillares | number:'1.0-2' }}</strong></div>
        <div class="stat-card"><span>En Cuarentena</span><strong>{{ stats.quarantine }}</strong></div>
        <div class="stat-card"><span>Disponibles</span><strong>{{ stats.released }}</strong></div>
        <div class="stat-card"><span>Retenidos</span><strong>{{ stats.held }}</strong></div>
      </section>

      <div class="bg-[#1e293b] rounded-xl shadow-lg border border-slate-700/60 overflow-hidden flex-1 flex flex-col relative min-h-0 h-full">
        <div *ngIf="showInitialLoadingOverlay" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1e293b]/88 backdrop-blur-sm text-white">
          <div class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
          <h3 class="text-lg font-bold">Cargando stock de producto terminado...</h3>
          <p class="mt-1 text-sm text-slate-400">Obteniendo registros y preparando la tabla.</p>
        </div>

        <div *ngIf="isLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1e293b]/85 backdrop-blur-sm text-white">
          <div class="mb-4 h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
          <h3 class="text-lg font-bold">Analizando archivo de stock...</h3>
          <p class="mt-1 text-sm text-slate-400">{{ loadingStatusText }}</p>
          <div class="mt-4 w-full max-w-md px-6">
            <div class="h-2 overflow-hidden rounded-full border border-slate-700 bg-[#0f172a]">
              <div class="h-full bg-indigo-500 transition-all duration-300" [style.width.%]="loadingProgress"></div>
            </div>
            <p class="mt-2 text-center text-xs text-slate-400">{{ loadingProgress }}% completado</p>
          </div>
        </div>

        <div #tableScroll class="overflow-x-auto overflow-y-hidden custom-scrollbar flex-1 min-h-0">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#020617]/50 text-slate-400 font-bold sticky top-0 z-10">
              <tr>
                <th class="th-cell">MEDIDA</th>
                <th class="th-cell text-right">ANCHO MM</th>
                <th class="th-cell text-right">AVANCE MM</th>
                <th class="th-cell">MATERIAL</th>
                <th class="th-cell text-right">COLUMNAS</th>
                <th class="th-cell">PREPICADO</th>
                <th class="th-cell text-right">CANTIDAD X ROLLO</th>
                <th class="th-cell text-right">CANTIDAD MILLARES</th>
                <th class="th-cell">ETIQUETA</th>
                <th class="th-cell">FORMA</th>
                <th class="th-cell">TIPO DE PRODUCTO</th>
                <th class="th-cell">CAJA</th>
                <th class="th-cell">UBICACIÓN</th>
                <th class="th-cell">ESTADO</th>
                <th class="th-cell">ACCIONES</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50 bg-[#1e293b]">
              <tr *ngFor="let item of paginatedItems; trackBy: trackByItemId" class="hover:bg-slate-700/30 transition-colors" [ngClass]="{ 'bg-red-500/5': item.hasConflict }">
                <td class="td-cell">{{ item.medida || '---' }}</td>
                <td class="td-cell text-right font-mono">{{ item.anchoMm ?? '---' }}</td>
                <td class="td-cell text-right font-mono">{{ item.avanceMm ?? '---' }}</td>
                <td class="td-cell">{{ item.material || '---' }}</td>
                <td class="td-cell text-right font-mono">{{ item.columnas ?? '---' }}</td>
                <td class="td-cell">{{ item.prepicado || '---' }}</td>
                <td class="td-cell text-right font-mono">{{ item.cantidadXRollo ?? '---' }}</td>
                <td class="td-cell text-right font-mono">{{ item.cantidadMillares ?? '---' }}</td>
                <td class="td-cell">
                  <div class="flex flex-col">
                    <span>{{ item.etiqueta || '---' }}</span>
                    <span class="text-[10px] text-slate-500 font-mono leading-tight">{{ item.boxId || 'ID pendiente' }}</span>
                  </div>
                </td>
                <td class="td-cell">{{ item.forma || '---' }}</td>
                <td class="td-cell">{{ item.tipoProducto || '---' }}</td>
                <td class="td-cell font-mono">{{ item.caja || '---' }}</td>
                <td class="td-cell font-mono">{{ item.ubicacion || '---' }}</td>
                <td class="td-cell">
                  <span class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider" [ngClass]="item.hasConflict ? 'bg-red-500/10 text-red-400 border border-red-500/20' : getStatusClass(item.status)">
                    {{ item.hasConflict ? 'Revisar' : item.status }}
                  </span>
                </td>
                <td class="td-cell">
                  <button (click)="openModal(item)" class="text-slate-400 hover:text-indigo-400 transition-colors p-1.5 hover:bg-slate-700/50 rounded-lg">
                    <span class="material-icons">{{ canManageInventory ? 'edit_note' : 'visibility' }}</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="paginatedItems.length === 0">
                <td colspan="15" class="p-12 text-center text-slate-500 italic">No se encontraron productos terminados.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex shrink-0 items-center justify-between gap-4 border-t border-slate-700/60 bg-[#0f172a] px-4 py-3">
          <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {{ filteredItems.length }} registros · página {{ currentPage }} de {{ totalPages }}
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="goToPreviousPage()"
              [disabled]="currentPage === 1"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
              Anterior
            </button>

            <div class="flex items-center gap-1">
              <button
                *ngFor="let page of visiblePages"
                type="button"
                (click)="goToPage(page)"
                class="min-w-9 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors"
                [ngClass]="page === currentPage ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'">
                {{ page }}
              </button>
            </div>

            <button
              type="button"
              (click)="goToNextPage()"
              [disabled]="currentPage === totalPages"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="showModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog">
        <div class="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-5xl border border-slate-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700 bg-[#0f172a] flex justify-between items-center">
            <h3 class="text-lg font-bold text-white">{{ isReadOnly ? 'Detalle de Producto Terminado' : (editingItem ? 'Gestionar Producto Terminado' : 'Ingreso a Almacén PT') }}</h3>
            <button (click)="showModal = false" class="text-slate-400 hover:text-white"><span class="material-icons">close</span></button>
          </div>

          <div class="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 max-h-[75vh] overflow-y-auto">
            <div *ngFor="let field of modalFields">
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">{{ field.label }}</label>
              <input
                *ngIf="field.type !== 'number'; else numberField"
                [(ngModel)]="tempItem[field.key]"
                [readonly]="isReadOnly || field.readonly"
                class="input-field"
                [class.font-mono]="field.mono"
              >
              <ng-template #numberField>
                <input type="number" [(ngModel)]="tempItem[field.key]" [readonly]="isReadOnly || field.readonly" class="input-field font-mono">
              </ng-template>
            </div>

            <div *ngIf="tempItem.hasConflict" class="md:col-span-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Este registro fue importado con conflicto. Completa la CAJA para resolverlo y generar su identificador interno.
            </div>

            <div class="md:col-span-4">
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Estado Calidad</label>
              <div class="grid grid-cols-4 gap-2">
                <button (click)="tempItem.status = 'Liberado'" [disabled]="isReadOnly" class="status-btn" [ngClass]="tempItem.status === 'Liberado' ? 'bg-emerald-600 text-white border-emerald-500' : 'status-btn-idle'">LIBERADO</button>
                <button (click)="tempItem.status = 'Cuarentena'" [disabled]="isReadOnly" class="status-btn" [ngClass]="tempItem.status === 'Cuarentena' ? 'bg-yellow-600 text-white border-yellow-500' : 'status-btn-idle'">CUARENTENA</button>
                <button (click)="tempItem.status = 'Retenido'" [disabled]="isReadOnly" class="status-btn" [ngClass]="tempItem.status === 'Retenido' ? 'bg-red-600 text-white border-red-500' : 'status-btn-idle'">RETENIDO</button>
                <button (click)="tempItem.status = 'Despachado'" [disabled]="isReadOnly" class="status-btn" [ngClass]="tempItem.status === 'Despachado' ? 'bg-blue-600 text-white border-blue-500' : 'status-btn-idle'">DESPACHADO</button>
              </div>
            </div>

            <div class="md:col-span-4">
              <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notas / Observaciones</label>
              <textarea [(ngModel)]="tempItem.notes" [readonly]="isReadOnly" rows="2" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none resize-none"></textarea>
            </div>
          </div>

          <div class="px-6 py-4 bg-[#0f172a] border-t border-slate-700 flex justify-end gap-3">
            <button (click)="showModal = false" class="px-4 py-2 rounded-lg text-slate-300 font-bold hover:bg-slate-800 transition-colors">{{ isReadOnly ? 'Cerrar' : 'Cancelar' }}</button>
            <button *ngIf="!isReadOnly" (click)="saveItem()" class="btn-primary">Guardar</button>
          </div>
        </div>
      </div>

      <app-inventory-import-preview
        [show]="showImportModal"
        [step]="importStep"
        title="Carga Masiva de Stock PT"
        subtitle="Importe producto terminado desde Excel o CSV"
        uploadHint="Las filas sin CAJA también se importarán y quedarán marcadas para resolverlas después."
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
        importingTitle="Importando stock..."
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
    :host { display: block; height: 100%; min-height: 0; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #121921; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .btn-primary { padding: .625rem 1rem; border-radius: .5rem; background: #4f46e5; color: white; font-weight: 700; }
    .btn-secondary { padding: .625rem 1rem; border-radius: .5rem; border: 1px solid #475569; color: #cbd5e1; background: #1e293b; font-weight: 700; }
    .stat-card { background: #1e293b; padding: 1.25rem; border-radius: .75rem; border: 1px solid rgba(71,85,105,.6); display:flex; flex-direction:column; gap:.5rem; }
    .stat-card span { font-size: .625rem; font-weight: 700; letter-spacing: .12em; color: #94a3b8; text-transform: uppercase; }
    .stat-card strong { font-size: 1.875rem; font-weight: 900; color: white; }
    .th-cell { padding: .65rem .75rem; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; border-bottom: 1px solid #334155; white-space: nowrap; line-height: 1.1; }
    .td-cell { padding: .45rem .75rem; color: #cbd5e1; vertical-align: middle; line-height: 1.15; }
    .input-field { width: 100%; background: #0f172a; border: 1px solid #475569; border-radius: .5rem; padding: .625rem .75rem; color: white; outline: none; }
    .status-btn { padding: .5rem; border-radius: .5rem; border: 1px solid transparent; font-size: .75rem; font-weight: 700; }
    .status-btn-idle { background: transparent; color: #94a3b8; border-color: #475569; }
  `],
})
export class InventoryStockComponent implements AfterViewInit, OnDestroy {
  inventoryService = inject(InventoryService);
  importFlow = inject(InventoryImportFlowService);
  state = inject(StateService);
  notifications = inject(NotificationService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  destroyRef = inject(DestroyRef);

  @ViewChild('viewportRoot') viewportRootRef?: ElementRef<HTMLDivElement>;
  @ViewChild('tableScroll') tableScrollRef?: ElementRef<HTMLDivElement>;

  stockItems: StockItem[] = [];
  searchTerm = '';
  showModal = false;
  editingItem = false;
  isReadOnly = false;
  tempItem: Record<string, any> = {};
  isLoading = false;
  isImporting = false;
  showImportModal = false;
  importStep: 'upload' | 'preview' = 'upload';
  showImportPreviewModal = false;
  previewData: StockItem[] = [];
  conflictsData: StockItem[] = [];
  discardedRowsCount = 0;
  loadingProgress = 0;
  loadingStatusText = 'Preparando archivo...';
  analysisTotalItems = 0;
  analysisProcessedItems = 0;
  importProgressPercent = 0;
  importProgressText = '';
  importProcessedItems = 0;
  importTotalItems = 0;
  importTotalBatches = 0;
  currentPage = 1;
  rowsPerPage = 8;
  viewportHeight: number | null = null;
  loadStatus: InventoryLoadStatus = {
    state: 'idle',
    lastSuccessfulSync: null,
    errorMessage: null,
  };

  private readonly minimumRowsPerPage = 4;
  private readonly compactRowHeight = 42;
  readonly importPreviewLimit = 120;
  readonly importPreviewColumns: InventoryImportColumn<StockItem>[] = [
    { label: 'Medida', value: (item) => item.medida },
    { label: 'Ancho MM', value: (item) => item.anchoMm, align: 'right', mono: true },
    { label: 'Avance MM', value: (item) => item.avanceMm, align: 'right', mono: true },
    { label: 'Material', value: (item) => item.material },
    { label: 'Columnas', value: (item) => item.columnas, align: 'right', mono: true },
    { label: 'Prepicado', value: (item) => item.prepicado },
    { label: 'Cantidad X Rollo', value: (item) => item.cantidadXRollo, align: 'right', mono: true },
    { label: 'Cantidad Millares', value: (item) => item.cantidadMillares, align: 'right', mono: true },
    { label: 'Etiqueta', value: (item) => item.etiqueta },
    { label: 'Forma', value: (item) => item.forma },
    { label: 'Tipo de Producto', value: (item) => item.tipoProducto },
    { label: 'Caja', value: (item) => item.caja, emptyValue: '(VACÍO)', mono: true },
    { label: 'Ubicación', value: (item) => item.ubicacion },
  ];
  private loadingProgressInterval?: number;

  readonly modalFields = [
    { key: 'medida', label: 'Medida' },
    { key: 'anchoMm', label: 'Ancho MM', type: 'number', mono: true },
    { key: 'avanceMm', label: 'Avance MM', type: 'number', mono: true },
    { key: 'material', label: 'Material' },
    { key: 'columnas', label: 'Columnas', type: 'number', mono: true },
    { key: 'prepicado', label: 'Prepicado' },
    { key: 'cantidadXRollo', label: 'Cantidad X Rollo', type: 'number', mono: true },
    { key: 'cantidadMillares', label: 'Cantidad Millares', type: 'number', mono: true },
    { key: 'etiqueta', label: 'Etiqueta' },
    { key: 'forma', label: 'Forma' },
    { key: 'tipoProducto', label: 'Tipo de Producto' },
    { key: 'caja', label: 'Caja', mono: true },
    { key: 'ubicacion', label: 'Ubicación', mono: true },
    { key: 'boxId', label: 'ID Generado', mono: true, readonly: true },
  ];

  constructor() {
    this.inventoryService.stockItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.ngZone.run(() => {
          this.stockItems = items;
          this.ensurePageWithinBounds();
          this.schedulePageSizeCalculation();
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

  ngAfterViewInit() {
    this.schedulePageSizeCalculation();
  }

  ngOnDestroy() {
    this.stopLoadingProgressSimulation();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.schedulePageSizeCalculation();
  }

  get canManageInventory() {
    return this.state.hasPermission('inventory.stock.manage');
  }

  get showInitialLoadingOverlay() {
    return this.loadStatus.state === 'loading' && this.stockItems.length === 0 && !this.isLoading;
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

  get filteredItems() {
    const term = this.searchTerm.toLowerCase().trim();
    return this.stockItems.filter((item) =>
      !term ||
      item.medida.toLowerCase().includes(term) ||
      item.material.toLowerCase().includes(term) ||
      item.etiqueta.toLowerCase().includes(term) ||
      item.forma.toLowerCase().includes(term) ||
      item.tipoProducto.toLowerCase().includes(term) ||
      item.caja.toLowerCase().includes(term) ||
      item.ubicacion.toLowerCase().includes(term) ||
      String(item.boxId || '').toLowerCase().includes(term),
    );
  }

  get paginatedItems() {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    return this.filteredItems.slice(start, start + this.rowsPerPage);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.rowsPerPage));
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
    return {
      totalMillares: this.stockItems.reduce((acc, item) => acc + (item.cantidadMillares || 0), 0),
      quarantine: this.stockItems.filter((item) => item.status === 'Cuarentena').length,
      released: this.stockItems.filter((item) => item.status === 'Liberado').length,
      held: this.stockItems.filter((item) => item.status === 'Retenido').length,
    };
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'Liberado': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Cuarentena': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'Retenido': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Despachado': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  }

  handleSearchChange() {
    this.currentPage = 1;
    this.ensurePageWithinBounds();
  }

  goToPage(page: number) {
    this.currentPage = Math.min(this.totalPages, Math.max(1, page));
  }

  goToPreviousPage() {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage() {
    this.goToPage(this.currentPage + 1);
  }

  trackByItemId(index: number, item: StockItem) {
    return item.id || item.boxId || `${item.caja}-${index}`;
  }

  openModal(item: StockItem | null) {
    if (!item && !this.canManageInventory) return;
    this.editingItem = !!item;
    this.isReadOnly = !!item && !this.canManageInventory;
    this.tempItem = item ? { ...item } : {
      id: Math.random().toString(36).slice(2, 11),
      medida: '',
      anchoMm: null,
      avanceMm: null,
      material: '',
      columnas: null,
      prepicado: '',
      cantidadXRollo: null,
      cantidadMillares: null,
      etiqueta: '',
      forma: '',
      tipoProducto: '',
      caja: '',
      ubicacion: 'RECEPCION',
      status: 'Cuarentena',
      entryDate: new Date().toISOString(),
      notes: '',
      boxId: '',
      hasConflict: false,
      conflictReasons: [],
    };
    this.showModal = true;
  }

  async saveItem() {
    if (this.isReadOnly || !this.canManageInventory) return;
    if (!String(this.tempItem.caja || '').trim()) {
      this.notifications.showWarning('Complete la CAJA antes de guardar.');
      return;
    }

    const item = this.tempItem as StockItem;

    try {
      if (this.editingItem) {
        await this.inventoryService.updateStock(item);
      } else {
        item.entryDate = new Date().toISOString();
        await this.inventoryService.addStock(item);
      }
      this.showModal = false;
    } catch (error: any) {
      this.notifications.showError(
        error?.message || 'No se pudo persistir el producto terminado.',
      );
    }
  }

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
      const result = await this.importFlow.analyzeFile<StockItem>({
        entityLabel: 'registros de stock',
        file,
        normalize: (rows) => this.inventoryService.normalizeStockData(rows),
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
      this.notifications.showError(
        error?.message || 'No se pudo leer el archivo de stock.',
      );
      this.loadingProgress = 0;
      this.loadingStatusText = 'Preparando archivo...';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async confirmImport() {
    if (!this.canManageInventory || this.isImporting) return;
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
      const result = await this.inventoryService.importStocks(
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
      this.notifications.showSuccess(
        result.conflicts > 0
          ? `Se importaron ${result.imported} registros. ${result.conflicts} quedaron marcados para revisión.`
          : `Se importaron ${result.imported} registros.`,
      );
      this.isImporting = false;
      this.closeImportModal();
    } catch (error: any) {
      this.notifications.showError(
        error?.message || 'No se pudo completar la importación.',
      );
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

  private schedulePageSizeCalculation() {
    this.ngZone.runOutsideAngular(() => {
      window.requestAnimationFrame(() => {
        const nextViewportHeight = this.calculateViewportHeight();
        const nextRowsPerPage = this.calculateRowsPerPage();
        const viewportHeightChanged = nextViewportHeight !== this.viewportHeight;
        const rowsChanged = nextRowsPerPage !== this.rowsPerPage;

        if (!viewportHeightChanged && !rowsChanged) return;

        this.ngZone.run(() => {
          this.viewportHeight = nextViewportHeight;
          this.rowsPerPage = nextRowsPerPage;
          this.ensurePageWithinBounds();
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

  private calculateRowsPerPage() {
    const tableScrollElement = this.tableScrollRef?.nativeElement;
    if (!tableScrollElement) {
      return this.rowsPerPage;
    }

    const tableHeadElement = tableScrollElement.querySelector('thead');
    const scrollAreaHeight = tableScrollElement.clientHeight;
    const tableHeadHeight = tableHeadElement?.getBoundingClientRect().height ?? 0;
    const availableRowsHeight = scrollAreaHeight - tableHeadHeight;

    if (!scrollAreaHeight || !availableRowsHeight) {
      return this.rowsPerPage;
    }

    const rowsThatFit = Math.floor(availableRowsHeight / this.compactRowHeight);
    return Math.max(this.minimumRowsPerPage, rowsThatFit || this.minimumRowsPerPage);
  }

  private ensurePageWithinBounds() {
    const totalPages = this.totalPages;
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
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
