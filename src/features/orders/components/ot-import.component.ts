
import { Component, Output, EventEmitter, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileExportService } from '../../../services/file-export.service';
import { OT_IMPORT_HEADERS, OTImportProgress } from '../models/orders.models';

const ANALYSIS_CHUNK_SIZE = 200;

interface OtAnalysisProgress {
  phase: string;
  percentage: number;
  processedItems: number;
  totalItems: number;
  detail: string;
}

@Component({
  selector: 'app-ot-import',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" (click)="!isLoading && !isImporting && close.emit()"></div>

      <!-- Modal Content -->
      <div class="relative bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-white/10 animate-fadeIn transition-all">
        
        <!-- Header -->
        <div class="bg-[#0f172a] border-b border-white/10 px-8 py-5 flex justify-between items-center shrink-0 z-20">
          <div>
            <h2 class="text-xl font-black text-white flex items-center gap-3">
              <div class="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 shadow-sm border border-emerald-500/20">
                <span class="material-icons text-2xl">table_view</span>
              </div>
              Carga Masiva de OTs
            </h2>
            <p class="text-sm text-slate-400 mt-1 font-medium ml-1">Importe registros de producción desde Excel o CSV</p>
          </div>
          <button (click)="!isLoading && !isImporting && close.emit()" class="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors disabled:opacity-50" [disabled]="isLoading || isImporting">
            <span class="material-icons text-2xl">close</span>
          </button>
        </div>

        <!-- Main Body -->
        <div class="flex-1 overflow-hidden bg-[#1e293b] flex flex-col relative p-6">
          
          <!-- STEP 1: UPLOAD ZONE -->
          <div *ngIf="step === 'upload'" class="flex-1 flex flex-col items-center justify-center h-full relative animate-fadeIn">
            
            <div 
              class="w-full max-w-2xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden bg-white/5 shadow-inner"
              [ngClass]="{
                'border-blue-500 bg-blue-500/10': isDragging,
                'border-white/10 hover:border-blue-500/50 hover:bg-white/10 hover:shadow-lg': !isDragging,
                'opacity-50 pointer-events-none grayscale': isLoading
              }"
              (click)="!isLoading && fileInput.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)">
              
              <input #fileInput type="file" class="hidden" accept=".xlsx, .xls, .csv" (change)="onFileSelected($event)">
              
              <div class="flex flex-col items-center z-10 p-8 text-center transition-transform duration-300 group-hover:-translate-y-2">
                 <div class="w-24 h-24 rounded-full bg-[#0f172a] text-slate-500 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl border border-white/5 group-hover:border-blue-400">
                   <span class="material-icons text-5xl">upload_file</span>
                 </div>
                 
                 <h3 class="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Arrastre su archivo Excel aquí
                 </h3>
                 <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">
                    O haga clic para explorar. Aceptamos formatos .xlsx, .xls y .csv.
                    <br><span class="text-xs text-slate-500 mt-2 block">El sistema detectará y limpiará automáticamente los datos.</span>
                 </p>
                 
                 <span class="px-6 py-2.5 bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl shadow-lg group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
                   Seleccionar Archivo
                 </span>
              </div>

            </div>

            <!-- Loading Overlay -->
            <div *ngIf="isLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1e293b]/90 backdrop-blur-sm rounded-xl border border-white/10">
                 <div class="relative w-20 h-20 mb-6">
                    <div class="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                    <div class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
                 <h3 class="text-xl font-black text-white mb-1">Analizando Datos...</h3>
                 <p class="text-sm text-slate-400 font-medium">{{ analysisDetailLabel }}</p>

                 <div class="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-xl">
                   <div class="flex items-center justify-between gap-4">
                     <div>
                       <p class="text-sm font-bold text-white">{{ analysisPhaseLabel }}</p>
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
                     <div
                       class="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                       [style.width.%]="analysisPercentage">
                     </div>
                   </div>
                 </div>
            </div>

          </div>

          <!-- STEP 2: DATA PREVIEW -->
          <div *ngIf="step === 'preview'" class="flex flex-col h-full bg-[#0f172a] rounded-xl border border-white/10 shadow-xl overflow-hidden animate-slideInRight">
            
            <div class="px-5 py-4 bg-[#1e293b] border-b border-white/10 flex justify-between items-center shrink-0">
              <div class="flex items-center gap-4">
                  <div class="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-2">
                    <span class="material-icons text-sm">dataset</span>
                    {{ importedData.length }} Registros Únicos
                  </div>
                  <span class="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                    <span class="material-icons text-[14px]">auto_fix_high</span> Limpieza Completada
                  </span>
              </div>
              <button (click)="reset()" class="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-transparent hover:border-red-500/20" [disabled]="isImporting">
                 <span class="material-icons text-base">delete</span> Descartar
              </button>
            </div>

            <div *ngIf="isImporting" class="px-5 py-4 border-b border-white/10 bg-slate-950/40">
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-sm font-bold text-white">Importando a la base de datos</p>
                    <p class="text-xs text-slate-400">
                      {{ progressProcessedItems }} de {{ progressTotalItems }} registros procesados
                      <span *ngIf="progressTotalBatches > 0">· Lote {{ progressCurrentBatchLabel }} de {{ progressTotalBatches }}</span>
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black text-emerald-400">{{ progressPercentage }}%</p>
                    <p class="text-[11px] text-slate-500">{{ progressStatusLabel }}</p>
                  </div>
                </div>

                <div class="h-3 overflow-hidden rounded-full bg-white/10 border border-white/10">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 transition-all duration-300"
                    [style.width.%]="progressPercentage">
                  </div>
                </div>
              </div>
            </div>

            <div class="flex-1 overflow-auto custom-scrollbar relative bg-[#0f172a]">
              <table class="w-full text-xs text-left border-collapse">
                <thead class="bg-[#1e293b] text-slate-300 font-bold sticky top-0 z-10 shadow-sm border-b border-white/10">
                  <tr>
                    <th class="p-3 w-12 text-center text-slate-500">#</th>
                    <th class="px-4 py-3">OT (ID)</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Producto / Descripción</th>
                    <th class="px-4 py-3">Máquina (Importada)</th>
                    <th class="px-4 py-3 text-right">Cantidad</th>
                    <th class="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 bg-[#0f172a]">
                  <tr *ngFor="let row of importedData | slice:0:100; let i = index" class="hover:bg-white/5 transition-colors group border-b border-white/5">
                    <td class="p-2 text-center font-mono text-slate-600 select-none">
                      {{ i + 1 }}
                    </td>
                    <td class="px-4 py-2 font-bold text-blue-400 font-mono">{{ row.OT || '-' }}</td>
                    <td class="px-4 py-2 font-medium text-slate-300">{{ row['Razon Social'] || '-' }}</td>
                    <td class="px-4 py-2 text-slate-400 truncate max-w-[200px]">{{ row.descripcion || '-' }}</td>
                    <td class="px-4 py-2 text-slate-500 font-mono text-[10px] uppercase">{{ row.maquina || '-' }}</td>
                    <td class="px-4 py-2 text-right font-mono text-slate-300">{{ row['CANT PED'] | number }}</td>
                    <td class="px-4 py-2 text-center">
                         <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-bold uppercase">
                            {{ row.Estado_pedido || 'PENDIENTE' }}
                         </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div *ngIf="importedData.length > 100" class="p-4 text-center bg-[#1e293b] border-t border-white/10 text-xs text-slate-500 font-bold italic">
                 ... y {{ importedData.length - 100 }} registros más.
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="bg-[#0f172a] border-t border-white/10 p-5 flex justify-end gap-3 shrink-0 z-20">
          <button (click)="close.emit()" class="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 hover:text-white transition-colors text-sm disabled:opacity-50" [disabled]="isLoading || isImporting">
            Cancelar
          </button>
          
          <button *ngIf="step === 'preview' && importedData.length > 0" (click)="importData()" class="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 border border-emerald-500/50 flex items-center gap-2 text-sm active:transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed min-w-[200px] justify-center" [disabled]="isImporting">
            <ng-container *ngIf="!isImporting">
                <span class="material-icons text-lg">check_circle</span>
                Confirmar Importación
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
  `]
})
export class OtImportComponent {
  @Input() importProgress: OTImportProgress | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() dataImported = new EventEmitter<any[]>();
  
  cdr = inject(ChangeDetectorRef);
  fileExport = inject(FileExportService);

  step: 'upload' | 'preview' = 'upload';
  isDragging = false;
  isLoading = false;
  isImporting = false; 
  importedData: any[] = [];
  analysisProgress: OtAnalysisProgress = this.createAnalysisProgress();

  columnMappings: { [key: string]: string[] } = {
    'OT': ['ot', 'orden', 'nro', 'numero', 'op', 'id', 'nro. orden', 'ot numero', 'n°', 'número'],
    'Razon Social': ['cliente', 'client', 'empresa', 'razon social', 'customer', 'nombre cliente', 'r. social', 'razón social'],
    'descripcion': ['descripcion', 'descripción', 'producto', 'trabajo', 'item', 'nombre', 'detalle', 'desc', 'artículo'],
    'CANT PED': ['cantidad', 'cant', 'qty', 'cantidad pedida', 'cant.', 'cant pedida', 'total', 'unidades', 'cant.'],
    'FECHA ENT': ['fecha', 'entrega', 'fecha entrega', 'date', 'delivery', 'f. entrega', 'f.entrega', 'fecha ent'],
    'maquina': ['maquina', 'máquina', 'machine', 'linea', 'equipo', 'maq', 'maquina asignada'],
    'Estado_pedido': ['estado', 'status', 'situacion', 'state', 'est', 'estatus'],
    'FECHA INGRESO PLANTA': ['ingreso', 'fecha ingreso', 'ingreso planta', 'f. ingreso']
  };

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.isLoading) this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (this.isLoading) return;

    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) this.processFile(file);
    event.target.value = ''; 
  }

  async processFile(file: File) {
    console.log('[OtImport] Iniciando carga de:', file.name);
    
    this.isLoading = true;
    this.analysisProgress = this.createAnalysisProgress({
      phase: 'Preparando archivo',
      percentage: 5,
      detail: 'Cargando utilidades de Excel...',
    });
    this.cdr.detectChanges(); 

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      this.updateAnalysisProgress({
        phase: 'Preparando archivo',
        percentage: 10,
        detail: 'Inicializando lector de hojas...',
      });
      await this.fileExport.preloadXlsx();
      const xlsxLib = this.fileExport.getXlsx();
      
      if (!xlsxLib || !xlsxLib.read) {
        throw new Error('La librería Excel no se ha cargado correctamente.');
      }

      this.updateAnalysisProgress({
        phase: 'Leyendo archivo',
        percentage: 18,
        detail: `Leyendo ${file.name}...`,
      });
      const buffer = await file.arrayBuffer();
      this.updateAnalysisProgress({
        phase: 'Leyendo archivo',
        percentage: 28,
        detail: 'Interpretando hojas del archivo...',
      });
      const workbook = await this.fileExport.readWorkbook(buffer);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('El archivo no contiene hojas de cálculo.');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      this.updateAnalysisProgress({
        phase: 'Extrayendo registros',
        percentage: 36,
        detail: `Procesando hoja ${firstSheetName}...`,
      });
      const rawData = await this.fileExport.sheetToJson(worksheet, { defval: '', raw: false });

      if (!rawData || rawData.length === 0) {
        throw new Error('No se encontraron datos en la hoja.');
      }

      this.updateAnalysisProgress({
        phase: 'Normalizando datos',
        percentage: 42,
        totalItems: rawData.length,
        processedItems: 0,
        detail: 'Detectando columnas y limpiando filas...',
      });

      this.importedData = await this.normalizeData(rawData);

      if (this.importedData.length === 0) {
          throw new Error('No se encontraron registros válidos (revise que la columna OT exista).');
      }

      this.updateAnalysisProgress({
        phase: 'Análisis completado',
        percentage: 100,
        totalItems: rawData.length,
        processedItems: rawData.length,
        detail: `${this.importedData.length} registros únicos listos para importar.`,
      });
      await this.yieldToUi();

      console.log(`[OtImport] Parseo y normalización exitosa. ${this.importedData.length} filas.`);
      this.step = 'preview';

    } catch (error: any) {
      console.error('[OtImport] Error:', error);
      alert(`Error de importación:\n${error.message}`);
      this.reset();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async normalizeData(rawData: any[]): Promise<any[]> {
     const mappedData: any[] = [];

     for (let index = 0; index < rawData.length; index += 1) {
        const row = rawData[index];
        const newRow: any = Object.fromEntries(OT_IMPORT_HEADERS.map((header) => [header, '']));

        Object.assign(newRow, row);
        
        const rowKeys = Object.keys(row);

        Object.keys(this.columnMappings).forEach(targetKey => {
            const possibleVariations = this.columnMappings[targetKey];
            const matchingKey = rowKeys.find(key => 
                possibleVariations.includes(key.toLowerCase().trim())
            );

            if (matchingKey) {
                newRow[targetKey] = row[matchingKey];
            }
        });

        // Cleanup String Fields
        if (newRow.OT) newRow.OT = String(newRow.OT).trim().toUpperCase();
        if (newRow['Razon Social']) newRow['Razon Social'] = String(newRow['Razon Social']).trim();
        if (newRow.maquina) newRow.maquina = String(newRow.maquina).trim();

        // Cleanup Numeric Fields
        ['CANT PED', 'total_mtl', 'merma'].forEach(field => {
             if (newRow[field]) {
                 let val = newRow[field];
                 if (typeof val === 'string') {
                     val = val.replace(/[, ]/g, '').trim(); 
                     const parsed = parseFloat(val);
                     newRow[field] = isNaN(parsed) ? 0 : parsed;
                 } else if (typeof val !== 'number') {
                     newRow[field] = 0;
                 }
             } else {
                 newRow[field] = 0;
             }
        });

        if (this.isValidNormalizedRow(newRow)) {
          mappedData.push(newRow);
        }

        if ((index + 1) % ANALYSIS_CHUNK_SIZE === 0 || index === rawData.length - 1) {
          const processedItems = index + 1;
          const normalizationPercentage = 42 + Math.round((processedItems / rawData.length) * 38);

          this.updateAnalysisProgress({
            phase: 'Normalizando datos',
            percentage: normalizationPercentage,
            totalItems: rawData.length,
            processedItems,
            detail: 'Detectando columnas y limpiando filas...',
          });
          await this.yieldToUi();
        }
     }

     const uniqueMap = new Map();

     for (let index = 0; index < mappedData.length; index += 1) {
        const item = mappedData[index];
        uniqueMap.set(item.OT, item);

        if ((index + 1) % ANALYSIS_CHUNK_SIZE === 0 || index === mappedData.length - 1) {
          const processedItems = index + 1;
          const dedupePercentage = 80 + Math.round((processedItems / Math.max(mappedData.length, 1)) * 20);

          this.updateAnalysisProgress({
            phase: 'Eliminando duplicados',
            percentage: dedupePercentage,
            totalItems: mappedData.length,
            processedItems,
            detail: 'Conservando la ultima version de cada OT...',
          });
          await this.yieldToUi();
        }
     }

     return Array.from(uniqueMap.values());
  }

  private isValidNormalizedRow(row: any) {
    if (!row.OT) return false;
    
    const otStr = String(row.OT);
    const invalidOTs = ['OT', 'ORDEN', 'NRO', 'NUMERO', 'ID', 'OP', 'N°', 'TOTAL', 'SUBTOTAL', 'RESUMEN', 'OT DEL MES'];
    
    if (invalidOTs.includes(otStr)) return false;
    
    if (otStr.includes('OT DEL MES') || otStr.startsWith('TOTAL')) return false;
    if (String(row['Razon Social']).toUpperCase().includes('OT DEL MES')) return false;

    return true;
  }

  reset() {
    this.step = 'upload';
    this.importedData = [];
    this.isDragging = false;
    this.isLoading = false;
    this.isImporting = false;
    this.analysisProgress = this.createAnalysisProgress();
  }

  get progressPercentage() {
    return Math.max(0, Math.min(100, Math.round(this.importProgress?.percentage ?? 0)));
  }

  get progressProcessedItems() {
    return Math.max(0, Number(this.importProgress?.processedItems ?? 0));
  }

  get progressTotalItems() {
    return Math.max(this.importedData.length, Number(this.importProgress?.totalItems ?? this.importedData.length));
  }

  get progressTotalBatches() {
    return Math.max(0, Number(this.importProgress?.totalBatches ?? 0));
  }

  get progressCurrentBatchLabel() {
    if (!this.importProgress || this.importProgress.currentBatch <= 0) {
      return '1';
    }

    return String(this.importProgress.currentBatch);
  }

  get progressStatusLabel() {
    if (!this.importProgress || this.importProgress.currentBatch === 0) {
      return 'Preparando lotes...';
    }

    return this.progressPercentage >= 100 ? 'Finalizando recarga...' : 'Aplicando cambios...';
  }

  get analysisPhaseLabel() {
    return this.analysisProgress.phase || 'Analizando archivo';
  }

  get analysisDetailLabel() {
    return this.analysisProgress.detail || 'Normalizando y eliminando duplicados';
  }

  get analysisPercentage() {
    return Math.max(0, Math.min(100, Math.round(this.analysisProgress.percentage || 0)));
  }

  get analysisProcessedItems() {
    return Math.max(0, Number(this.analysisProgress.processedItems || 0));
  }

  get analysisTotalItems() {
    return Math.max(this.analysisProcessedItems, Number(this.analysisProgress.totalItems || 0));
  }

  importData() {
    this.isImporting = true;
    this.cdr.detectChanges(); 
    
    setTimeout(() => {
        this.dataImported.emit(this.importedData);
    }, 100);
  }

  private createAnalysisProgress(overrides: Partial<OtAnalysisProgress> = {}): OtAnalysisProgress {
    return {
      phase: 'Esperando archivo',
      percentage: 0,
      processedItems: 0,
      totalItems: 0,
      detail: 'Normalizando y eliminando duplicados',
      ...overrides,
    };
  }

  private updateAnalysisProgress(progress: Partial<OtAnalysisProgress>) {
    this.analysisProgress = {
      ...this.analysisProgress,
      ...progress,
    };
    this.cdr.detectChanges();
  }

  private async yieldToUi() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.cdr.detectChanges();
  }
}
