import { Injectable, NgZone, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  OT,
  OT_IMPORT_HEADERS,
  OTDatabaseBrowserState,
  OTImportProgress,
  OTManagementExitAction,
} from '../models/orders.models';
import { BackendApiService } from '../../../services/backend-api.service';
import { StateService } from '../../../services/state.service';
import { BrowserStorageService } from '../../../services/browser-storage.service';

const WORK_ORDER_FETCH_PAGE_SIZE = 500;
const WORK_ORDER_FETCH_PARALLELISM = 4;
const WORK_ORDER_IMPORT_BATCH_SIZE = 200;
const DATABASE_BROWSER_PAGE_SIZE = 25;
const LEGACY_ACTIVE_OT_STORAGE_KEY = 'pflex_active_work_orders';
const OT_PERSISTED_HEADERS = [...OT_IMPORT_HEADERS, 'FECHA INGRESO PLANTA'] as const;

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private backend = inject(BackendApiService);
  private state = inject(StateService);
  private storage = inject(BrowserStorageService);
  private zone = inject(NgZone);

  private _ots = new BehaviorSubject<Partial<OT>[]>([]);
  private _internalDatabase = new BehaviorSubject<Partial<OT>[]>([]);
  private _dbLastUpdated = new BehaviorSubject<Date | null>(null);

  get ots() { return this._ots.value; }
  get internalDatabase() { return this._internalDatabase.value; }
  get dbLastUpdated() { return this._dbLastUpdated.value; }

  get ots$() { return this._ots.asObservable(); }
  get dbLastUpdated$() { return this._dbLastUpdated.asObservable(); }

  constructor() {
    effect(() => {
      if (!this.state.currentUser()) {
        this.commitState(() => {
          this._ots.next([]);
          this._internalDatabase.next([]);
        });
        this.storage.removeItem(LEGACY_ACTIVE_OT_STORAGE_KEY);
        return;
      }

      this.storage.removeItem(LEGACY_ACTIVE_OT_STORAGE_KEY);

      untracked(() => {
        void this.reloadManagementOrders();
      });
    });
  }

  async reload() {
    return this.reloadManagementOrders();
  }

  async reloadManagementOrders() {
    try {
      const items = await this.backend.getManagementWorkOrders();
      const mapped = (items || []).map((item: any) => this.mapWorkOrder(item));
      this.commitState(() => {
        this._ots.next(mapped);
        this._dbLastUpdated.next(new Date());
      });
      return mapped;
    } catch {
      return this._ots.value;
    }
  }

  async loadAllOrdersSnapshot() {
    const mapped = await this.fetchAllWorkOrders();
    this._internalDatabase.next(mapped);
    this._dbLastUpdated.next(new Date());
    return mapped;
  }

  async searchDatabasePage(query?: { q?: string; page?: number; pageSize?: number }): Promise<OTDatabaseBrowserState> {
    const page = Math.max(1, Number(query?.page || 1));
    const pageSize = Math.max(1, Number(query?.pageSize || DATABASE_BROWSER_PAGE_SIZE));
    const q = String(query?.q || '').trim();
    const response = await this.backend.getWorkOrders({ page, pageSize, q: q || undefined });
    const items = Array.isArray(response?.items) ? response.items.map((item: any) => this.mapWorkOrder(item)) : [];
    const total = Number(response?.meta?.total || items.length || 0);
    const totalPages = Math.max(1, Number(response?.meta?.totalPages || 1));

    return {
      items,
      page,
      pageSize,
      total,
      totalPages,
      query: q,
      isLoading: false,
      hasLoaded: true,
      error: '',
    };
  }

  findInDatabase(searchTerm: string): Partial<OT>[] {
    const term = searchTerm.toLowerCase();
    return this.internalDatabase.filter((ot) =>
      String(ot.OT).toLowerCase().includes(term)
      || String(ot['Razon Social']).toLowerCase().includes(term)
      || String(ot.descripcion).toLowerCase().includes(term),
    );
  }

  async findWorkOrderByOtNumber(otNumber: string | undefined) {
    const normalized = String(otNumber || '').trim().toUpperCase();
    if (!normalized) return null;

    const localMatch = this.findStoredOt(normalized);
    if (localMatch) return localMatch;

    const response = await this.backend.getWorkOrders({ q: normalized, page: 1, pageSize: 50 });
    const items = Array.isArray(response?.items) ? response.items : [];
    const match = items.find((item: any) => String(item.ot_number || item.OT || '').trim().toUpperCase() === normalized);
    return match ? this.mapWorkOrder(match) : null;
  }

  async saveOt(ot: Partial<OT>, options?: { activate?: boolean }) {
    const existing = await this.findWorkOrderByOtNumber(ot.OT);
    const payload = this.mapOtToPayload({ ...existing, ...ot });
    let saved;

    if ((existing as any)?.id) {
      saved = await this.backend.updateWorkOrder((existing as any).id, payload);
    } else {
      saved = await this.backend.createWorkOrder(payload);
    }

    const mapped = this.mapWorkOrder(saved);
    this.replaceOtInStores(mapped);

    if (options?.activate && mapped.id && !this.isOtActive(mapped.OT)) {
      await this.backend.enterWorkOrderManagement(String(mapped.id));
      await this.reloadManagementOrders();
      return;
    }

    if (options?.activate && this.isOtActive(mapped.OT)) {
      this.replaceManagementOt(mapped);
    }
  }

  async importWorkOrders(
    rows: Partial<OT>[],
    onProgress?: (progress: OTImportProgress) => void,
  ) {
    const normalizedRows = rows
      .map((row) => this.normalizeImportedOt(row))
      .filter((row) => String(row.OT || '').trim());

    if (normalizedRows.length === 0) {
      return { created: 0, updated: 0, total: 0, preservedManagementOtNumbers: [] as string[] };
    }

    let created = 0;
    let updated = 0;
    const totalItems = normalizedRows.length;
    const totalBatches = Math.max(1, Math.ceil(totalItems / WORK_ORDER_IMPORT_BATCH_SIZE));
    const activeOtNumbers = new Set(
      this._ots.value
        .map((item) => String(item.OT || '').trim().toUpperCase())
        .filter(Boolean),
    );
    const preservedManagementOtNumbers = Array.from(
      new Set(
        normalizedRows
          .map((row) => String(row.OT || '').trim().toUpperCase())
          .filter((otNumber) => activeOtNumbers.has(otNumber)),
      ),
    );

    onProgress?.({
      currentBatch: 0,
      totalBatches,
      processedItems: 0,
      totalItems,
      percentage: 0,
    });

    for (let index = 0; index < totalBatches; index += 1) {
      const start = index * WORK_ORDER_IMPORT_BATCH_SIZE;
      const end = start + WORK_ORDER_IMPORT_BATCH_SIZE;
      const batch = normalizedRows.slice(start, end).map((item) => this.mapOtToPayload(item));

      const result = await this.backend.bulkUpsertWorkOrders({ items: batch });
      created += Number(result?.created || 0);
      updated += Number(result?.updated || 0);

      onProgress?.({
        currentBatch: index + 1,
        totalBatches,
        processedItems: Math.min(end, totalItems),
        totalItems,
        percentage: Math.round((Math.min(end, totalItems) / totalItems) * 100),
      });
    }

    this._dbLastUpdated.next(new Date());
    this._internalDatabase.next([]);

    return { created, updated, total: totalItems, preservedManagementOtNumbers };
  }

  async updateStatus(ot: Partial<OT>, status: string) {
    const target = await this.findWorkOrderByOtNumber(ot.OT);
    if (!(target as any)?.id) return;

    const currentBackendStatus = this.normalizeApiStatus((target as any).backend_status);
    const nextBackendStatus = this.mapStatusToApi(status, currentBackendStatus);

    if (currentBackendStatus && currentBackendStatus === nextBackendStatus) {
      this.replaceOtInStores({
        ...target,
        Estado_pedido: this.mapStatusFromApi(currentBackendStatus),
        backend_status: currentBackendStatus,
      });
      return;
    }

    const saved = await this.backend.updateWorkOrderStatus(String((target as any).id), {
      status: nextBackendStatus,
    });

    this.replaceOtInStores(this.mapWorkOrder(saved));
  }

  async enterManagementWorkOrders(items: Partial<OT>[]) {
    const targets = await Promise.all(
      items.map(async (item) => {
        const resolved = (item as any).id ? item : await this.findWorkOrderByOtNumber(item.OT);
        return resolved && (resolved as any).id ? resolved : null;
      }),
    );

    const pending = Array.from(
      new Map(
        targets
          .filter((item): item is Partial<OT> & { id: string } => Boolean(item && (item as any).id))
          .filter((item) => !this.isOtActive(item.OT))
          .map((item) => [String(item.id), item]),
      ).values(),
    );

    if (!pending.length) {
      return { added: 0 };
    }

    await Promise.all(
      pending.map((item) => this.backend.enterWorkOrderManagement(String(item.id))),
    );

    await this.reloadManagementOrders();
    return { added: pending.length };
  }

  async exitManagementWorkOrder(ot: Partial<OT>, exitAction: OTManagementExitAction) {
    const target = await this.findWorkOrderByOtNumber(ot.OT);
    if (!(target as any)?.id) {
      throw new Error(`No se encontró la OT ${ot.OT} en la base de datos.`);
    }

    await this.backend.exitWorkOrderManagement(String((target as any).id), {
      exit_action: exitAction,
    });

    this._ots.next(
      this._ots.value.filter((item) => String(item.OT || '').trim().toUpperCase() !== String(target.OT || '').trim().toUpperCase()),
    );

    if (this._internalDatabase.value.length > 0) {
      const refreshed = await this.backend.getWorkOrder(String((target as any).id));
      this.replaceOtInDatabase(this.mapWorkOrder(refreshed));
    }
  }

  async deleteOt(otId: string) {
    const current = this._internalDatabase.value;
    const match = current.find((ot) => String(ot.OT) === String(otId)) as any
      || this._ots.value.find((ot) => String(ot.OT) === String(otId)) as any;

    if (match?.id) {
      await this.backend.deleteWorkOrder(match.id);
    }

    const normalizedOt = String(otId || '').trim().toUpperCase();
    this._internalDatabase.next(
      current.filter((ot) => String(ot.OT || '').trim().toUpperCase() !== normalizedOt),
    );
    this._ots.next(
      this._ots.value.filter((ot) => String(ot.OT || '').trim().toUpperCase() !== normalizedOt),
    );
    this._dbLastUpdated.next(new Date());
  }

  updateInternalDatabase(data: Partial<OT>[]) {
    this.commitState(() => {
      this._internalDatabase.next(data);
      this._dbLastUpdated.next(new Date());
    });
  }

  isOtActive(otNumber: string | undefined) {
    const normalized = String(otNumber || '').trim().toUpperCase();
    if (!normalized) return false;
    return this._ots.value.some((item) => String(item.OT).trim().toUpperCase() === normalized);
  }

  private async fetchAllWorkOrders() {
    const firstPage = await this.backend.getWorkOrders({ page: 1, pageSize: WORK_ORDER_FETCH_PAGE_SIZE });
    const items = [...(firstPage.items || [])];
    const totalPages = Number(firstPage.meta?.totalPages || 1);

    const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);
    for (let index = 0; index < remainingPages.length; index += WORK_ORDER_FETCH_PARALLELISM) {
      const slice = remainingPages.slice(index, index + WORK_ORDER_FETCH_PARALLELISM);
      const responses = await Promise.all(
        slice.map((page) => this.backend.getWorkOrders({ page, pageSize: WORK_ORDER_FETCH_PAGE_SIZE })),
      );

      responses.forEach((response) => items.push(...(response.items || [])));
    }

    return items.map((item: any) => this.mapWorkOrder(item));
  }

  private replaceOtInStores(item: Partial<OT>) {
    this.replaceOtInDatabase(item);

    if (this.isOtActive(item.OT)) {
      this.replaceManagementOt(item);
    }

    this.commitState(() => {
      this._dbLastUpdated.next(new Date());
    });
  }

  private replaceOtInDatabase(item: Partial<OT>) {
    if (this._internalDatabase.value.length === 0) return;
    this.commitState(() => {
      this._internalDatabase.next(this.mergeByOt(this._internalDatabase.value, item));
    });
  }

  private replaceManagementOt(item: Partial<OT>) {
    this.commitState(() => {
      this._ots.next(this.mergeByOt(this._ots.value, item));
    });
  }

  private mergeByOt(source: Partial<OT>[], item: Partial<OT>) {
    const list = [...source];
    const index = list.findIndex((entry) => String(entry.OT).trim().toUpperCase() === String(item.OT).trim().toUpperCase());

    if (index >= 0) {
      list[index] = { ...list[index], ...item };
    } else {
      list.unshift(item);
    }

    return list;
  }

  private findStoredOt(otNumber: string | undefined) {
    const normalized = String(otNumber || '').trim().toUpperCase();
    if (!normalized) return null;

    return (this._ots.value.find((item: any) => String(item.OT).trim().toUpperCase() === normalized)
      || this._internalDatabase.value.find((item: any) => String(item.OT).trim().toUpperCase() === normalized)
      || null) as any;
  }

  private normalizeImportedOt(row: Partial<OT>) {
    const normalized: Partial<OT> & Record<string, unknown> = {};

    OT_PERSISTED_HEADERS.forEach((header) => {
      (normalized as any)[header] = (row as any)[header] ?? '';
    });

    normalized.OT = String(row.OT || '').trim().toUpperCase();
    normalized.descripcion = String(row.descripcion || '').trim();
    normalized['Razon Social'] = String(row['Razon Social'] || '').trim();
    normalized.Vendedor = String(row.Vendedor || '').trim();
    normalized.maquina = String(row.maquina || '').trim();
    normalized.Estado_pedido = String(row.Estado_pedido || 'PENDIENTE').trim() || 'PENDIENTE';

    return { ...row, ...normalized };
  }

  private mapWorkOrder(item: any): Partial<OT> {
    const rawPayload = this.normalizeRawPayload(item.raw_payload);

    return {
      ...rawPayload,
      raw_payload: rawPayload,
      id: item.id,
      row_version: item.row_version,
      backend_status: this.normalizeApiStatus(item.status),
      OT: String(item.OT || item.ot_number || rawPayload.OT || '').trim().toUpperCase(),
      descripcion: this.readRawValue(rawPayload, 'descripcion', item.descripcion),
      'Nro. Cotizacion': this.readRawValue(rawPayload, 'Nro. Cotizacion', item.nro_cotizacion),
      'Nro. Ficha': this.readRawValue(rawPayload, 'Nro. Ficha', item.nro_ficha),
      Pedido: this.readRawValue(rawPayload, 'Pedido', item.pedido),
      'ORDEN COMPRA': this.readRawValue(rawPayload, 'ORDEN COMPRA', item.orden_compra),
      'Razon Social': this.readRawValue(rawPayload, 'Razon Social', item.cliente_razon_social),
      Vendedor: this.readRawValue(rawPayload, 'Vendedor', item.vendedor),
      Glosa: this.readRawValue(rawPayload, 'Glosa', ''),
      'MLL Pedido': this.readRawValue(rawPayload, 'MLL Pedido', item.cantidad_pedida),
      'FECHA PED': this.readRawValue(rawPayload, 'FECHA PED', this.toDateInput(item.fecha_pedido)),
      'FECHA ENT': this.readRawValue(rawPayload, 'FECHA ENT', this.toDateInput(item.fecha_entrega)),
      'FECHA INGRESO PLANTA': this.readRawValue(rawPayload, 'FECHA INGRESO PLANTA', this.toDateInput(item.fecha_ingreso_planta)),
      'CANT PED': this.readRawValue(rawPayload, 'CANT PED', item.cantidad_pedida),
      Und: this.readRawValue(rawPayload, 'Und', item.unidad),
      Material: this.readRawValue(rawPayload, 'Material', item.material),
      Ancho: this.readRawValue(rawPayload, 'Ancho', item.ancho_mm),
      Drawback: this.readRawValue(rawPayload, 'Drawback', ''),
      impresion: this.readRawValue(rawPayload, 'impresion', ''),
      merma: this.readRawValue(rawPayload, 'merma', ''),
      Medida: this.readRawValue(rawPayload, 'Medida', ''),
      Avance: this.readRawValue(rawPayload, 'Avance', item.avance_mm),
      desarrollo: this.readRawValue(rawPayload, 'desarrollo', item.desarrollo_mm),
      sep_avance: this.readRawValue(rawPayload, 'sep_avance', ''),
      calibre: this.readRawValue(rawPayload, 'calibre', ''),
      num_colum: this.readRawValue(rawPayload, 'num_colum', item.columnas),
      adhesivo: this.readRawValue(rawPayload, 'adhesivo', item.adhesivo),
      acabado: this.readRawValue(rawPayload, 'acabado', item.acabado),
      troquel: this.readRawValue(rawPayload, 'troquel', item.troquel),
      SentidoFinal: this.readRawValue(rawPayload, 'SentidoFinal', ''),
      diametuco: this.readRawValue(rawPayload, 'diametuco', ''),
      ObsDes: this.readRawValue(rawPayload, 'ObsDes', item.observaciones_diseno),
      ObsCot: this.readRawValue(rawPayload, 'ObsCot', item.observaciones_cotizacion),
      medidavend: this.readRawValue(rawPayload, 'medidavend', ''),
      maquina: this.readRawValue(rawPayload, 'maquina', item.maquina_texto),
      anchoEtiq: this.readRawValue(rawPayload, 'anchoEtiq', ''),
      ancho_mate: this.readRawValue(rawPayload, 'ancho_mate', ''),
      forma: this.readRawValue(rawPayload, 'forma', ''),
      tipoimpre1: this.readRawValue(rawPayload, 'tipoimpre1', ''),
      dispensado: this.readRawValue(rawPayload, 'dispensado', ''),
      cant_etq_xrollohojas: this.readRawValue(rawPayload, 'cant_etq_xrollohojas', ''),
      fechaPrd: this.readRawValue(rawPayload, 'fechaPrd', this.toDateInput(item.fecha_programada_produccion)),
      codmaquina: this.readRawValue(rawPayload, 'codmaquina', ''),
      s_merma: this.readRawValue(rawPayload, 's_merma', ''),
      mtl_sin_merma: this.readRawValue(rawPayload, 'mtl_sin_merma', ''),
      total_mtl: this.readRawValue(rawPayload, 'total_mtl', item.total_metros),
      total_M2: this.readRawValue(rawPayload, 'total_M2', item.total_m2),
      LARGO: this.readRawValue(rawPayload, 'LARGO', ''),
      col_ficha: this.readRawValue(rawPayload, 'col_ficha', ''),
      prepicado_h: this.readRawValue(rawPayload, 'prepicado_h', ''),
      prepicado_v: this.readRawValue(rawPayload, 'prepicado_v', ''),
      semicorte: this.readRawValue(rawPayload, 'semicorte', ''),
      corte_seguridad: this.readRawValue(rawPayload, 'corte_seguridad', ''),
      forma_emb: this.readRawValue(rawPayload, 'forma_emb', ''),
      und_negocio: this.readRawValue(rawPayload, 'und_negocio', ''),
      Linea_produccion: this.readRawValue(rawPayload, 'Linea_produccion', ''),
      p_cant_rollo_ficha: this.readRawValue(rawPayload, 'p_cant_rollo_ficha', ''),
      Estado_pedido: this.readRawValue(rawPayload, 'Estado_pedido', this.mapStatusFromApi(item.status)),
      r_ref_ot: this.readRawValue(rawPayload, 'r_ref_ot', ''),
      logo_tuco: this.readRawValue(rawPayload, 'logo_tuco', ''),
      troquel_ficha: this.readRawValue(rawPayload, 'troquel_ficha', ''),
      acabado_ficha: this.readRawValue(rawPayload, 'acabado_ficha', ''),
      t_acabado: this.readRawValue(rawPayload, 't_acabado', ''),
      ta_acabado: this.readRawValue(rawPayload, 'ta_acabado', ''),
      d_max_bob: this.readRawValue(rawPayload, 'd_max_bob', ''),
      scheduleMachineId: this.readRawValue(rawPayload, 'scheduleMachineId', ''),
      scheduleStartTime: this.readRawValue(rawPayload, 'scheduleStartTime', ''),
      scheduleDurationMinutes: this.readRawValue(rawPayload, 'scheduleDurationMinutes', ''),
      scheduleOperator: this.readRawValue(rawPayload, 'scheduleOperator', ''),
      scheduleNotes: this.readRawValue(rawPayload, 'scheduleNotes', ''),
      scheduleDateTime: this.readRawValue(rawPayload, 'scheduleDateTime', ''),
    } as Partial<OT>;
  }

  private mapOtToPayload(ot: Partial<OT>) {
    return {
      ot_number: this.toNullableString(ot.OT) || undefined,
      descripcion: this.toNullableString(ot.descripcion),
      nro_cotizacion: this.toNullableString(ot['Nro. Cotizacion']),
      nro_ficha: this.toNullableString(ot['Nro. Ficha']),
      pedido: this.toNullableString(ot.Pedido),
      orden_compra: this.toNullableString(ot['ORDEN COMPRA']),
      cliente_razon_social: this.toNullableString(ot['Razon Social']),
      vendedor: this.toNullableString(ot.Vendedor),
      status: this.mapStatusToApi(ot.Estado_pedido, ot.backend_status),
      fecha_pedido: this.normalizeDate(ot['FECHA PED']),
      fecha_entrega: this.normalizeDate(ot['FECHA ENT']),
      fecha_ingreso_planta: this.normalizeDate(ot['FECHA INGRESO PLANTA']),
      fecha_programada_produccion: this.normalizeDate(ot.fechaPrd),
      cantidad_pedida: this.toNumber(ot['CANT PED'] ?? ot['MLL Pedido']),
      unidad: this.toNullableString(ot.Und),
      material: this.toNullableString(ot.Material),
      ancho_mm: this.toNumber(ot.Ancho),
      avance_mm: this.toNumber(ot.Avance),
      desarrollo_mm: this.toNumber(ot.desarrollo),
      columnas: this.toInteger(ot.num_colum ?? ot.col_ficha),
      adhesivo: this.toNullableString(ot.adhesivo),
      acabado: this.toNullableString(ot.acabado),
      troquel: this.toNullableString(ot.troquel),
      maquina_texto: this.toNullableString(ot.maquina),
      total_metros: this.toNumber(ot.total_mtl),
      total_m2: this.toNumber(ot.total_M2),
      observaciones_diseno: this.toNullableString(ot.ObsDes),
      observaciones_cotizacion: this.toNullableString(ot.ObsCot),
      raw_payload: this.buildRawPayload(ot),
    };
  }

  private normalizeRawPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {} as Record<string, unknown>;
    }

    return payload as Record<string, unknown>;
  }

  private buildRawPayload(ot: Partial<OT>) {
    const rawPayload: Record<string, unknown> = {
      ...this.normalizeRawPayload((ot as any).raw_payload),
    };

    OT_PERSISTED_HEADERS.forEach((header) => {
      rawPayload[header] = ot[header] ?? '';
    });

    this.assignRawPayloadValue(rawPayload, 'scheduleMachineId', this.toNullableString(ot.scheduleMachineId));
    this.assignRawPayloadValue(rawPayload, 'scheduleStartTime', this.toNullableString(ot.scheduleStartTime));
    this.assignRawPayloadValue(rawPayload, 'scheduleDurationMinutes', this.toInteger(ot.scheduleDurationMinutes));
    this.assignRawPayloadValue(rawPayload, 'scheduleOperator', this.toNullableString(ot.scheduleOperator));
    this.assignRawPayloadValue(rawPayload, 'scheduleNotes', this.toNullableString(ot.scheduleNotes));
    this.assignRawPayloadValue(rawPayload, 'scheduleDateTime', this.toNullableString(ot.scheduleDateTime));

    return rawPayload;
  }

  private assignRawPayloadValue(rawPayload: Record<string, unknown>, key: string, value: unknown) {
    if (value === undefined || value === null || value === '') {
      delete rawPayload[key];
      return;
    }

    rawPayload[key] = value;
  }

  private readRawValue(payload: Record<string, unknown>, key: typeof OT_PERSISTED_HEADERS[number] | keyof OT, fallback: unknown) {
    const rawValue = payload[key as string];
    return rawValue !== undefined && rawValue !== null && rawValue !== '' ? rawValue : this.stringifyValue(fallback);
  }

  private stringifyValue(value: unknown) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    return String(value);
  }

  private toNullableString(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    const text = String(value).trim();
    if (!text) return undefined;

    const compact = text.replace(/\s/g, '');
    const commaLooksLikeThousands = compact.includes(',')
      && !compact.includes('.')
      && /^-?\d{1,3}(,\d{3})+$/.test(compact);
    const normalizedText = compact.includes(',') && compact.includes('.')
      ? compact.lastIndexOf(',') > compact.lastIndexOf('.')
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '')
      : commaLooksLikeThousands
        ? compact.replace(/,/g, '')
        : compact.includes(',')
          ? compact.replace(',', '.')
        : compact;

    const normalized = Number(normalizedText);
    return Number.isFinite(normalized) ? normalized : undefined;
  }

  private toInteger(value: unknown) {
    const normalized = this.toNumber(value);
    return normalized === undefined ? undefined : Math.trunc(normalized);
  }

  private mapStatusFromApi(status: string) {
    const normalized = this.normalizeApiStatus(status);
    if (normalized === 'IN_PRODUCTION') return 'EN PROCESO';
    if (normalized === 'COMPLETED') return 'FINALIZADO';
    if (normalized === 'PARTIAL') return 'PAUSADA';
    if (normalized === 'CANCELLED') return 'PAUSADA';
    return 'PENDIENTE';
  }

  private mapStatusToApi(status: unknown, currentStatus?: unknown) {
    const normalized = this.normalizeApiStatus(status);
    const normalizedCurrentStatus = this.normalizeApiStatus(currentStatus);

    if (normalized === 'IN_PRODUCTION' || normalized.includes('PROCESO')) return 'IN_PRODUCTION';
    if (normalized === 'COMPLETED' || normalized.includes('FINAL')) return 'COMPLETED';
    if (normalized === 'PARTIAL' || normalized.includes('PAUS')) return 'PARTIAL';
    if (normalized === 'CANCELLED') return 'CANCELLED';
    if (normalized === 'PLANNED' || normalized.includes('PLAN')) return 'PLANNED';
    if (normalized === 'IMPORTED') return 'IMPORTED';
    if (normalized.includes('PEND')) {
      if (normalizedCurrentStatus === 'PLANNED' || normalizedCurrentStatus === 'IMPORTED') {
        return normalizedCurrentStatus;
      }
      return 'IMPORTED';
    }

    return normalizedCurrentStatus || 'IMPORTED';
  }

  private normalizeApiStatus(status: unknown) {
    return String(status || '').trim().toUpperCase();
  }

  private normalizeDate(value: unknown) {
    if (!value) return undefined;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = this.parseExcelSerialDate(value);
      return parsed ? parsed.toISOString().split('T')[0] : undefined;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;

      if (/^\d{5,6}$/.test(text)) {
        const parsed = this.parseExcelSerialDate(Number(text));
        return parsed ? parsed.toISOString().split('T')[0] : undefined;
      }

      const compactDateMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (compactDateMatch) {
        const [, year, month, day] = compactDateMatch;
        const parsed = this.buildUtcDate(Number(year), Number(month), Number(day));
        return parsed ? parsed.toISOString().split('T')[0] : undefined;
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

      const dmyMatch = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:\s+.*)?$/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        const normalizedYear = year.length === 2 ? `20${year}` : year;
        const parsed = this.buildUtcDate(Number(normalizedYear), Number(month), Number(day));
        return parsed ? parsed.toISOString().split('T')[0] : undefined;
      }

      const ymdMatch = text.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:\s+.*)?$/);
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        const parsed = this.buildUtcDate(Number(year), Number(month), Number(day));
        return parsed ? parsed.toISOString().split('T')[0] : undefined;
      }

      const parsed = new Date(text);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return undefined;
  }

  private toDateInput(value: string | Date | number | undefined) {
    if (!value) return '';
    const normalized = this.normalizeDate(value);
    return normalized || '';
  }

  private parseExcelSerialDate(value: number) {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return new Date(Date.UTC(1899, 11, 30) + Math.trunc(value) * 86400000);
  }

  private buildUtcDate(year: number, month: number, day: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return undefined;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day
      ? parsed
      : undefined;
  }

  private commitState(callback: () => void) {
    this.zone.run(callback);
  }
}
