export interface InventoryImportColumn<T = any> {
  label: string;
  value: (row: T) => unknown;
  emptyValue?: string;
  mono?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface InventoryImportResult {
  imported: number;
  conflicts: number;
  created: number;
  updated: number;
}

export interface InventoryImportAnalysisProgress {
  phase: string;
  percentage: number;
  processedItems: number;
  totalItems: number;
  detail: string;
}

export interface InventoryImportAnalysisResult<T = any> {
  valid: T[];
  conflicts: T[];
  discarded: Array<Record<string, unknown>>;
  totalItems: number;
}

export interface InventoryImportState<T = any> {
  showImportPreviewModal: boolean;
  previewData: T[];
  conflictsData: T[];
  isImporting: boolean;
  importProgressPercent: number;
  importProgressText: string;
}

export interface InventoryImportAdapter<T = any> {
  entity: string;
  title: string;
  columns: InventoryImportColumn<T>[];
  previewLimit?: number;
  successMessage: (result: InventoryImportResult) => string;
}
