
import { Component, Output, EventEmitter, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileExportService } from '../../../services/file-export.service';
import { OT_IMPORT_HEADERS, OTImportProgress } from '../models/orders.models';
import { InventoryImportPreviewComponent } from '../../inventory/components/inventory-import-preview.component';
import { InventoryImportColumn } from '../../inventory/models/inventory-import.models';

const ANALYSIS_CHUNK_SIZE = 200;

interface OtAnalysisProgress {
  phase: string;
  percentage: number;
  processedItems: number;
  totalItems: number;
  detail: string;
}

interface OtImportAnalysisSummary {
  valid: number;
  conflicts: number;
  discarded: number;
}

@Component({
  selector: 'app-ot-import',
  standalone: true,
  imports: [CommonModule, InventoryImportPreviewComponent],
  template: `
    <app-inventory-import-preview
      [show]="true"
      [step]="step"
      [title]="'Carga Masiva de OTs'"
      [subtitle]="'Importe registros de producción desde Excel o CSV'"
      [uploadHint]="'El sistema detectará columnas equivalentes y descartará filas basura o resumen.'"
      [validRows]="importedData"
      [conflictRows]="[]"
      [discardedCount]="analysisSummary.discarded"
      [columns]="previewColumns"
      [isLoading]="isLoading"
      [isImporting]="isImporting"
      [analysisPhase]="analysisPhaseLabel"
      [analysisPercentage]="analysisPercentage"
      [analysisProcessedItems]="analysisProcessedItems"
      [analysisTotalItems]="analysisTotalItems"
      [analysisDetail]="analysisDetailLabel"
      [importingTitle]="'Importando a la base de datos'"
      [confirmButtonLabel]="'Confirmar Importación'"
      [importProgressPercent]="progressPercentage"
      [importProcessedItems]="progressProcessedItems"
      [importTotalItems]="progressTotalItems"
      [importTotalBatches]="progressTotalBatches"
      [importCurrentBatchLabel]="progressCurrentBatchLabel"
      [importStatusLabel]="progressStatusLabel"
      [previewLimit]="100"
      (closeRequested)="close.emit()"
      (fileSelected)="processFile($event)"
      (resetRequested)="reset()"
      (confirmRequested)="importData()">
    </app-inventory-import-preview>
  `,
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
  readonly previewColumns: InventoryImportColumn<any>[] = [
    {
      label: 'OT (ID)',
      value: (row) => row?.OT || '-',
      mono: true,
    },
    {
      label: 'Cliente',
      value: (row) => row?.['Razon Social'] || '-',
    },
    {
      label: 'Producto / Descripción',
      value: (row) => row?.descripcion || '-',
    },
    {
      label: 'Máquina (Importada)',
      value: (row) => row?.maquina || '-',
      mono: true,
    },
    {
      label: 'Cantidad',
      value: (row) => {
        const quantity = Number(row?.['CANT PED'] ?? 0);
        return Number.isFinite(quantity) ? quantity.toLocaleString('en-US') : '0';
      },
      mono: true,
      align: 'right',
    },
    {
      label: 'Estado',
      value: (row) => row?.Estado_pedido || 'PENDIENTE',
      align: 'center',
    },
  ];
  analysisSummary: OtImportAnalysisSummary = this.createAnalysisSummary();
  analysisProgress: OtAnalysisProgress = this.createAnalysisProgress();

  columnMappings: { [key: string]: string[] } = {
    'OT': ['ot', 'orden', 'nro', 'numero', 'op', 'id', 'nro. orden', 'ot numero', 'n°', 'número'],
    'Razon Social': ['cliente', 'client', 'empresa', 'razon social', 'customer', 'nombre cliente', 'r. social', 'razón social'],
    'descripcion': ['descripcion', 'descripción', 'producto', 'trabajo', 'item', 'nombre', 'detalle', 'desc', 'artículo'],
    'MLL Pedido': ['mll pedido', 'mllpedido', 'mll', 'millares pedido', 'millares'],
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

      const normalized = await this.normalizeData(rawData);
      this.importedData = normalized.valid;
      this.analysisSummary = {
        valid: normalized.valid.length,
        conflicts: normalized.conflicts.length,
        discarded: normalized.discarded.length,
      };

      if (this.importedData.length === 0) {
          throw new Error('No se encontraron registros válidos (revise que la columna OT exista).');
      }

      this.updateAnalysisProgress({
        phase: 'Análisis completado',
        percentage: 100,
        totalItems: rawData.length,
        processedItems: rawData.length,
        detail: `${this.analysisSummary.valid} válidos, ${this.analysisSummary.conflicts} conflictos importables y ${this.analysisSummary.discarded} descartados.`,
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

  async normalizeData(rawData: any[]): Promise<{ valid: any[]; conflicts: any[]; discarded: any[] }> {
     const mappedData: any[] = [];
     const discarded: any[] = [];

     for (let index = 0; index < rawData.length; index += 1) {
        const row = rawData[index];
        const newRow: any = Object.fromEntries(OT_IMPORT_HEADERS.map((header) => [header, '']));

        Object.assign(newRow, row);
        
        const rowKeys = Object.keys(row);

        Object.keys(this.columnMappings).forEach(targetKey => {
            const possibleVariations = this.columnMappings[targetKey];
            const matchingKey = rowKeys.find((key) =>
                possibleVariations.includes(this.normalizeHeader(key))
            );

            if (matchingKey) {
                newRow[targetKey] = row[matchingKey];
            }
        });

        // Cleanup String Fields
        if (newRow.OT) newRow.OT = String(newRow.OT).trim().toUpperCase();
        if (newRow['Razon Social']) newRow['Razon Social'] = String(newRow['Razon Social']).trim();
        if (newRow.maquina) newRow.maquina = String(newRow.maquina).trim();
        if (newRow.descripcion) newRow.descripcion = String(newRow.descripcion).trim();

        const hasMllPedidoValue = newRow['MLL Pedido'] !== '' && newRow['MLL Pedido'] !== null && newRow['MLL Pedido'] !== undefined;
        const quantityFromMllPedido = this.parseNumericCell(newRow['MLL Pedido']);
        const quantityFromCantPed = this.parseNumericCell(newRow['CANT PED']);
        newRow['MLL Pedido'] = quantityFromMllPedido;
        newRow['CANT PED'] = hasMllPedidoValue ? quantityFromMllPedido : (quantityFromCantPed || 0);

        // Cleanup Numeric Fields
        ['total_mtl', 'merma'].forEach(field => {
          newRow[field] = this.parseNumericCell(newRow[field]) || 0;
        });

        if (this.isJunkRow(newRow) || this.isSummaryRow(newRow)) {
          discarded.push(newRow);
        } else if (this.isValidNormalizedRow(newRow)) {
          mappedData.push(newRow);
        } else {
          discarded.push(newRow);
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
        const existing = uniqueMap.get(item.OT);
        if (existing) {
          const hasIncomingMllPedido = Number(item['MLL Pedido'] || 0) > 0;
          const hasExistingMllPedido = Number(existing['MLL Pedido'] || 0) > 0;
          const merged = {
            ...existing,
            ...item,
          };

          if (!hasIncomingMllPedido && hasExistingMllPedido) {
            merged['MLL Pedido'] = existing['MLL Pedido'];
            merged['CANT PED'] = existing['MLL Pedido'];
          } else if (hasIncomingMllPedido) {
            merged['CANT PED'] = item['MLL Pedido'];
          }

          uniqueMap.set(item.OT, merged);
        } else {
          uniqueMap.set(item.OT, item);
        }

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

     return {
      valid: Array.from(uniqueMap.values()),
      conflicts: [],
      discarded,
     };
  }

  private isValidNormalizedRow(row: any) {
    if (!row.OT) return false;
    
    const otStr = String(row.OT);
    const invalidOTs = ['OT', 'ORDEN', 'NRO', 'NUMERO', 'ID', 'OP', 'N°', 'TOTAL', 'SUBTOTAL', 'RESUMEN', 'OT DEL MES'];
    
    if (invalidOTs.includes(otStr)) return false;
    
    if (this.isSummaryRow(row)) return false;

    return true;
  }

  private isSummaryRow(row: any) {
    const fieldsToInspect = [row.OT, row['Razon Social'], row.descripcion, row.Material];
    const combined = fieldsToInspect
      .map((value) => String(value || '').toUpperCase())
      .join(' ');

    return combined.includes('OT DEL MES')
      || combined.includes('RESUMEN')
      || combined.includes('SUBTOTAL')
      || combined.includes('TOTAL GENERAL');
  }

  private isJunkRow(row: any) {
    const relevantValues = [row.OT, row['Razon Social'], row.descripcion, row.Material, row['MLL Pedido'], row['CANT PED'], row.maquina];
    return !relevantValues.some((value) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) && value !== 0;
      }

      const text = String(value ?? '').trim().toUpperCase();
      return text && !['-', '--', '---', 'N/A', 'NA', 'NULL'].includes(text);
    });
  }

  reset() {
    this.step = 'upload';
    this.importedData = [];
    this.isDragging = false;
    this.isLoading = false;
    this.isImporting = false;
    this.analysisSummary = this.createAnalysisSummary();
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

  private createAnalysisSummary(): OtImportAnalysisSummary {
    return {
      valid: 0,
      conflicts: 0,
      discarded: 0,
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

  private normalizeHeader(value: string) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private parseNumericCell(value: unknown) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    const text = String(value).trim();
    if (!text) return 0;

    const compact = text.replace(/\s/g, '');
    const commaLooksLikeThousands = compact.includes(',')
      && !compact.includes('.')
      && /^-?\d{1,3}(,\d{3})+$/.test(compact);
    const normalized = compact.includes(',') && compact.includes('.')
      ? compact.lastIndexOf(',') > compact.lastIndexOf('.')
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '')
      : commaLooksLikeThousands
        ? compact.replace(/,/g, '')
        : compact.includes(',')
          ? compact.replace(',', '.')
        : compact;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
