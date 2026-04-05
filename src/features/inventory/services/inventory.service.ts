import { Injectable, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CliseItem, DieItem, StockItem, RackConfig } from '../models/inventory.models';
import { InventoryImportResult } from '../models/inventory-import.models';
import { ExcelService } from '../../../services/excel.service';
import { AuditService } from '../../../services/audit.service';
import { StateService } from '../../../services/state.service';
import { BackendApiService } from '../../../services/backend-api.service';
import { NotificationService } from '../../../services/notification.service';

const CLISE_IMPORT_BATCH_SIZE = 200;
const STOCK_IMPORT_CONFLICT_MARKER = '[IMPORT_CONFLICT:MISSING_CAJA]';

export type DataLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'stale';

export interface InventoryLoadStatus {
  state: DataLoadState;
  lastSuccessfulSync: string | null;
  errorMessage: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  excelService = inject(ExcelService);
  audit = inject(AuditService);
  state = inject(StateService);
  backend = inject(BackendApiService);
  notifications = inject(NotificationService);

  private _cliseItems = new BehaviorSubject<CliseItem[]>([]);
  private _dieItems = new BehaviorSubject<DieItem[]>([]);
  private _stockItems = new BehaviorSubject<StockItem[]>([]);
  private _layoutData = new BehaviorSubject<RackConfig[]>(this.buildFallbackLayout());
  private _loadStatus = new BehaviorSubject<InventoryLoadStatus>({
    state: 'idle',
    lastSuccessfulSync: null,
    errorMessage: null,
  });

  readonly CLISE_MAPPING = {
    item: ['ITEM', 'ITEM CODE', 'CODIGO', 'CODIGO ITEM', 'COD ITEM', 'CODIGO CLISE', 'CODIGO CLICHE', 'CLISE', 'CLICHE', 'ID', 'CODE'],
    ubicacion: ['UBICACIÓN', 'UBICACION', 'UBIC', 'UBIC.', 'LOCATION', 'POSICION', 'POSICIÓN', 'RACK', 'LOCALIZACION', 'LOCALIZACIÓN'],
    descripcion: ['DESCRIPCIÓN', 'DESCRIPCION', 'DESCRIPCION ITEM', 'DESCRIPCION CLISE', 'DESCRIPCION CLICHE', 'DESCRIPTION', 'DETALLE', 'GLOSA', 'REFERENCIA', 'REF'],
    cliente: ['CLIENTE', 'CLIENTE FINAL', 'CLIENTE / MARCA', 'CLIENT', 'CUSTOMER', 'CUSTOMER NAME', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'MARCA'],
    z: ['Z', 'VALOR Z', 'Z VALUE', 'DIENTE', 'DIENTES'],
    estandar: ['ESTÁNDAR', 'ESTANDAR', 'STANDARD', 'ESTANDAR MM', 'ESTANDAR CLISE'],
    medidas: ['MEDIDAS', 'MEDIDA', 'MEDIDA GENERAL', 'DIMENSION', 'DIMENSIÓN', 'DIMENSIONES'],
    troquel: ['TROQUEL', 'TROQUEL RELACIONADO', 'TROQUEL REF', 'SERIE TROQUEL', 'DIE'],
    ancho: ['ANCHO', 'ANCHO MM', 'WIDTH'],
    avance: ['AVANCE', 'AVANCE MM', 'LARGO', 'LONGITUD', 'LENGTH'],
    col: ['COL', 'COLUMNA', 'COLUMNAS', 'COLS'],
    rep: ['REP', 'REPETICION', 'REPETICIÓN', 'REPETICIONES', 'REPS'],
    n_clises: ['CANTIDAD', 'CANT', 'CANTIDAD CLISES', 'NUMERO CLISES', 'NRO CLISES', 'NRO DE CLISES', 'N CLISES'],
    espesor: ['ESPESOR', 'ESPESOR MM'],
    ingreso: ['INGRESO', 'FECHA INGRESO', 'FECHA DE INGRESO', 'F INGRESO'],
    obs: ['OBS', 'OBSERVACION', 'OBSERVACIÓN', 'OBSERVACIONES', 'COMENTARIO', 'COMENTARIOS', 'NOTAS'],
    maq: ['MAQ', 'MAQUINA', 'MÁQUINA', 'IMPRESORA', 'EQUIPO'],
    colores: ['COLORES', 'COLOR', 'COLORES PROCESO'],
    n_ficha_fler: ['N° FICHA FLER', 'Nº FICHA FLER', 'NRO FICHA FLER', 'NUMERO FICHA FLER', 'FICHA FLER', 'NRO FICHA', 'N° FICHA', 'Nº FICHA'],
    mtl_acum: ['MTL ACUM.', 'MTL ACUM', 'MTL ACUMULADO', 'METROS ACUMULADOS', 'METROS ACUMULADO', 'METRAJE ACUMULADO']
  };

  readonly DIE_MAPPING = {
    medida: ['MEDIDA', 'MEDIDAS', 'DIMENSION', 'DIMENSIÓN', 'DIMENSIONES'],
    ubicacion: ['UBICACIÓN', 'UBICACION', 'UBIC', 'LOCATION', 'LOCALIZACION', 'LOCALIZACIÓN', 'RACK'],
    serie: ['SERIE', 'SERIE TROQUEL', 'CODIGO', 'CODIGO TROQUEL', 'CODIGO DIE', 'CODE', 'ID'],
    ancho_mm: ['ANCHO MM', 'ANCHO', 'WIDTH MM'],
    avance_mm: ['AVANCE MM', 'AVANCE', 'LENGTH MM', 'LARGO MM'],
    ancho_plg: ['ANCHO PLG', 'ANCHO PULG', 'WIDTH IN'],
    avance_plg: ['AVANCE PLG', 'AVANCE PULG', 'LENGTH IN'],
    z: ['Z', 'VALOR Z', 'Z VALUE', 'DIENTES'],
    columnas: ['COLUMNAS', 'COL', 'COLS', 'COLUMNA'],
    repeticiones: ['REPETICIONES', 'REP', 'REPS', 'REPETICION', 'REPETICIÓN'],
    material: ['MATERIAL', 'SUSTRATO'],
    forma: ['FORMA', 'SHAPE'],
    cliente: ['CLIENTE', 'CLIENT', 'CUSTOMER', 'CUSTOMER NAME', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'MARCA'],
    observaciones: ['OBSERVACIONES', 'OBS', 'OBSERVACION', 'OBSERVACIÓN', 'NOTAS', 'COMENTARIOS'],
    ingreso: ['INGRESO', 'FECHA INGRESO', 'FECHA DE INGRESO'],
    pb: ['PB'],
    sep_ava: ['SEP/AVA', 'SEP AVA', 'SEPARACION AVANCE', 'SEPARACIÓN AVANCE'],
    estado: ['ESTADO', 'STATUS'],
    cantidad: ['CANTIDAD', 'CANT'],
    almacen: ['ALMACEN', 'ALMACÉN', 'BODEGA'],
    mtl_acum: ['MTL ACUM.', 'MTL ACUM', 'METROS ACUMULADOS', 'METRAJE ACUMULADO'],
    tipo_troquel: ['TIPO DE TROQUEL', 'TIPO TROQUEL']
  };

  readonly STOCK_MAPPING = {
    medida: ['MEDIDA', 'Medida', 'medida'],
    anchoMm: ['ANCHO MM', 'Ancho MM', 'ancho mm'],
    avanceMm: ['AVANCE MM', 'Avance MM', 'avance mm'],
    material: ['MATERIAL', 'Material', 'material'],
    columnas: ['COLUMNAS', 'Columnas', 'columnas'],
    prepicado: ['PREPICADO', 'Prepicado', 'prepicado'],
    cantidadXRollo: ['CANTIDAD X ROLLO', 'Cantidad X Rollo', 'cantidad x rollo'],
    cantidadMillares: ['CANTIDAD MILLARES', 'Cantidad Millares', 'cantidad millares'],
    etiqueta: ['ETIQUETA', 'Etiqueta', 'etiqueta'],
    forma: ['FORMA', 'Forma', 'forma'],
    tipoProducto: ['TIPO DE PRODUCTO', 'Tipo de Producto', 'tipo de producto'],
    caja: ['CAJA', 'Caja', 'caja'],
    ubicacion: ['UBICACIÓN', 'UBICACION', 'Ubicación', 'Ubicacion', 'ubicación', 'ubicacion']
  };

  constructor() {
    effect(() => {
      if (!this.state.currentUser()) {
        this._cliseItems.next([]);
        this._dieItems.next([]);
        this._stockItems.next([]);
        return;
      }

      untracked(() => {
        void this.reload();
      });
    });
  }

  get cliseItems() { return this._cliseItems.value; }
  get dieItems() { return this._dieItems.value; }
  get stockItems() { return this._stockItems.value; }
  get layoutData() { return this._layoutData.value; }
  get loadStatus() { return this._loadStatus.value; }

  get cliseItems$() { return this._cliseItems.asObservable(); }
  get dieItems$() { return this._dieItems.asObservable(); }
  get stockItems$() { return this._stockItems.asObservable(); }
  get layoutData$() { return this._layoutData.asObservable(); }
  get loadStatus$() { return this._loadStatus.asObservable(); }

  async reload() {
    this._loadStatus.next({
      state: 'loading',
      lastSuccessfulSync: this.loadStatus.lastSuccessfulSync,
      errorMessage: null,
    });

    const toErrorMessage = (error: unknown, fallback: string) => {
      const message = String((error as any)?.message || '').trim();
      return message || fallback;
    };

    const [clisesResult, diesResult, stockResult, racksResult] =
      await Promise.allSettled([
        this.backend.getClisesCatalog(),
        this.backend.getDiesCatalog(),
        this.backend.getStockCatalog(),
        this.backend.getRackConfigs(),
      ]);

    const errors: string[] = [];

    try {
      if (clisesResult.status === 'fulfilled') {
        this._cliseItems.next(clisesResult.value.map((item: any) => this.mapClise(item)));
      } else {
        errors.push(toErrorMessage(clisesResult.reason, 'No fue posible cargar los clisés.'));
      }

      if (diesResult.status === 'fulfilled') {
        this._dieItems.next(diesResult.value.map((item: any) => this.mapDie(item)));
      } else {
        errors.push(toErrorMessage(diesResult.reason, 'No fue posible cargar los troqueles.'));
      }

      if (stockResult.status === 'fulfilled') {
        this._stockItems.next(stockResult.value.map((item: any) => this.mapStock(item)));
      } else {
        errors.push(toErrorMessage(stockResult.reason, 'No fue posible cargar el stock de PT.'));
      }

      if (racksResult.status === 'fulfilled') {
        const racks = racksResult.value;
        this._layoutData.next(Array.isArray(racks) && racks.length ? racks.map((rack: any) => this.mapRack(rack)) : this.buildFallbackLayout());
      } else {
        errors.push(toErrorMessage(racksResult.reason, 'No fue posible cargar el layout del inventario.'));
      }

      this.mapItemsToLayout();

      if (errors.length > 0) {
        const stale = this.loadStatus.lastSuccessfulSync !== null;
        this._loadStatus.next({
          state: stale ? 'stale' : 'error',
          lastSuccessfulSync: this.loadStatus.lastSuccessfulSync,
          errorMessage: errors[0],
        });
        this.notifications.showWarning(
          stale
            ? `${errors[0]} Se mantienen los últimos datos cargados.`
            : errors[0],
        );
        return;
      }

      this._loadStatus.next({
        state: 'loaded',
        lastSuccessfulSync: new Date().toISOString(),
        errorMessage: null,
      });
    } catch (error: any) {
      this.mapItemsToLayout();
      const stale = this.loadStatus.lastSuccessfulSync !== null;
      const message = toErrorMessage(error, 'No fue posible actualizar el inventario.');
      this._loadStatus.next({
        state: stale ? 'stale' : 'error',
        lastSuccessfulSync: this.loadStatus.lastSuccessfulSync,
        errorMessage: message,
      });
      this.notifications.showWarning(
        stale ? `${message} Se mantienen los últimos datos cargados.` : message,
      );
    }
  }

  async addClises(items: CliseItem[]) {
    const created: CliseItem[] = [];
    for (const item of items) {
      created.push(await this.saveClise(item));
    }
    return created;
  }

  async importClises(
    items: CliseItem[],
    onProgress?: (progress: { currentBatch: number; totalBatches: number; processedItems: number; totalItems: number }) => void,
  ) {
    const payloadItems = items.map((item) => this.mapCliseToPayload(item));
    const totalItems = payloadItems.length;

    if (totalItems === 0) {
      return { imported: 0, conflicts: 0, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;
    const totalBatches = Math.max(1, Math.ceil(totalItems / CLISE_IMPORT_BATCH_SIZE));

    for (let index = 0; index < totalBatches; index += 1) {
      const start = index * CLISE_IMPORT_BATCH_SIZE;
      const end = start + CLISE_IMPORT_BATCH_SIZE;
      const batch = payloadItems.slice(start, end);

      let result: any;
      try {
        result = await this.backend.bulkUpsertClises({ items: batch });
      } catch (error) {
        throw error;
      }

      created += Number(result?.created || 0);
      updated += Number(result?.updated || 0);
      onProgress?.({
        currentBatch: index + 1,
        totalBatches,
        processedItems: Math.min(end, totalItems),
        totalItems,
      });
    }

    await this.reload();
    this.mapItemsToLayout();
    this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Importacion Clises', `Se importaron ${totalItems} clises al inventario.`);
    return {
      imported: totalItems,
      conflicts: items.filter((item) => item.hasConflict).length,
      created,
      updated,
    };
  }

  async updateClise(item: CliseItem) {
    return this.saveClise(item);
  }

  async saveClise(item: CliseItem) {
    const existing = this.cliseItems.find((entry) => entry.id === item.id);
    const desiredLinkedDieIds = this.normalizeLinkedDieIds(item.linkedDies);
    const payload = this.mapCliseToPayload({ ...item, linkedDies: desiredLinkedDieIds });

    const persisted = existing
      ? await this.backend.updateClise(existing.id, payload)
      : await this.backend.createClise(payload);

    await this.syncCliseDieLinks(persisted.id, desiredLinkedDieIds);
    const refreshed = this.mapClise(await this.backend.getClise(persisted.id));

    if (existing) {
      this._cliseItems.next(this.cliseItems.map((entry) => entry.id === existing.id ? refreshed : entry));
      this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Editar Clise', `Se modifico el clise ${refreshed.item}.`);
    } else {
      this._cliseItems.next([refreshed, ...this.cliseItems]);
      this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Alta Clise', `Se agrego el clise ${refreshed.item} al inventario.`);
    }

    this.mapItemsToLayout();
    return refreshed;
  }

  async addDies(items: DieItem[]) {
    const created: DieItem[] = [];
    for (const item of items) {
      created.push(this.mapDie(await this.backend.createDie(this.mapDieToPayload(item))));
    }
    this._dieItems.next([...created, ...this.dieItems]);
    this.mapItemsToLayout();
    this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Alta Troqueles', `Se agregaron ${items.length} troqueles.`);
    return created;
  }

  async importDies(
    items: DieItem[],
    onProgress?: (progress: { currentBatch: number; totalBatches: number; processedItems: number; totalItems: number }) => void,
  ) {
    const chunkSize = 200;
    const payloadItems = items.map((item) => this.mapDieToPayload(item));
    const totalItems = payloadItems.length;

    if (totalItems === 0) {
      return { imported: 0, conflicts: 0, created: 0, updated: 0 };
    }

    const totalBatches = Math.max(1, Math.ceil(totalItems / chunkSize));
    let created = 0;
    let updated = 0;

    for (let index = 0; index < totalBatches; index += 1) {
      const start = index * chunkSize;
      const end = start + chunkSize;
      const batch = payloadItems.slice(start, end);

      const result = await this.backend.bulkUpsertDies({ items: batch });
      created += Number(result?.created || 0);
      updated += Number(result?.updated || 0);
      onProgress?.({
        currentBatch: index + 1,
        totalBatches,
        processedItems: Math.min(end, totalItems),
        totalItems,
      });
    }

    await this.reload();
    this.mapItemsToLayout();
    this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Importacion Troqueles', `Se importaron ${totalItems} troqueles.`);
    return {
      imported: totalItems,
      conflicts: items.filter((item) => item.hasConflict).length,
      created,
      updated,
    };
  }

  async updateDie(item: DieItem) {
    const persisted = this.mapDie(await this.backend.updateDie(item.id, this.mapDieToPayload(item)));
    this._dieItems.next(this.dieItems.map(entry => entry.id === item.id ? persisted : entry));
    this.mapItemsToLayout();
    this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Editar Troquel', `Se modifico el troquel ${persisted.serie}.`);
    return persisted;
  }

  async addStock(item: StockItem) {
    const created = this.mapStock(await this.backend.createStockItem(this.mapStockToPayload(item)));
    this._stockItems.next([created, ...this.stockItems]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Ingreso PT', `Entrada de producto terminado: caja ${created.caja}, etiqueta ${created.etiqueta}.`);
    return created;
  }

  async addStocks(items: StockItem[]) {
    return this.importStocks(items);
  }

  async importStocks(
    items: StockItem[],
    onProgress?: (progress: { currentBatch: number; totalBatches: number; processedItems: number; totalItems: number }) => void,
  ): Promise<InventoryImportResult> {
    const payloadItems = items.map((item) => this.mapStockToPayload(item));
    const totalItems = payloadItems.length;

    if (totalItems === 0) {
      return { imported: 0, conflicts: 0, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;
    const totalBatches = Math.max(1, Math.ceil(totalItems / CLISE_IMPORT_BATCH_SIZE));

    for (let index = 0; index < totalBatches; index += 1) {
      const start = index * CLISE_IMPORT_BATCH_SIZE;
      const end = start + CLISE_IMPORT_BATCH_SIZE;
      const batch = payloadItems.slice(start, end);
      const result = await this.backend.bulkUpsertStockItems({ items: batch });
      created += Number(result?.created || 0);
      updated += Number(result?.updated || 0);
      onProgress?.({
        currentBatch: index + 1,
        totalBatches,
        processedItems: Math.min(end, totalItems),
        totalItems,
      });
    }

    await this.reload();
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Importacion Masiva', `Se importaron ${totalItems} items de producto terminado.`);
    return {
      imported: totalItems,
      conflicts: items.filter((item) => item.hasConflict).length,
      created,
      updated,
    };
  }

  async updateStock(item: StockItem) {
    const persisted = this.mapStock(
      await this.backend.updateStockItem(item.id, this.mapStockToPayload(item)),
    );
    this._stockItems.next(this.stockItems.map(entry => entry.id === item.id ? persisted : entry));
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Ajuste PT', `Ajuste en caja ${persisted.caja} - ${persisted.status}`);
    return persisted;
  }

  mapItemsToLayout() {
    const currentLayout = this.layoutData.map(rack => ({
      ...rack,
      levels: rack.levels.map(level => ({
        ...level,
        boxes: level.boxes.map(box => ({ ...box, items: [] })),
      })),
    }));

    this.cliseItems.forEach(item => this.placeInventoryItem(currentLayout, 'clise', item.ubicacion, item));
    this.dieItems.forEach(item => this.placeInventoryItem(currentLayout, 'die', item.ubicacion, item));

    this._layoutData.next(currentLayout);
  }

  normalizeCliseData(rawData: any[]): { valid: CliseItem[], conflicts: CliseItem[], discarded: Array<Record<string, unknown>> } {
    const normalized = this.excelService.normalizeData(rawData, this.CLISE_MAPPING);
    const discarded = normalized.filter((row) => this.isImportRowJunk(row, ['item', 'cliente', 'descripcion', 'troquel', 'ancho', 'avance']));
    const mapped: CliseItem[] = normalized
      .filter((row) => !this.isImportRowJunk(row, ['item', 'cliente', 'descripcion', 'troquel', 'ancho', 'avance']))
      .map((row, index) => {
      const item = this.buildImportedClise(row, index);
      const conflictReasons = this.buildCliseConflictReasons(item);
      return {
        ...item,
        hasConflict: conflictReasons.length > 0,
        conflictReasons,
      };
    });

    const valid = mapped.filter((item) => !item.hasConflict);
    const conflicts = mapped.filter((item) => item.hasConflict);
    return { valid, conflicts, discarded };
  }

  normalizeDieData(rawData: any[]): { valid: DieItem[], conflicts: DieItem[], discarded: Array<Record<string, unknown>> } {
    const normalized = this.excelService.normalizeData(rawData, this.DIE_MAPPING);
    const discarded = normalized.filter((row) => this.isImportRowJunk(row, ['serie', 'cliente', 'medida', 'material', 'forma', 'ancho_mm', 'avance_mm']));
    const mapped: DieItem[] = normalized
      .filter((row) => !this.isImportRowJunk(row, ['serie', 'cliente', 'medida', 'material', 'forma', 'ancho_mm', 'avance_mm']))
      .map(row => {
        const item: DieItem = {
          id: Math.random().toString(36).slice(2, 11),
          serie: this.excelService.toDisplayString(row.serie),
          cliente: this.excelService.toDisplayString(row.cliente),
          medida: this.excelService.toDisplayString(row.medida),
          ubicacion: this.excelService.toDisplayString(row.ubicacion),
          z: this.excelService.toDisplayString(row.z),
          ancho_mm: this.excelService.parseNumber(row.ancho_mm),
          avance_mm: this.excelService.parseNumber(row.avance_mm),
          ancho_plg: this.excelService.parseNumber(row.ancho_plg),
          avance_plg: this.excelService.parseNumber(row.avance_plg),
          columnas: this.excelService.parseNumber(row.columnas),
          repeticiones: this.excelService.parseNumber(row.repeticiones),
          material: this.excelService.toDisplayString(row.material),
          forma: this.excelService.toDisplayString(row.forma),
          estado: this.excelService.toDisplayString(row.estado) || 'OK',
          ingreso: this.normalizeExcelDate(row.ingreso),
          pb: this.excelService.toDisplayString(row.pb),
          sep_ava: this.excelService.toDisplayString(row.sep_ava),
          cantidad: this.excelService.parseNumber(row.cantidad),
          almacen: this.excelService.toDisplayString(row.almacen),
          mtl_acum: this.excelService.parseNumber(row.mtl_acum),
          tipo_troquel: this.excelService.toDisplayString(row.tipo_troquel),
          observaciones: this.excelService.toDisplayString(row.observaciones),
          sourceRow: row.__sourceRow || undefined,
          history: [],
          linkedClises: [],
          hasConflict: false,
          conflictReasons: [],
        };

        const conflictReasons = this.buildDieConflictReasons(item);
        item.hasConflict = conflictReasons.length > 0;
        item.conflictReasons = conflictReasons;
        return item;
      });

    const valid = mapped.filter(item => !item.hasConflict);
    const conflicts = mapped.filter(item => item.hasConflict);
    return { valid, conflicts, discarded };
  }

  normalizeStockData(rawData: any[]): { valid: StockItem[], conflicts: StockItem[], discarded: Array<Record<string, unknown>> } {
    const normalized = this.excelService.normalizeData(rawData, this.STOCK_MAPPING);
    const discarded = normalized.filter((row) => this.isImportRowJunk(row, ['medida', 'anchoMm', 'avanceMm', 'material', 'columnas', 'prepicado', 'cantidadXRollo', 'cantidadMillares', 'etiqueta', 'forma', 'tipoProducto', 'caja', 'ubicacion']));
    const mapped: StockItem[] = normalized
      .filter((row) => !this.isImportRowJunk(row, ['medida', 'anchoMm', 'avanceMm', 'material', 'columnas', 'prepicado', 'cantidadXRollo', 'cantidadMillares', 'etiqueta', 'forma', 'tipoProducto', 'caja', 'ubicacion']))
      .map((row, index) => {
        const caja = this.excelService.toDisplayString(row.caja);
        const hasConflict = !String(caja || '').trim();
        return {
          id: `stock-import-${index + 1}`,
          medida: this.excelService.toDisplayString(row.medida),
          anchoMm: this.excelService.parseNumber(row.anchoMm),
          avanceMm: this.excelService.parseNumber(row.avanceMm),
          material: this.excelService.toDisplayString(row.material),
          columnas: this.excelService.parseNumber(row.columnas),
          prepicado: this.excelService.toDisplayString(row.prepicado),
          cantidadXRollo: this.excelService.parseNumber(row.cantidadXRollo),
          cantidadMillares: this.excelService.parseNumber(row.cantidadMillares),
          etiqueta: this.excelService.toDisplayString(row.etiqueta),
          forma: this.excelService.toDisplayString(row.forma),
          tipoProducto: this.excelService.toDisplayString(row.tipoProducto),
          caja,
          ubicacion: this.excelService.toDisplayString(row.ubicacion) || 'RECEPCION',
          status: 'Cuarentena',
          entryDate: new Date().toISOString(),
          notes: '',
          boxId: undefined,
          hasConflict,
          conflictReasons: hasConflict ? ['MISSING_CAJA'] : [],
        };
      });

    const valid = mapped.filter(item => !item.hasConflict);
    const conflicts = mapped.filter(item => item.hasConflict);
    return { valid, conflicts, discarded };
  }

  private buildImportedClise(row: Record<string, unknown>, rowIndex: number): CliseItem {
    const medidas = this.parseMeasures(row.medidas);
    const ancho = this.excelService.parseNumber(row.ancho) ?? medidas.ancho;
    const avance = this.excelService.parseNumber(row.avance) ?? medidas.avance;
    const colores = this.excelService.toDisplayString(row.colores);
    const itemCode = this.limitText(this.excelService.toDisplayString(row.item), 100);

    return {
      id: `clise-import-${rowIndex + 1}`,
      item: itemCode,
      backendItemCode: itemCode || undefined,
      ubicacion: this.limitText(this.excelService.toDisplayString(row.ubicacion), 100),
      descripcion: this.toOptionalText(this.excelService.toDisplayString(row.descripcion)) || '',
      cliente: this.limitText(this.excelService.toDisplayString(row.cliente), 150),
      z: this.limitText(this.excelService.toDisplayString(row.z), 50),
      estandar: this.limitText(this.excelService.toDisplayString(row.estandar), 100),
      medidas: this.limitText(this.excelService.toDisplayString(row.medidas) || this.formatMeasures(ancho, avance), 100),
      troquel: this.limitText(this.excelService.toDisplayString(row.troquel), 100),
      linkedDies: [],
      ancho,
      avance,
      col: this.excelService.parseNumber(row.col),
      rep: this.excelService.parseNumber(row.rep),
      n_clises: this.excelService.parseNumber(row.n_clises),
      espesor: this.limitText(this.excelService.toDisplayString(row.espesor), 32),
      ingreso: this.normalizeExcelDate(row.ingreso),
      obs: this.toOptionalText(this.excelService.toDisplayString(row.obs)) || '',
      maq: this.limitText(this.excelService.toDisplayString(row.maq), 100),
      colores: this.limitText(colores, 500),
      colorUsage: this.parseColors(colores),
      n_ficha_fler: this.limitText(this.excelService.toDisplayString(row.n_ficha_fler), 100),
      mtl_acum: this.excelService.parseNumber(row.mtl_acum),
      history: [],
      hasConflict: false,
    };
  }

  private async syncCliseDieLinks(cliseId: string, desiredDieIds: string[]) {
    const normalizedDesired = this.normalizeLinkedDieIds(desiredDieIds);
    const currentLinks = await this.backend.getCliseDies(cliseId);
    const currentDieIds = (currentLinks || [])
      .map((link: any) => String(link.die_id || link.die?.id || '').trim())
      .filter(Boolean);

    const currentSet = new Set(currentDieIds);
    const desiredSet = new Set(normalizedDesired);

    const toLink = normalizedDesired.filter((dieId) => !currentSet.has(dieId));
    const toUnlink = currentDieIds.filter((dieId) => !desiredSet.has(dieId));

    await Promise.all([
      ...toLink.map((dieId) => this.backend.linkCliseDie({ clise_id: cliseId, die_id: dieId })),
      ...toUnlink.map((dieId) => this.backend.unlinkCliseDie(cliseId, dieId)),
    ]);
  }

  private normalizeLinkedDieIds(value: unknown) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean)));
  }

  private parseColorNames(value: string) {
    return value
      .split(/[;,/]+/)
      .flatMap((entry) => entry.split(','))
      .map((entry) => this.limitText(entry, 100))
      .filter(Boolean);
  }

  private limitText(value: unknown, maxLength: number) {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  private toOptionalText(value: unknown) {
    const text = String(value ?? '').trim();
    return text || undefined;
  }

  private placeInventoryItem(layout: RackConfig[], type: 'clise' | 'die', location: string, item: any) {
    if (!location) return;
    const locationNumber = parseInt(location.replace(/\D/g, ''), 10);
    if (Number.isNaN(locationNumber)) return;

    for (const rack of layout) {
      if (rack.type !== type) continue;
      for (const level of rack.levels) {
        for (const box of level.boxes) {
          if (box.min !== undefined && box.max !== undefined && locationNumber >= box.min && locationNumber <= box.max) {
            box.items.push(item);
            return;
          }
        }
      }
    }
  }

  private mapClise(item: any): CliseItem {
    const visibleItemCode = String(item.item ?? item.raw_payload?.display_item_code ?? item.item_code ?? '').trim();
    const linkedDieIds = Array.isArray(item.die_links)
      ? item.die_links
        .map((link: any) => String(link.die_id || link.die?.id || '').trim())
        .filter(Boolean)
      : Array.isArray(item.linkedDies)
        ? item.linkedDies.map((entry: any) => String(entry || '').trim()).filter(Boolean)
        : [];

    return {
      id: item.id,
      item: visibleItemCode,
      backendItemCode: String(item.backend_item_code || item.item_code || visibleItemCode || '').trim() || undefined,
      ubicacion: item.ubicacion || '',
      descripcion: item.descripcion || '',
      cliente: item.cliente || '',
      z: item.z || item.z_value || '',
      estandar: item.estandar || '',
      medidas: item.medidas || this.formatMeasures(this.toNullableNumber(item.ancho ?? item.ancho_mm), this.toNullableNumber(item.avance ?? item.avance_mm)),
      troquel: item.troquel || '',
      linkedDies: linkedDieIds,
      ancho: this.toNullableNumber(item.ancho ?? item.ancho_mm),
      avance: this.toNullableNumber(item.avance ?? item.avance_mm),
      col: item.columnas ?? null,
      rep: item.repeticiones ?? null,
      n_clises: item.numero_clises ?? null,
      espesor: item.espesor || (this.toNullableNumber(item.espesor_mm) ?? '').toString(),
      ingreso: item.fecha_ingreso ? new Date(item.fecha_ingreso).toISOString().split('T')[0] : '',
      obs: item.observaciones || '',
      maq: item.maquina_texto || '',
      colores: item.colores || '',
      colorUsage: (item.colorUsage || item.color_usage || []).map((entry: any) => ({ name: entry.name || entry.color_name, meters: Number(entry.meters || 0) })),
      n_ficha_fler: item.n_ficha_fler || item.ficha_fler || '',
      mtl_acum: this.toNullableNumber(item.mtl_acum ?? item.metros_acumulados) ?? 0,
      history: Array.isArray(item.history) ? item.history : [],
      sourceRow: undefined,
      hasConflict: Boolean(item.hasConflict ?? item.has_conflict ?? item.raw_payload?.import_conflict),
      conflictReasons: Array.isArray(item.conflictReasons ?? item.conflict_reasons ?? item.raw_payload?.conflict_reasons)
        ? [...(item.conflictReasons ?? item.conflict_reasons ?? item.raw_payload?.conflict_reasons)]
        : [],
    };
  }

  private mapDie(item: any): DieItem {
    const visibleSerie = String(item.serie ?? item.raw_payload?.display_serie ?? '').trim();
    return {
      id: item.id,
      medida: item.medida || '',
      ubicacion: item.ubicacion || '',
      serie: visibleSerie,
      backendSerie: String(item.backend_serie || item.serie || visibleSerie || '').trim() || undefined,
      linkedClises: [],
      ancho_mm: this.toNullableNumber(item.ancho_mm),
      avance_mm: this.toNullableNumber(item.avance_mm),
      ancho_plg: this.toNullableNumber(item.ancho_plg),
      avance_plg: this.toNullableNumber(item.avance_plg),
      z: item.z || item.z_value || '',
      columnas: item.columnas ?? null,
      repeticiones: item.repeticiones ?? null,
      material: item.material || '',
      forma: item.forma || '',
      cliente: item.cliente || '',
      observaciones: item.observaciones || '',
      ingreso: item.ingreso || (item.fecha_ingreso ? new Date(item.fecha_ingreso).toISOString().split('T')[0] : ''),
      pb: item.pb || '',
      sep_ava: item.sep_ava || item.separacion_avance || '',
      estado: item.estado || 'OK',
      cantidad: item.cantidad ?? null,
      almacen: item.almacen || '',
      mtl_acum: this.toNullableNumber(item.mtl_acum ?? item.metros_acumulados) ?? 0,
      tipo_troquel: item.tipo_troquel || '',
      sourceRow: item.raw_payload?.source_row || undefined,
      history: [],
      hasConflict: Boolean(item.hasConflict ?? item.has_conflict ?? item.raw_payload?.import_conflict),
      conflictReasons: Array.isArray(item.conflictReasons ?? item.conflict_reasons ?? item.raw_payload?.conflict_reasons)
        ? [...(item.conflictReasons ?? item.conflict_reasons ?? item.raw_payload?.conflict_reasons)]
        : [],
    };
  }

  private mapStock(item: any): StockItem {
    return {
      id: item.id,
      medida: item.medida || '',
      anchoMm: this.toNullableNumber(item.anchoMm ?? item.ancho_mm),
      avanceMm: this.toNullableNumber(item.avanceMm ?? item.avance_mm),
      material: item.material || '',
      columnas: item.columnas ?? null,
      prepicado: item.prepicado || '',
      cantidadXRollo: this.toNullableNumber(item.cantidadXRollo ?? item.cantidad_x_rollo),
      cantidadMillares: this.toNullableNumber(item.cantidadMillares ?? item.cantidad_millares),
      etiqueta: item.etiqueta || '',
      forma: item.forma || '',
      tipoProducto: item.tipoProducto || item.tipo_producto || '',
      caja: item.caja || '',
      ubicacion: item.ubicacion || item.location || '',
      status: this.normalizeStockStatus(item.status),
      entryDate: item.entryDate || item.entry_date || new Date().toISOString(),
      notes: item.notes || '',
      boxId: item.box_id || '',
      hasConflict: Boolean(item.hasConflict ?? item.has_conflict),
      conflictReasons: Array.isArray(item.conflictReasons ?? item.conflict_reasons)
        ? [...(item.conflictReasons ?? item.conflict_reasons)]
        : [],
    };
  }

  private mapRack(rack: any): RackConfig {
    return {
      id: rack.id,
      name: rack.name,
      type: String(rack.rack_type || '').toUpperCase().includes('DIE') ? 'die' : 'clise',
      orientation: String(rack.orientation || '').toUpperCase().includes('H') ? 'horizontal' : 'vertical',
      levels: (rack.levels_json || []).map((level: any) => ({
        levelNumber: level.levelNumber,
        boxes: (level.boxes || []).map((box: any) => ({
          label: box.label,
          min: box.min,
          max: box.max,
          items: [],
        })),
      })),
    };
  }

  private mapCliseToPayload(item: CliseItem) {
    const itemCode = this.limitText(item.item, 100);
    const cliente = this.limitText(item.cliente, 150);
    const colorNames = item.colorUsage?.length
      ? item.colorUsage.map((entry) => this.limitText(entry.name, 100)).filter(Boolean)
      : this.parseColorNames(item.colores);

    return {
      item_code: itemCode || item.backendItemCode || undefined,
      ubicacion: this.limitText(item.ubicacion, 100) || undefined,
      descripcion: this.toOptionalText(item.descripcion),
      cliente: cliente || undefined,
      z_value: this.limitText(item.z, 50) || undefined,
      estandar: this.limitText(item.estandar, 100) || undefined,
      ancho_mm: item.ancho ?? undefined,
      avance_mm: item.avance ?? undefined,
      columnas: item.col ?? undefined,
      repeticiones: item.rep ?? undefined,
      espesor_mm: this.excelService.parseNumber(item.espesor) ?? undefined,
      numero_clises: item.n_clises ?? undefined,
      fecha_ingreso: item.ingreso || undefined,
      observaciones: this.toOptionalText(item.obs),
      maquina_texto: this.limitText(item.maq, 100) || undefined,
      ficha_fler: this.limitText(item.n_ficha_fler, 100) || undefined,
      metros_acumulados: item.mtl_acum ?? 0,
      colores_json: colorNames.length ? colorNames : undefined,
      raw_payload: {
        display_item_code: itemCode,
        import_conflict: this.hasCliseConflict(item),
        conflict_reasons: this.buildCliseConflictReasons(item),
        medidas: this.limitText(item.medidas, 100) || undefined,
        troquel: this.limitText(item.troquel, 100) || undefined,
        colores: this.limitText(item.colores, 500) || undefined,
      },
    };
  }

  private mapDieToPayload(item: DieItem) {
    const serie = String(item.serie || '').trim();
    const cliente = String(item.cliente || '').trim();
    return {
      serie: serie || item.backendSerie || undefined,
      medida: item.medida || undefined,
      ubicacion: item.ubicacion || undefined,
      ancho_mm: item.ancho_mm ?? undefined,
      avance_mm: item.avance_mm ?? undefined,
      ancho_plg: item.ancho_plg ?? undefined,
      avance_plg: item.avance_plg ?? undefined,
      z_value: item.z || undefined,
      columnas: item.columnas ?? undefined,
      repeticiones: item.repeticiones ?? undefined,
      material: item.material || undefined,
      forma: item.forma || undefined,
      cliente: cliente || undefined,
      observaciones: item.observaciones || undefined,
      fecha_ingreso: item.ingreso || undefined,
      pb: item.pb || undefined,
      separacion_avance: item.sep_ava || undefined,
      estado: item.estado || undefined,
      cantidad: item.cantidad ?? undefined,
      almacen: item.almacen || undefined,
      metros_acumulados: item.mtl_acum ?? 0,
      tipo_troquel: item.tipo_troquel || undefined,
      raw_payload: {
        display_serie: serie,
        import_conflict: this.hasDieConflict(item),
        conflict_reasons: this.buildDieConflictReasons(item),
        source_row: item.sourceRow || undefined,
        source_columns: item.sourceRow ? Object.keys(item.sourceRow) : undefined,
      },
    };
  }

  private mapStockToPayload(item: StockItem) {
    const normalizedCaja = String(item.caja || '').trim();
    return {
      medida: item.medida || undefined,
      ancho_mm: item.anchoMm ?? undefined,
      avance_mm: item.avanceMm ?? undefined,
      material: item.material || undefined,
      columnas: item.columnas ?? undefined,
      prepicado: item.prepicado || undefined,
      cantidad_x_rollo: item.cantidadXRollo ?? undefined,
      cantidad_millares: item.cantidadMillares ?? undefined,
      etiqueta: item.etiqueta || undefined,
      forma: item.forma || undefined,
      tipo_producto: item.tipoProducto || undefined,
      caja: normalizedCaja || undefined,
      ubicacion: item.ubicacion || undefined,
      status: this.mapStockStatusToApi(item.status),
      entry_date: item.entryDate || new Date().toISOString(),
      notes: this.buildStockNotes(item.notes, !normalizedCaja),
    };
  }

  private buildStockNotes(notes: string | undefined, hasMissingCajaConflict: boolean) {
    const cleanedNotes = String(notes || '').replace(/\[IMPORT_CONFLICT:[^\]]+\]\s*/g, '').trim();
    if (!hasMissingCajaConflict) {
      return cleanedNotes || undefined;
    }

    return `${STOCK_IMPORT_CONFLICT_MARKER}${cleanedNotes ? ` ${cleanedNotes}` : ''}`;
  }

  private normalizeStockStatus(val: string): any {
    const v = String(val || '').toLowerCase();
    if (v.includes('liberado') || v.includes('liberated') || v.includes('ok') || v.includes('aprobado')) return 'Liberado';
    if (v.includes('retenido') || v.includes('retained') || v.includes('hold') || v.includes('rechazado')) return 'Retenido';
    if (v.includes('despachado') || v.includes('dispatched') || v.includes('enviado') || v.includes('salida')) return 'Despachado';
    return 'Cuarentena';
  }

  private mapStockStatusToApi(status: string) {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('lib')) return 'LIBERATED';
    if (normalized.includes('ret')) return 'RETAINED';
    if (normalized.includes('desp')) return 'DISPATCHED';
    return 'QUARANTINE';
  }

  private isImportRowJunk(row: Record<string, unknown>, relevantKeys: string[]) {
    const placeholderTokens = new Set(['', '-', '--', '---', 'X', 'N/A', 'NA', 'NULL', 'SIN DATO']);

    return !relevantKeys.some((key) => {
      const value = row[key];
      if (typeof value === 'number') {
        return Number.isFinite(value) && value !== 0;
      }

      const text = String(value ?? '').trim().toUpperCase();
      return text && !placeholderTokens.has(text);
    });
  }

  private buildFallbackLayout(): RackConfig[] {
    return [
      {
        id: 'clise-default',
        name: 'Rack Clises',
        type: 'clise',
        orientation: 'vertical',
        levels: [
          { levelNumber: 1, boxes: [{ label: '1-9999', min: 1, max: 9999, items: [] }] },
        ],
      },
      {
        id: 'die-default',
        name: 'Rack Troqueles',
        type: 'die',
        orientation: 'vertical',
        levels: [
          { levelNumber: 1, boxes: [{ label: '1-9999', min: 1, max: 9999, items: [] }] },
        ],
      },
    ];
  }

  private normalizeExcelDate(value: unknown): string {
    const normalizedValue = this.excelService.toDisplayString(value);
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const serialDate = new Date(excelEpoch + value * 86400000);
      return Number.isNaN(serialDate.getTime())
        ? ''
        : serialDate.toISOString().slice(0, 10);
    }

    const text = normalizedValue.trim();
    if (!text) {
      return '';
    }

    if (/^\d+(?:[.,]\d+)?$/.test(text)) {
      const serialValue = Number(text.replace(',', '.'));
      if (Number.isFinite(serialValue)) {
        const excelEpoch = Date.UTC(1899, 11, 30);
        const serialDate = new Date(excelEpoch + serialValue * 86400000);
        if (!Number.isNaN(serialDate.getTime())) {
          return serialDate.toISOString().slice(0, 10);
        }
      }
    }

    const isoCandidate = new Date(text);
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString().slice(0, 10);
    }

    const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
    if (match) {
      const [, dd, mm, yy] = match;
      const fullYear = yy.length === 2 ? `20${yy}` : yy;
      const normalizedDate = new Date(`${fullYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
      if (!Number.isNaN(normalizedDate.getTime())) {
        return normalizedDate.toISOString().slice(0, 10);
      }
    }

    const monthFirstMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
    if (monthFirstMatch) {
      const [, mm, dd, yy] = monthFirstMatch;
      const fullYear = yy.length === 2 ? `20${yy}` : yy;
      const normalizedDate = new Date(`${fullYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
      if (!Number.isNaN(normalizedDate.getTime())) {
        return normalizedDate.toISOString().slice(0, 10);
      }
    }

    return '';
  }

  private parseMeasures(value: unknown): { ancho: number | null; avance: number | null } {
    const text = this.excelService.toDisplayString(value);
    if (!text) {
      return { ancho: null, avance: null };
    }

    const parts = text.match(/-?\d+(?:[.,]\d+)?/g) || [];
    const ancho = parts[0] ? Number(parts[0].replace(',', '.')) : null;
    const avance = parts[1] ? Number(parts[1].replace(',', '.')) : null;

    return {
      ancho: Number.isFinite(ancho as number) ? ancho : null,
      avance: Number.isFinite(avance as number) ? avance : null,
    };
  }

  private formatMeasures(ancho: number | null, avance: number | null) {
    if (ancho === null && avance === null) return '';
    return [ancho, avance].filter((value) => value !== null && value !== undefined).join(' x ');
  }

  private parseColors(value: string) {
    return this.parseColorNames(value).map((name) => ({ name, meters: 0 }));
  }

  private hasCliseConflict(item: CliseItem) {
    return this.buildCliseConflictReasons(item).length > 0;
  }

  private hasDieConflict(item: DieItem) {
    return this.buildDieConflictReasons(item).length > 0;
  }

  private buildCliseConflictReasons(item: CliseItem) {
    const reasons: string[] = [];
    if (!String(item.item || '').trim()) reasons.push('ITEM_REQUIRED');
    if (!String(item.cliente || '').trim()) reasons.push('CLIENT_REQUIRED');
    return reasons;
  }

  private buildDieConflictReasons(item: DieItem) {
    const reasons: string[] = [];
    if (!String(item.serie || '').trim()) reasons.push('SERIE_REQUIRED');
    if (!String(item.cliente || '').trim()) reasons.push('CLIENT_REQUIRED');
    return reasons;
  }

  private toNullableNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

}
