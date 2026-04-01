import { Injectable, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CliseItem, DieItem, StockItem, RackConfig } from '../models/inventory.models';
import { ExcelService } from '../../../services/excel.service';
import { AuditService } from '../../../services/audit.service';
import { StateService } from '../../../services/state.service';
import { BackendApiService } from '../../../services/backend-api.service';

const CLISE_IMPORT_BATCH_SIZE = 200;

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  excelService = inject(ExcelService);
  audit = inject(AuditService);
  state = inject(StateService);
  backend = inject(BackendApiService);

  private _cliseItems = new BehaviorSubject<CliseItem[]>([]);
  private _dieItems = new BehaviorSubject<DieItem[]>([]);
  private _stockItems = new BehaviorSubject<StockItem[]>([]);
  private _layoutData = new BehaviorSubject<RackConfig[]>(this.buildFallbackLayout());

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
    ot: ['ot', 'orden', 'op', 'nro'],
    client: ['cliente', 'razon social', 'customer'],
    product: ['producto', 'descripcion', 'item'],
    rolls: ['rollos', 'cantidad'],
    millares: ['millares', 'mll'],
    location: ['ubicacion', 'loc'],
    status: ['estado', 'status'],
    palletId: ['pallet', 'lote', 'pallet id', 'id'],
    notes: ['notas', 'observaciones', 'obs']
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

  get cliseItems$() { return this._cliseItems.asObservable(); }
  get dieItems$() { return this._dieItems.asObservable(); }
  get stockItems$() { return this._stockItems.asObservable(); }
  get layoutData$() { return this._layoutData.asObservable(); }

  private async fetchAllPages<T>(fetchPage: (query: { page: number; pageSize: number }) => Promise<{ items?: T[]; meta?: { totalPages?: number } }>) {
    const pageSize = 500;
    const firstPage = await fetchPage({ page: 1, pageSize });
    const items = [...(firstPage.items || [])];
    const totalPages = Math.max(1, Number(firstPage.meta?.totalPages || 1));

    if (totalPages === 1) {
      return items;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => fetchPage({ page: index + 2, pageSize })),
    );

    remainingPages.forEach((page) => {
      items.push(...(page.items || []));
    });

    return items;
  }

  async reload() {
    try {
      const [clises, dies, stock, racks] = await Promise.all([
        this.fetchAllPages((query) => this.backend.getClises(query)),
        this.fetchAllPages((query) => this.backend.getDies(query)),
        this.fetchAllPages((query) => this.backend.getStockItems(query)),
        this.backend.getRackConfigs(),
      ]);

      this._cliseItems.next(clises.map((item: any) => this.mapClise(item)));
      this._dieItems.next(dies.map((item: any) => this.mapDie(item)));
      this._stockItems.next(stock.map((item: any) => this.mapStock(item)));
      this._layoutData.next(Array.isArray(racks) && racks.length ? racks.map((rack: any) => this.mapRack(rack)) : this.buildFallbackLayout());
      this.mapItemsToLayout();
    } catch {
      this.mapItemsToLayout();
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
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Ingreso PT', `Entrada de Producto: OT ${created.ot}`);
    return created;
  }

  async addStocks(items: StockItem[]) {
    const payloadItems = items.map((item) => this.mapStockToPayload(item));
    const result = await this.backend.bulkCreateStockItems({ items: payloadItems });
    await this.reload();
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Importacion Masiva', `Se importaron ${items.length} items de stock.`);
    return result;
  }

  async updateStock(item: StockItem) {
    await this.backend.updateStockItem(item.id, this.mapStockToPayload(item));
    const persisted = this.mapStock(await this.backend.updateStockStatus(item.id, { status: this.mapStockStatusToApi(item.status) }));
    this._stockItems.next(this.stockItems.map(entry => entry.id === item.id ? persisted : entry));
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Ajuste PT', `Ajuste en OT ${persisted.ot} - ${persisted.status}`);
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

  normalizeCliseData(rawData: any[]): { valid: CliseItem[], conflicts: CliseItem[] } {
    const normalized = this.excelService.normalizeData(rawData, this.CLISE_MAPPING);
    const mapped: CliseItem[] = normalized.map((row, index) => {
      const item = this.buildImportedClise(row, index);
      return {
        ...item,
        hasConflict: this.hasCliseConflict(item),
      };
    });

    const valid = mapped.filter((item) => !item.hasConflict);
    const conflicts = mapped.filter((item) => item.hasConflict);
    return { valid, conflicts };
  }

  normalizeDieData(rawData: any[]): { valid: DieItem[], conflicts: DieItem[] } {
    const normalized = this.excelService.normalizeData(rawData, this.DIE_MAPPING);
    const mapped: DieItem[] = normalized.map(row => ({
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
      hasConflict: false
    }));

    const valid = mapped.filter(item => !this.hasDieConflict(item));
    const conflicts = mapped.filter(item => this.hasDieConflict(item));
    conflicts.forEach(item => item.hasConflict = true);
    return { valid, conflicts };
  }

  normalizeStockData(rawData: any[]): { valid: StockItem[], conflicts: StockItem[] } {
    const normalized = this.excelService.normalizeData(rawData, this.STOCK_MAPPING);
    const mapped: StockItem[] = normalized.map(row => {
      const rolls = this.excelService.parseNumber(row.rolls) || 0;
      const millares = this.excelService.parseNumber(row.millares) || 0;
      return {
        id: Math.random().toString(36).slice(2, 11),
        ot: this.excelService.toDisplayString(row.ot),
        client: this.excelService.toDisplayString(row.client),
        product: this.excelService.toDisplayString(row.product),
        quantity: rolls,
        unit: 'Rollos',
        rolls,
        millares,
        location: this.excelService.toDisplayString(row.location) || 'RECEPCION',
        status: this.normalizeStockStatus(row.status),
        entryDate: new Date().toISOString(),
        notes: this.excelService.toDisplayString(row.notes),
        palletId: this.excelService.toDisplayString(row.palletId) || `PAL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
      };
    });

    const valid = mapped.filter(item => item.ot && item.client);
    const conflicts = mapped.filter(item => !item.ot || !item.client);
    return { valid, conflicts };
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
    };
  }

  private mapStock(item: any): StockItem {
    return {
      id: item.id,
      ot: item.ot_number_snapshot || item.work_order?.ot_number || '',
      client: item.client_snapshot || '',
      product: item.product_snapshot || '',
      quantity: Number(item.quantity || 0),
      unit: item.unit || 'Rollos',
      rolls: item.rolls ?? 0,
      millares: item.millares ? Number(item.millares) : 0,
      location: item.location || '',
      status: this.normalizeStockStatus(item.status),
      entryDate: item.entry_date || new Date().toISOString(),
      notes: item.notes || '',
      palletId: item.pallet_id || '',
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
    return {
      ot_number_snapshot: item.ot || undefined,
      client_snapshot: item.client || undefined,
      product_snapshot: item.product || undefined,
      quantity: item.quantity ?? 0,
      unit: item.unit || 'Rollos',
      rolls: item.rolls ?? undefined,
      millares: item.millares ?? undefined,
      location: item.location || undefined,
      status: this.mapStockStatusToApi(item.status),
      entry_date: item.entryDate || new Date().toISOString(),
      notes: item.notes || undefined,
      pallet_id: item.palletId || undefined,
    };
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
