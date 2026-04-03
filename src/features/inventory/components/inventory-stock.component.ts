import { Component, inject, NgZone, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventoryService } from '../services/inventory.service';
import { StockItem } from '../models/inventory.models';
import { ExcelService } from '../../../services/excel.service';
import { StateService } from '../../../services/state.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-inventory-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 flex flex-col p-6 max-w-[1920px] mx-auto w-full overflow-hidden h-full bg-[#0f172a] text-slate-200">
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
          <input [(ngModel)]="searchTerm" class="w-full sm:w-80 px-4 py-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Buscar medida, material, etiqueta, caja o ubicación">
          <ng-container *ngIf="canManageInventory">
            <input #fileInputStock type="file" (change)="handleImport($event)" accept=".xlsx, .xls, .csv" class="hidden">
            <button (click)="fileInputStock.click()" [disabled]="isLoading || isImporting" class="btn-secondary">
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

      <div class="bg-[#1e293b] rounded-xl shadow-lg border border-slate-700/60 overflow-hidden flex-1 flex flex-col relative">
        <div *ngIf="isLoading" class="absolute inset-0 z-20 flex items-center justify-center bg-[#1e293b]/85 backdrop-blur-sm text-white font-bold">
          Analizando archivo de stock...
        </div>

        <div class="overflow-auto custom-scrollbar flex-1">
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
              <tr *ngFor="let item of filteredItems" class="hover:bg-slate-700/30 transition-colors">
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
                    <span class="text-[10px] text-slate-500 font-mono">{{ item.boxId || 'ID pendiente' }}</span>
                  </div>
                </td>
                <td class="td-cell">{{ item.forma || '---' }}</td>
                <td class="td-cell">{{ item.tipoProducto || '---' }}</td>
                <td class="td-cell font-mono">{{ item.caja || '---' }}</td>
                <td class="td-cell font-mono">{{ item.ubicacion || '---' }}</td>
                <td class="td-cell">
                  <span class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider" [ngClass]="getStatusClass(item.status)">{{ item.status }}</span>
                </td>
                <td class="td-cell">
                  <button (click)="openModal(item)" class="text-slate-400 hover:text-indigo-400 transition-colors p-2 hover:bg-slate-700/50 rounded-lg">
                    <span class="material-icons">{{ canManageInventory ? 'edit_note' : 'visibility' }}</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredItems.length === 0">
                <td colspan="15" class="p-12 text-center text-slate-500 italic">No se encontraron productos terminados.</td>
              </tr>
            </tbody>
          </table>
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

      <div *ngIf="showImportPreviewModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog">
        <div class="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden border border-slate-700">
          <div class="bg-[#0f172a] px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-white text-lg">Previsualización de Importación (Stock PT)</h3>
              <p class="text-xs text-slate-400 mt-1">Los conflictos se marcan cuando falta el valor de CAJA.</p>
            </div>
            <button (click)="cancelImport()" [disabled]="isImporting" class="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-auto p-6">
            <table class="w-full text-sm text-left border-collapse">
              <thead class="text-xs text-slate-400 uppercase bg-[#0f172a] sticky top-0 z-10 font-bold tracking-wider">
                <tr>
                  <th class="th-cell">#</th>
                  <th class="th-cell">Estado Imp.</th>
                  <th class="th-cell">MEDIDA</th>
                  <th class="th-cell">ANCHO MM</th>
                  <th class="th-cell">AVANCE MM</th>
                  <th class="th-cell">MATERIAL</th>
                  <th class="th-cell">COLUMNAS</th>
                  <th class="th-cell">PREPICADO</th>
                  <th class="th-cell">CANTIDAD X ROLLO</th>
                  <th class="th-cell">CANTIDAD MILLARES</th>
                  <th class="th-cell">ETIQUETA</th>
                  <th class="th-cell">FORMA</th>
                  <th class="th-cell">TIPO DE PRODUCTO</th>
                  <th class="th-cell">CAJA</th>
                  <th class="th-cell">UBICACIÓN</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700">
                <tr *ngFor="let item of conflictsData; let i = index" class="bg-red-500/5">
                  <td class="td-cell">{{ i + 1 }}</td>
                  <td class="td-cell text-red-400 font-bold">FALTA CAJA</td>
                  <td class="td-cell">{{ item.medida || '---' }}</td>
                  <td class="td-cell">{{ item.anchoMm ?? '---' }}</td>
                  <td class="td-cell">{{ item.avanceMm ?? '---' }}</td>
                  <td class="td-cell">{{ item.material || '---' }}</td>
                  <td class="td-cell">{{ item.columnas ?? '---' }}</td>
                  <td class="td-cell">{{ item.prepicado || '---' }}</td>
                  <td class="td-cell">{{ item.cantidadXRollo ?? '---' }}</td>
                  <td class="td-cell">{{ item.cantidadMillares ?? '---' }}</td>
                  <td class="td-cell">{{ item.etiqueta || '---' }}</td>
                  <td class="td-cell">{{ item.forma || '---' }}</td>
                  <td class="td-cell">{{ item.tipoProducto || '---' }}</td>
                  <td class="td-cell font-mono">{{ item.caja || '(VACÍO)' }}</td>
                  <td class="td-cell">{{ item.ubicacion || '---' }}</td>
                </tr>
                <tr *ngFor="let item of previewData; let i = index">
                  <td class="td-cell">{{ conflictsData.length + i + 1 }}</td>
                  <td class="td-cell text-emerald-400 font-bold">OK</td>
                  <td class="td-cell">{{ item.medida || '---' }}</td>
                  <td class="td-cell">{{ item.anchoMm ?? '---' }}</td>
                  <td class="td-cell">{{ item.avanceMm ?? '---' }}</td>
                  <td class="td-cell">{{ item.material || '---' }}</td>
                  <td class="td-cell">{{ item.columnas ?? '---' }}</td>
                  <td class="td-cell">{{ item.prepicado || '---' }}</td>
                  <td class="td-cell">{{ item.cantidadXRollo ?? '---' }}</td>
                  <td class="td-cell">{{ item.cantidadMillares ?? '---' }}</td>
                  <td class="td-cell">{{ item.etiqueta || '---' }}</td>
                  <td class="td-cell">{{ item.forma || '---' }}</td>
                  <td class="td-cell">{{ item.tipoProducto || '---' }}</td>
                  <td class="td-cell font-mono">{{ item.caja }}</td>
                  <td class="td-cell">{{ item.ubicacion }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="bg-[#0f172a] px-6 py-4 border-t border-slate-700 flex justify-end gap-4">
            <button (click)="cancelImport()" [disabled]="isImporting" class="btn-secondary">Cancelar Importación</button>
            <button (click)="confirmImport()" [disabled]="isImporting || previewData.length === 0" class="btn-primary">Importar Válidos</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #121921; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .btn-primary { padding: .625rem 1rem; border-radius: .5rem; background: #4f46e5; color: white; font-weight: 700; }
    .btn-secondary { padding: .625rem 1rem; border-radius: .5rem; border: 1px solid #475569; color: #cbd5e1; background: #1e293b; font-weight: 700; }
    .stat-card { background: #1e293b; padding: 1.25rem; border-radius: .75rem; border: 1px solid rgba(71,85,105,.6); display:flex; flex-direction:column; gap:.5rem; }
    .stat-card span { font-size: .625rem; font-weight: 700; letter-spacing: .12em; color: #94a3b8; text-transform: uppercase; }
    .stat-card strong { font-size: 1.875rem; font-weight: 900; color: white; }
    .th-cell { padding: 1rem; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; border-bottom: 1px solid #334155; white-space: nowrap; }
    .td-cell { padding: .875rem 1rem; color: #cbd5e1; vertical-align: top; }
    .input-field { width: 100%; background: #0f172a; border: 1px solid #475569; border-radius: .5rem; padding: .625rem .75rem; color: white; outline: none; }
    .status-btn { padding: .5rem; border-radius: .5rem; border: 1px solid transparent; font-size: .75rem; font-weight: 700; }
    .status-btn-idle { background: transparent; color: #94a3b8; border-color: #475569; }
  `],
})
export class InventoryStockComponent {
  inventoryService = inject(InventoryService);
  excelService = inject(ExcelService);
  state = inject(StateService);
  notifications = inject(NotificationService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  destroyRef = inject(DestroyRef);

  stockItems: StockItem[] = [];
  searchTerm = '';
  showModal = false;
  editingItem = false;
  isReadOnly = false;
  tempItem: Record<string, any> = {};
  isLoading = false;
  isImporting = false;
  showImportPreviewModal = false;
  previewData: StockItem[] = [];
  conflictsData: StockItem[] = [];

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
      .subscribe((items) => (this.stockItems = items));
  }

  get canManageInventory() {
    return this.state.hasPermission('inventory.stock.manage');
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

  async handleImport(event: any) {
    if (!this.canManageInventory) return;
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.ngZone.runOutsideAngular(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const rawData = await this.excelService.readExcel(file);

        this.ngZone.run(() => {
          const { valid, conflicts } = this.inventoryService.normalizeStockData(rawData);
          this.previewData = valid;
          this.conflictsData = conflicts;
          this.showImportPreviewModal = true;
          this.isLoading = false;
          event.target.value = '';
        });
      } catch (error: any) {
        this.ngZone.run(() => {
          this.notifications.showError(
            error?.message || 'No se pudo leer el archivo de stock.',
          );
          this.isLoading = false;
          event.target.value = '';
        });
      }
    });
  }

  async confirmImport() {
    if (!this.canManageInventory || this.isImporting) return;
    this.isImporting = true;
    this.cdr.detectChanges();

    try {
      await this.inventoryService.addStocks(this.previewData);
      const skipped = this.conflictsData.length;
      this.notifications.showSuccess(
        skipped > 0
          ? `Se importaron ${this.previewData.length} registros válidos. Quedaron ${skipped} pendientes por falta de CAJA.`
          : `Se importaron ${this.previewData.length} registros.`,
      );
      this.cancelImport();
    } catch (error: any) {
      this.notifications.showError(
        error?.message || 'No se pudo completar la importación.',
      );
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
