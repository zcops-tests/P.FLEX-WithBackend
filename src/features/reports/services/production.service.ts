import { Injectable, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BackendApiService } from '../../../services/backend-api.service';
import { StateService } from '../../../services/state.service';
import { PrintReport, DiecutReport } from '../models/reports.models';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private backend = inject(BackendApiService);
  private state = inject(StateService);

  private _printReports = new BehaviorSubject<PrintReport[]>([]);
  private _diecutReports = new BehaviorSubject<DiecutReport[]>([]);

  get printReports() { return this._printReports.value; }
  get diecutReports() { return this._diecutReports.value; }
  get printReports$() { return this._printReports.asObservable(); }
  get diecutReports$() { return this._diecutReports.asObservable(); }

  constructor() {
    effect(() => {
      if (!this.state.currentUser()) {
        this._printReports.next([]);
        this._diecutReports.next([]);
        return;
      }

      untracked(() => {
        void this.reload();
      });
    });
  }

  async reload() {
    try {
      const [printReports, diecutReports] = await Promise.all([
        this.backend.getPrintReports({ page: 1, pageSize: 200 }),
        this.backend.getDiecutReports({ page: 1, pageSize: 200 }),
      ]);
      this._printReports.next((printReports.items || []).map((item: any) => this.mapPrintReport(item)));
      this._diecutReports.next((diecutReports.items || []).map((item: any) => this.mapDiecutReport(item)));
    } catch {
      // Keep current data if the API fails.
    }
  }

  async createPrintReport(body: any) {
    const created = await this.backend.createPrintReport(body);
    const detail = await this.backend.getPrintReport(created.id);
    const mapped = this.mapPrintReport(detail);
    this._printReports.next([mapped, ...this.printReports]);
    return mapped;
  }

  async createDiecutReport(body: any) {
    const created = await this.backend.createDiecutReport(body);
    const detail = await this.backend.getDiecutReport(created.id);
    const mapped = this.mapDiecutReport(detail);
    this._diecutReports.next([mapped, ...this.diecutReports]);
    return mapped;
  }

  private mapPrintReport(item: any): PrintReport {
    return {
      id: item.id,
      date: new Date(item.reported_at),
      ot: item.work_order_number_snapshot || item.work_order?.ot_number || '',
      client: item.client_snapshot || '',
      product: item.product_snapshot || '',
      machine: item.machine?.name || '',
      operator: item.operator?.name || item.operator_name_snapshot || '',
      shift: item.shift?.name || '',
      activities: (item.activities || []).map((activity: any) => ({
        type: activity.activity_type,
        startTime: activity.start_time,
        endTime: activity.end_time,
        meters: Number(activity.meters || 0),
      })),
      totalMeters: Number(item.total_meters || 0),
      clise: {
        code: item.clise?.item_code || '',
        status: item.clise_status || 'OK',
      },
      die: {
        status: item.die_status || 'OK',
      },
      observations: item.observations || '',
      productionStatus: String(item.production_status || 'TOTAL').toUpperCase().includes('PAR') ? 'PARCIAL' : 'TOTAL',
    };
  }

  private mapDiecutReport(item: any): DiecutReport {
    return {
      id: item.id,
      date: new Date(item.reported_at),
      ot: item.work_order_number_snapshot || item.work_order?.ot_number || '',
      client: item.client_snapshot || '',
      product: item.product_snapshot || '',
      machine: item.machine?.name || '',
      operator: item.operator?.name || item.operator_name_snapshot || '',
      shift: item.shift?.name || '',
      dieSeries: item.die?.serie || '',
      frequency: item.frequency || '',
      goodUnits: Number(item.good_units || 0),
      waste: Number(item.waste_units || 0),
      dieStatus: this.mapToolingStatus(item.die_status),
      activities: (item.activities || []).map((activity: any) => ({
        type: activity.activity_type,
        startTime: activity.start_time,
        endTime: activity.end_time,
        qty: Number(activity.quantity || 0),
      })),
      productionStatus: String(item.production_status || 'TOTAL').toUpperCase().includes('PAR') ? 'PARCIAL' : 'TOTAL',
      observations: item.observations || '',
    };
  }

  private mapToolingStatus(status: string): 'OK' | 'Desgaste' | 'DaÃ±ado' {
    const normalized = String(status || '').toUpperCase();
    if (normalized.includes('WEAR') || normalized.includes('DESG')) return 'Desgaste';
    if (normalized.includes('DAM') || normalized.includes('DAN')) return 'DaÃ±ado';
    return 'OK';
  }
}
