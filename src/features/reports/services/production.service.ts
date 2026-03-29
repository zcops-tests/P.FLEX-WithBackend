import { Injectable, NgZone, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BackendApiService } from '../../../services/backend-api.service';
import { StateService } from '../../../services/state.service';
import { PrintReport, DiecutReport, PackagingReport, RewindReport } from '../models/reports.models';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private backend = inject(BackendApiService);
  private state = inject(StateService);
  private zone = inject(NgZone);

  private _printReports = new BehaviorSubject<PrintReport[]>([]);
  private _diecutReports = new BehaviorSubject<DiecutReport[]>([]);
  private _rewindReports = new BehaviorSubject<RewindReport[]>([]);
  private _packagingReports = new BehaviorSubject<PackagingReport[]>([]);

  get printReports() { return this._printReports.value; }
  get diecutReports() { return this._diecutReports.value; }
  get rewindReports() { return this._rewindReports.value; }
  get packagingReports() { return this._packagingReports.value; }
  get printReports$() { return this._printReports.asObservable(); }
  get diecutReports$() { return this._diecutReports.asObservable(); }
  get rewindReports$() { return this._rewindReports.asObservable(); }
  get packagingReports$() { return this._packagingReports.asObservable(); }

  constructor() {
    effect(() => {
      if (!this.state.currentUser()) {
        this.commitState(() => {
          this._printReports.next([]);
          this._diecutReports.next([]);
          this._rewindReports.next([]);
          this._packagingReports.next([]);
        });
        return;
      }

      untracked(() => {
        void this.reload();
      });
    });
  }

  async reload() {
    const [printReports, diecutReports, rewindReports, packagingReports] = await Promise.allSettled([
      this.backend.getPrintReports({ page: 1, pageSize: 200 }),
      this.backend.getDiecutReports({ page: 1, pageSize: 200 }),
      this.backend.getRewindReports({ page: 1, pageSize: 200 }),
      this.backend.getPackagingReports({ page: 1, pageSize: 200 }),
    ]);

    if (printReports.status === 'fulfilled') {
      this.commitState(() => {
        this._printReports.next((printReports.value.items || []).map((item: any) => this.mapPrintReport(item)));
      });
    }

    if (diecutReports.status === 'fulfilled') {
      this.commitState(() => {
        this._diecutReports.next((diecutReports.value.items || []).map((item: any) => this.mapDiecutReport(item)));
      });
    }

    if (rewindReports.status === 'fulfilled') {
      this.commitState(() => {
        this._rewindReports.next((rewindReports.value.items || []).map((item: any) => this.mapRewindReport(item)));
      });
    }

    if (packagingReports.status === 'fulfilled') {
      this.commitState(() => {
        this._packagingReports.next((packagingReports.value.items || []).map((item: any) => this.mapPackagingReport(item)));
      });
    }
  }

  async createPrintReport(body: any) {
    const created = await this.backend.createPrintReport(body);
    const mapped = await this.getPrintReport(created.id);
    this.commitState(() => {
      this._printReports.next([mapped, ...this.printReports]);
    });
    return mapped;
  }

  async createDiecutReport(body: any) {
    const created = await this.backend.createDiecutReport(body);
    const mapped = await this.getDiecutReport(created.id);
    this.commitState(() => {
      this._diecutReports.next([mapped, ...this.diecutReports]);
    });
    return mapped;
  }

  async createRewindReport(body: any) {
    const created = await this.backend.createRewindReport(body);
    const mapped = await this.getRewindReport(created.id);
    this.commitState(() => {
      this._rewindReports.next([mapped, ...this.rewindReports]);
    });
    return mapped;
  }

  async createPackagingReport(body: any) {
    const created = await this.backend.createPackagingReport(body);
    const mapped = await this.getPackagingReport(created.id);
    this.commitState(() => {
      this._packagingReports.next([mapped, ...this.packagingReports]);
    });
    return mapped;
  }

  async updatePackagingReport(id: string, body: any) {
    const updated = await this.backend.updatePackagingReport(id, body);
    const mapped = this.mapPackagingReport(updated);
    this.commitState(() => {
      this._packagingReports.next(this.packagingReports.map((report) => report.id === id ? mapped : report));
    });
    return mapped;
  }

  async getPrintReport(id: string) {
    const detail = await this.backend.getPrintReport(id);
    return this.mapPrintReport(detail);
  }

  async getDiecutReport(id: string) {
    const detail = await this.backend.getDiecutReport(id);
    return this.mapDiecutReport(detail);
  }

  async getRewindReport(id: string) {
    const detail = await this.backend.getRewindReport(id);
    return this.mapRewindReport(detail);
  }

  async getPackagingReport(id: string) {
    const detail = await this.backend.getPackagingReport(id);
    return this.mapPackagingReport(detail);
  }

  private mapPrintReport(item: any): PrintReport {
    return {
      id: item.id,
      date: this.toDate(item.date || item.reported_at),
      ot: item.work_order_number_snapshot || item.work_order?.ot_number || '',
      client: item.client || item.client_snapshot || '',
      product: item.product || item.product_snapshot || '',
      machine: this.readText(item.machine),
      operator: this.readText(item.operator) || item.operator_name_snapshot || '',
      shift: this.readText(item.shift),
      activities: (item.uiActivities || item.activities || []).map((activity: any) => ({
        type: activity.type || activity.activity_type,
        startTime: activity.startTime || activity.start_time || '',
        endTime: activity.endTime || activity.end_time || '',
        meters: this.toNumber(activity.meters),
      })),
      totalMeters: this.toNumber(item.totalMeters ?? item.total_meters),
      clise: {
        code: item.clise?.code || item.clise?.item_code || '',
        status: item.clise?.status || item.clise_status || 'OK',
      },
      die: {
        status: item.die?.status || item.die_status || 'OK',
        type: item.die?.type || item.dieType || item.die_type_snapshot || '',
        series: item.die?.serie || item.dieSeries || item.die_series_snapshot || '',
        location: item.die?.ubicacion || item.dieLocation || item.die_location_snapshot || '',
      },
      observations: item.observations || '',
      productionStatus: this.normalizeProductionStatus(item.productionStatus || item.production_status),
    };
  }

  private mapDiecutReport(item: any): DiecutReport {
    return {
      id: item.id,
      date: this.toDate(item.date || item.reported_at),
      ot: item.work_order_number_snapshot || item.work_order?.ot_number || '',
      client: item.client || item.client_snapshot || '',
      product: item.product || item.product_snapshot || '',
      machine: this.readText(item.machine),
      operator: this.readText(item.operator) || item.operator_name_snapshot || '',
      shift: this.readText(item.shift),
      dieSeries: item.dieSeries || item.die?.serie || '',
      frequency: item.frequency || '',
      goodUnits: this.toNumber(item.goodUnits ?? item.good_units),
      waste: this.toNumber(item.waste ?? item.waste_units),
      dieStatus: this.mapToolingStatus(item.dieStatus || item.die_status),
      activities: (item.uiActivities || item.activities || []).map((activity: any) => ({
        type: activity.type || activity.activity_type,
        startTime: activity.startTime || activity.start_time || '',
        endTime: activity.endTime || activity.end_time || '',
        qty: this.toNumber(activity.qty ?? activity.quantity),
        observations: activity.observations || '',
      })),
      productionStatus: this.normalizeProductionStatus(item.productionStatus || item.production_status),
      observations: item.observations || '',
    };
  }

  private mapRewindReport(item: any): RewindReport {
    return {
      id: item.id,
      date: this.toDate(item.date || item.reported_at),
      ot: item.work_order_number_snapshot || item.work_order?.ot_number || '',
      client: item.client || item.client_snapshot || '',
      description: item.description || item.product_snapshot || '',
      machine: this.readText(item.machine),
      operator: this.readText(item.operator) || item.operator_name_snapshot || '',
      shift: this.readText(item.shift),
      rolls: this.toNumber(item.rolls ?? item.rolls_finished),
      labelsPerRoll: this.toNumber(item.labelsPerRoll ?? item.labels_per_roll),
      totalLabels: this.toNumber(item.totalLabels ?? item.total_labels),
      meters: this.toNumber(item.meters ?? item.total_meters),
      waste: this.toNumber(item.waste ?? item.waste_rolls),
      qualityCheck: Boolean(item.qualityCheck ?? item.quality_check),
      observations: item.observations || '',
      productionStatus: this.normalizeProductionStatus(item.productionStatus || item.production_status),
    };
  }

  private mapPackagingReport(item: any): PackagingReport {
    return {
      id: item.id,
      date: this.toDate(item.date || item.reported_at),
      ot: item.work_order_number_snapshot || item.work_order?.ot_number || '',
      client: item.client || item.client_snapshot || '',
      description: item.description || item.product_snapshot || '',
      operator: this.readText(item.operator) || item.operator_name_snapshot || '',
      shift: this.readText(item.shift) || item.shift_name_snapshot || '',
      status: this.normalizeLotStatus(item.lotStatus ?? item.lot_status ?? item.status),
      rolls: this.toNumber(item.rolls),
      meters: this.toNumber(item.meters ?? item.total_meters),
      demasiaRolls: this.toNumber(item.demasiaRolls ?? item.demasia_rolls),
      demasiaMeters: this.toNumber(item.demasiaMeters ?? item.demasia_meters),
      notes: item.notes || '',
      workOrderId: item.work_order_id || item.workOrderId || null,
    };
  }

  private mapToolingStatus(status: string): 'OK' | 'Desgaste' | 'Dañado' {
    const normalized = String(status || '').toUpperCase();
    if (normalized.includes('WEAR') || normalized.includes('DESG')) return 'Desgaste';
    if (normalized.includes('DAM') || normalized.includes('DAN')) return 'Dañado';
    return 'OK';
  }

  private normalizeProductionStatus(status: unknown): 'PARCIAL' | 'TOTAL' {
    return String(status || 'TOTAL').toUpperCase().includes('PAR') ? 'PARCIAL' : 'TOTAL';
  }

  private normalizeLotStatus(status: unknown): 'Completo' | 'Parcial' {
    return String(status || 'COMPLETE').toUpperCase().includes('PART') ? 'Parcial' : 'Completo';
  }

  private toDate(value: unknown): Date {
    const candidate = value ? new Date(String(value)) : new Date();
    return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private readText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).name || '');
    }
    return '';
  }

  private commitState(callback: () => void) {
    this.zone.run(callback);
  }
}
