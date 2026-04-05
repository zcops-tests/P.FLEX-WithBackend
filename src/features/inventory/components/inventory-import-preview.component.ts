import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InventoryImportColumn } from '../models/inventory-import.models';

export type InventoryImportStep = 'upload' | 'preview';

@Component({
  selector: 'app-inventory-import-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" (click)="canClose && closeRequested.emit()"></div>

      <div class="relative bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-white/10 animate-fadeIn transition-all">
        <div class="bg-[#0f172a] border-b border-white/10 px-8 py-5 flex justify-between items-center shrink-0 z-20">
          <div>
            <h2 class="text-xl font-black text-white flex items-center gap-3">
              <div class="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 shadow-sm border border-emerald-500/20">
                <span class="material-icons text-2xl">table_view</span>
              </div>
              {{ title }}
            </h2>
            <p class="text-sm text-slate-400 mt-1 font-medium ml-1">{{ subtitle }}</p>
          </div>
          <button (click)="canClose && closeRequested.emit()" class="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors disabled:opacity-50" [disabled]="!canClose">
            <span class="material-icons text-2xl">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-hidden bg-[#1e293b] flex flex-col relative p-6">
          <div *ngIf="step === 'upload'" class="flex-1 flex flex-col items-center justify-center h-full relative animate-fadeIn">
            <div
              class="w-full max-w-2xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden bg-white/5 shadow-inner"
              [ngClass]="{
                'border-blue-500 bg-blue-500/10': isDragging,
                'border-white/10 hover:border-blue-500/50 hover:bg-white/10 hover:shadow-lg': !isDragging,
                'opacity-50 pointer-events-none grayscale': isLoading || isImporting
              }"
              (click)="openFilePicker(fileInput)"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)">

              <input #fileInput type="file" class="hidden" [accept]="accept" (change)="onFileSelected($event)">

              <div class="flex flex-col items-center z-10 p-8 text-center transition-transform duration-300 group-hover:-translate-y-2">
                <div class="w-24 h-24 rounded-full bg-[#0f172a] text-slate-500 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl border border-white/5 group-hover:border-blue-400">
                  <span class="material-icons text-5xl">upload_file</span>
                </div>

                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  Arrastre su archivo Excel aquí
                </h3>
                <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  O haga clic para explorar. Aceptamos formatos .xlsx, .xls y .csv.
                  <br><span class="text-xs text-slate-500 mt-2 block">{{ uploadHint }}</span>
                </p>

                <span class="px-6 py-2.5 bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl shadow-lg group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
                  Seleccionar Archivo
                </span>
              </div>
            </div>

            <div *ngIf="isLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1e293b]/90 backdrop-blur-sm rounded-xl border border-white/10">
              <div class="relative w-20 h-20 mb-6">
                <div class="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 class="text-xl font-black text-white mb-1">Analizando Datos...</h3>
              <p class="text-sm text-slate-400 font-medium">{{ analysisDetail }}</p>

              <div class="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-xl">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-sm font-bold text-white">{{ analysisPhase }}</p>
                    <p class="text-xs text-slate-400">
                      {{ analysisProcessedItems }} de {{ analysisTotalItems }} registros
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black text-blue-400">{{ analysisPercentage }}%</p>
                    <p class="text-[11px] text-slate-500">Análisis previo</p>
                  </div>
                </div>

                <div class="mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-white/10">
                  <div class="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300" [style.width.%]="analysisPercentage"></div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="step === 'preview'" class="flex flex-col h-full bg-[#0f172a] rounded-xl border border-white/10 shadow-xl overflow-hidden animate-slideInRight">
            <div class="px-5 py-4 bg-[#1e293b] border-b border-white/10 flex justify-between items-center shrink-0">
              <div class="flex items-center gap-4">
                <div class="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-2">
                  <span class="material-icons text-sm">dataset</span>
                  {{ validRows.length }} válidos
                </div>
                <span class="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                  <span class="material-icons text-[14px]">auto_fix_high</span> Limpieza Completada
                </span>
                <span class="text-xs text-amber-300 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1">
                  <span class="material-icons text-[14px]">rule</span> {{ totalRows }} importables
                </span>
                <span *ngIf="conflictRows.length > 0" class="text-xs text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1">
                  <span class="material-icons text-[14px]">warning</span> {{ conflictRows.length }} conflictos importables
                </span>
                <span *ngIf="discardedCount > 0" class="text-xs text-slate-300 font-bold bg-slate-700/50 px-2 py-1 rounded border border-slate-600/70 flex items-center gap-1">
                  <span class="material-icons text-[14px]">delete_sweep</span> {{ discardedCount }} descartados
                </span>
              </div>
              <button (click)="resetRequested.emit()" class="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-transparent hover:border-red-500/20" [disabled]="isImporting">
                <span class="material-icons text-base">delete</span> Descartar
              </button>
            </div>

            <div *ngIf="isImporting" class="px-5 py-4 border-b border-white/10 bg-slate-950/40">
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-sm font-bold text-white">{{ importingTitle }}</p>
                    <p class="text-xs text-slate-400">
                      {{ importProcessedItems }} de {{ importTotalItems }} registros procesados
                      <span *ngIf="importTotalBatches > 0">· Lote {{ importCurrentBatchLabel }} de {{ importTotalBatches }}</span>
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black text-emerald-400">{{ importProgressPercent }}%</p>
                    <p class="text-[11px] text-slate-500">{{ importStatusLabel }}</p>
                  </div>
                </div>

                <div class="h-3 overflow-hidden rounded-full bg-white/10 border border-white/10">
                  <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 transition-all duration-300" [style.width.%]="importProgressPercent"></div>
                </div>
              </div>
            </div>

            <div class="flex-1 overflow-auto custom-scrollbar relative bg-[#0f172a]">
              <table class="w-full text-xs text-left border-collapse">
                <thead class="bg-[#1e293b] text-slate-300 font-bold sticky top-0 z-10 shadow-sm border-b border-white/10">
                  <tr>
                    <th class="p-3 w-12 text-center text-slate-500">#</th>
                    <th class="px-4 py-3">Estado</th>
                    <th *ngFor="let column of columns" class="px-4 py-3" [class.text-center]="column.align === 'center'" [class.text-right]="column.align === 'right'">
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 bg-[#0f172a]">
                  <tr *ngFor="let row of previewConflictRows; let i = index; trackBy: trackByRow" class="bg-red-500/5 hover:bg-red-500/10 transition-colors group border-b border-white/5">
                    <td class="p-2 text-center font-mono text-slate-600 select-none">{{ i + 1 }}</td>
                    <td class="px-4 py-2 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase">Revisar</span>
                    </td>
                    <td *ngFor="let column of columns" class="px-4 py-2 text-slate-300" [class.text-center]="column.align === 'center'" [class.text-right]="column.align === 'right'" [class.font-mono]="column.mono" [ngClass]="getConflictCellClass(row, column)">
                      {{ getDisplayValue(row, column) }}
                    </td>
                  </tr>
                  <tr *ngFor="let row of previewValidRows; let i = index; trackBy: trackByRow" class="hover:bg-white/5 transition-colors group border-b border-white/5">
                    <td class="p-2 text-center font-mono text-slate-600 select-none">{{ previewConflictRows.length + i + 1 }}</td>
                    <td class="px-4 py-2 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-bold uppercase">OK</span>
                    </td>
                    <td *ngFor="let column of columns" class="px-4 py-2 text-slate-300" [class.text-center]="column.align === 'center'" [class.text-right]="column.align === 'right'" [class.font-mono]="column.mono">
                      {{ getDisplayValue(row, column) }}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div *ngIf="hasHiddenPreviewRows" class="p-4 text-center bg-[#1e293b] border-t border-white/10 text-xs text-slate-500 font-bold italic">
                ... y {{ totalRows - (previewConflictRows.length + previewValidRows.length) }} registros más.
              </div>
            </div>
          </div>
        </div>

        <div class="bg-[#0f172a] border-t border-white/10 p-5 flex justify-end gap-3 shrink-0 z-20">
          <button (click)="closeRequested.emit()" class="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 hover:text-white transition-colors text-sm disabled:opacity-50" [disabled]="!canClose">
            Cancelar
          </button>

          <button *ngIf="step === 'preview' && totalRows > 0" (click)="confirmRequested.emit()" class="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 border border-emerald-500/50 flex items-center gap-2 text-sm active:transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed min-w-[220px] justify-center" [disabled]="isImporting">
            <ng-container *ngIf="!isImporting">
              <span class="material-icons text-lg">check_circle</span>
              {{ confirmButtonLabel }}
            </ng-container>
            <ng-container *ngIf="isImporting">
              <span class="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin"></span>
              Procesando...
            </ng-container>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; border: 2px solid #0f172a; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    .animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  `],
})
export class InventoryImportPreviewComponent {
  @Input() show = false;
  @Input() step: InventoryImportStep = 'upload';
  @Input() title = 'Carga Masiva';
  @Input() subtitle = 'Importe registros desde Excel o CSV';
  @Input() uploadHint = 'El sistema detectará y limpiará automáticamente los datos.';
  @Input() accept = '.xlsx, .xls, .csv';
  @Input() validRows: any[] = [];
  @Input() conflictRows: any[] = [];
  @Input() discardedCount = 0;
  @Input() columns: InventoryImportColumn<any>[] = [];
  @Input() isLoading = false;
  @Input() isImporting = false;
  @Input() analysisPhase = 'Preparando archivo';
  @Input() analysisPercentage = 0;
  @Input() analysisProcessedItems = 0;
  @Input() analysisTotalItems = 0;
  @Input() analysisDetail = 'Cargando archivo...';
  @Input() importingTitle = 'Importando registros...';
  @Input() confirmButtonLabel = 'Confirmar Importación';
  @Input() importProgressPercent = 0;
  @Input() importProgressText = '';
  @Input() importProcessedItems = 0;
  @Input() importTotalItems = 0;
  @Input() importTotalBatches = 0;
  @Input() importCurrentBatchLabel = '1';
  @Input() importStatusLabel = 'Preparando lotes...';
  @Input() previewLimit = 100;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() resetRequested = new EventEmitter<void>();
  @Output() confirmRequested = new EventEmitter<void>();

  isDragging = false;

  get totalRows() {
    return this.validRows.length + this.conflictRows.length;
  }

  get canClose() {
    return !this.isLoading && !this.isImporting;
  }

  get previewConflictRows() {
    return this.conflictRows.slice(0, this.previewLimit);
  }

  get previewValidRows() {
    const remaining = Math.max(this.previewLimit - this.previewConflictRows.length, 0);
    return this.validRows.slice(0, remaining);
  }

  get hasHiddenPreviewRows() {
    return this.previewConflictRows.length + this.previewValidRows.length < this.totalRows;
  }

  openFilePicker(fileInput: HTMLInputElement) {
    if (this.isLoading || this.isImporting) return;
    fileInput.click();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.isLoading && !this.isImporting) this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (this.isLoading || this.isImporting) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) this.fileSelected.emit(file);
    if (input) {
      input.value = '';
    }
  }

  getDisplayValue(row: any, column: InventoryImportColumn<any>) {
    const resolved = column.value(row);
    const text = String(resolved ?? '').trim();
    return text || column.emptyValue || '---';
  }

  getConflictCellClass(row: any, column: InventoryImportColumn<any>) {
    const text = String(column.value(row) ?? '').trim();
    return text ? 'text-slate-300' : 'text-red-500 italic';
  }

  trackByRow(index: number, row: any) {
    return row?.id || row?.item || row?.serie || row?.boxId || index;
  }
}
