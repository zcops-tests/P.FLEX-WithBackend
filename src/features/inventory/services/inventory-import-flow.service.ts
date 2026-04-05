import { Injectable, inject } from '@angular/core';
import { FileExportService } from '../../../services/file-export.service';
import {
  InventoryImportAnalysisProgress,
  InventoryImportAnalysisResult,
} from '../models/inventory-import.models';

const ANALYSIS_CHUNK_SIZE = 200;

interface InventoryImportAnalyzerOptions<T> {
  entityLabel: string;
  file: File;
  normalize: (rows: any[]) => { valid: T[]; conflicts: T[]; discarded: Array<Record<string, unknown>> };
  onProgress?: (progress: InventoryImportAnalysisProgress) => void;
}

@Injectable({ providedIn: 'root' })
export class InventoryImportFlowService {
  private readonly fileExport = inject(FileExportService);

  async analyzeFile<T>(
    options: InventoryImportAnalyzerOptions<T>,
  ): Promise<InventoryImportAnalysisResult<T>> {
    const { entityLabel, file, normalize, onProgress } = options;

    this.emitProgress(onProgress, {
      phase: 'Preparando archivo',
      percentage: 5,
      processedItems: 0,
      totalItems: 0,
      detail: 'Cargando utilidades de Excel...',
    });

    await this.pause(120);
    await this.fileExport.preloadXlsx();

    this.emitProgress(onProgress, {
      phase: 'Leyendo archivo',
      percentage: 18,
      processedItems: 0,
      totalItems: 0,
      detail: `Leyendo ${file.name}...`,
    });

    const buffer = await file.arrayBuffer();

    this.emitProgress(onProgress, {
      phase: 'Leyendo archivo',
      percentage: 28,
      processedItems: 0,
      totalItems: 0,
      detail: 'Interpretando hojas del archivo...',
    });

    const workbook = await this.fileExport.readWorkbook(buffer);
    if (!workbook.SheetNames?.length) {
      throw new Error('El archivo no contiene hojas de cálculo.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    this.emitProgress(onProgress, {
      phase: 'Extrayendo registros',
      percentage: 36,
      processedItems: 0,
      totalItems: 0,
      detail: `Procesando hoja ${firstSheetName}...`,
    });

    const rawData = await this.fileExport.sheetToJson<any>(worksheet, {
      defval: '',
      raw: false,
    });

    if (!rawData?.length) {
      throw new Error('No se encontraron datos en la hoja.');
    }

    this.emitProgress(onProgress, {
      phase: 'Normalizando datos',
      percentage: 42,
      processedItems: 0,
      totalItems: rawData.length,
      detail: `Detectando columnas y limpiando ${entityLabel}...`,
    });

    for (let index = 0; index < rawData.length; index += ANALYSIS_CHUNK_SIZE) {
      const processedItems = Math.min(index + ANALYSIS_CHUNK_SIZE, rawData.length);
      const percentage = 42 + Math.round((processedItems / rawData.length) * 38);

      this.emitProgress(onProgress, {
        phase: 'Normalizando datos',
        percentage,
        processedItems,
        totalItems: rawData.length,
        detail: `Normalizando ${entityLabel} y preparando la previsualización...`,
      });

      await this.pause();
    }

    const normalized = normalize(rawData);
    const totalPreviewRows = normalized.valid.length + normalized.conflicts.length;

    this.emitProgress(onProgress, {
      phase: 'Análisis completado',
      percentage: 100,
      processedItems: rawData.length,
      totalItems: rawData.length,
      detail: `${totalPreviewRows} registros listos para importar.`,
    });

    await this.pause();

    return {
      ...normalized,
      totalItems: rawData.length,
    };
  }

  private emitProgress(
    callback: ((progress: InventoryImportAnalysisProgress) => void) | undefined,
    progress: InventoryImportAnalysisProgress,
  ) {
    callback?.(progress);
  }

  private async pause(ms = 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
