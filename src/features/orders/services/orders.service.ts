import { Injectable, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OT } from '../models/orders.models';
import { BackendApiService } from '../../../services/backend-api.service';
import { StateService } from '../../../services/state.service';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private backend = inject(BackendApiService);
  private state = inject(StateService);

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
        this._ots.next([]);
        this._internalDatabase.next([]);
        return;
      }

      untracked(() => {
        void this.reload();
      });
    });
  }

  async reload() {
    try {
      const response = await this.backend.getWorkOrders({ page: 1, pageSize: 200 });
      const mapped = (response.items || []).map((item: any) => this.mapWorkOrder(item));
      this._ots.next(mapped);
      this._internalDatabase.next(mapped);
      this._dbLastUpdated.next(new Date());
    } catch {
      // Keep current data if the API fails.
    }
  }

  updateOts(newOts: Partial<OT>[]) {
    this._ots.next(newOts);
  }

  async deleteOt(otId: string) {
    const current = this._ots.value;
    const match = current.find(ot => String(ot.OT) === String(otId)) as any;
    if (match?.id) {
      await this.backend.deleteWorkOrder(match.id);
    }
    this._ots.next(current.filter(ot => String(ot.OT) !== String(otId)));
  }

  updateInternalDatabase(data: Partial<OT>[]) {
    this._internalDatabase.next(data);
    this._dbLastUpdated.next(new Date());
  }

  findInDatabase(searchTerm: string): Partial<OT>[] {
    const term = searchTerm.toLowerCase();
    return this.internalDatabase.filter(ot => 
      String(ot.OT).toLowerCase().includes(term) || 
      String(ot['Razon Social']).toLowerCase().includes(term) ||
      String(ot.descripcion).toLowerCase().includes(term)
    );
  }

  async saveOt(ot: Partial<OT>) {
    const existing = this.ots.find(item => String(item.OT) === String(ot.OT)) as any;
    const payload = this.mapOtToPayload(ot);
    let saved;

    if (existing?.id) {
      saved = await this.backend.updateWorkOrder(existing.id, payload);
    } else {
      saved = await this.backend.createWorkOrder(payload);
    }

    const mapped = this.mapWorkOrder(saved);
    const list = [...this._ots.value];
    const index = list.findIndex(item => String(item.OT) === String(mapped.OT));
    if (index >= 0) {
      list[index] = { ...list[index], ...mapped };
    } else {
      list.unshift(mapped);
    }
    this._ots.next(list);
    this.updateInternalDatabase(this.mergeInternalDatabase(mapped));
  }

  async updateStatus(ot: Partial<OT>, status: string) {
    const target = ot as any;
    if (!target?.id) return;
    await this.backend.updateWorkOrderStatus(target.id, {
      status: this.mapStatusToApi(status),
    });
    this._ots.next(this._ots.value.map(item => String(item.OT) === String(ot.OT) ? { ...item, Estado_pedido: status } : item));
  }

  private mergeInternalDatabase(item: Partial<OT>) {
    const list = [...this._internalDatabase.value];
    const index = list.findIndex(entry => String(entry.OT) === String(item.OT));
    if (index >= 0) {
      list[index] = { ...list[index], ...item };
    } else {
      list.unshift(item);
    }
    return list;
  }

  private mapWorkOrder(item: any): Partial<OT> {
    return {
      id: item.id,
      OT: item.ot_number,
      descripcion: item.descripcion || '',
      'Nro. Cotizacion': item.nro_cotizacion || '',
      'Nro. Ficha': item.nro_ficha || '',
      Pedido: item.pedido || '',
      'ORDEN COMPRA': item.orden_compra || '',
      'Razon Social': item.cliente_razon_social || '',
      Vendedor: item.vendedor || '',
      'MLL Pedido': item.cantidad_pedida ? String(item.cantidad_pedida) : '',
      'FECHA PED': this.toDateInput(item.fecha_pedido),
      'FECHA ENT': this.toDateInput(item.fecha_entrega),
      'FECHA INGRESO PLANTA': this.toDateInput(item.fecha_ingreso_planta),
      'CANT PED': Number(item.cantidad_pedida || 0),
      Und: item.unidad || '',
      Material: item.material || '',
      Ancho: item.ancho_mm ? String(item.ancho_mm) : '',
      Avance: item.avance_mm ? String(item.avance_mm) : '',
      desarrollo: item.desarrollo_mm ? String(item.desarrollo_mm) : '',
      adhesivo: item.adhesivo || '',
      acabado: item.acabado || '',
      troquel: item.troquel || '',
      maquina: item.maquina_texto || '',
      total_mtl: item.total_metros ? String(item.total_metros) : '0',
      total_M2: item.total_m2 ? String(item.total_m2) : '0',
      Estado_pedido: this.mapStatusFromApi(item.status),
      ObsDes: item.observaciones_diseno || '',
      ObsCot: item.observaciones_cotizacion || '',
    } as Partial<OT>;
  }

  private mapOtToPayload(ot: Partial<OT>) {
    return {
      ot_number: ot.OT,
      descripcion: ot.descripcion,
      nro_cotizacion: ot['Nro. Cotizacion'],
      nro_ficha: ot['Nro. Ficha'],
      pedido: ot.Pedido,
      orden_compra: ot['ORDEN COMPRA'],
      cliente_razon_social: ot['Razon Social'],
      vendedor: ot.Vendedor,
      fecha_pedido: this.normalizeDate(ot['FECHA PED']),
      fecha_entrega: this.normalizeDate(ot['FECHA ENT']),
      fecha_ingreso_planta: this.normalizeDate(ot['FECHA INGRESO PLANTA']),
      cantidad_pedida: Number(ot['CANT PED'] || ot['MLL Pedido'] || 0),
      unidad: ot.Und,
      material: ot.Material,
      ancho_mm: Number(ot.Ancho || 0) || undefined,
      avance_mm: Number(ot.Avance || 0) || undefined,
      desarrollo_mm: Number(ot.desarrollo || 0) || undefined,
      adhesivo: ot.adhesivo,
      acabado: ot.acabado,
      troquel: ot.troquel,
      maquina_texto: ot.maquina,
      total_metros: Number(ot.total_mtl || 0) || undefined,
      total_m2: Number(ot.total_M2 || 0) || undefined,
      observaciones_diseno: ot.ObsDes,
      observaciones_cotizacion: ot.ObsCot,
    };
  }

  private mapStatusFromApi(status: string) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'IN_PRODUCTION') return 'EN PROCESO';
    if (normalized === 'COMPLETED') return 'FINALIZADO';
    if (normalized === 'PARTIAL') return 'PAUSADA';
    if (normalized === 'CANCELLED') return 'PAUSADA';
    return 'PENDIENTE';
  }

  private mapStatusToApi(status: string) {
    const normalized = String(status || '').toUpperCase();
    if (normalized.includes('PROCESO')) return 'IN_PRODUCTION';
    if (normalized.includes('FINAL')) return 'COMPLETED';
    if (normalized.includes('PAUS')) return 'PARTIAL';
    return 'PLANNED';
  }

  private normalizeDate(value: any) {
    if (!value) return undefined;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return undefined;
  }

  private toDateInput(value: string | Date | undefined) {
    if (!value) return '';
    return new Date(value).toISOString().split('T')[0];
  }
}
