import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { KpiQueryDto } from './dto/kpi.dto';
import { Prisma } from '@prisma/client';
import { toFrontendWorkOrder } from '../../common/utils/frontend-entity.util';

export interface RuntimeSnapshot {
  runtimeMinutes: number;
  downtimeMinutes: number;
  setupMinutes: number;
  goodOutput: number;
  wasteOutput: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOee(query: KpiQueryDto) {
    const { start_date, end_date, machine_id, area_id } = query;

    const where: Prisma.ProductionKpiDailyWhereInput = {
      kpi_date: {
        gte: new Date(start_date),
        lte: new Date(end_date),
      },
    };

    if (machine_id) where.machine_id = machine_id;
    if (area_id) where.area_id = area_id;

    const kpis = await this.prisma.productionKpiDaily.findMany({ where });

    if (kpis.length === 0) {
      const fallback = await this.buildRuntimeSnapshot(query);
      if (
        fallback.runtimeMinutes === 0
        && fallback.downtimeMinutes === 0
        && fallback.setupMinutes === 0
        && fallback.goodOutput === 0
        && fallback.wasteOutput === 0
      ) {
        return { oee: 0, availability: 0, performance: 0, quality: 0, items: [] };
      }

      const availability = fallback.runtimeMinutes / (fallback.runtimeMinutes + fallback.downtimeMinutes) || 0;
      const performance = fallback.runtimeMinutes / (fallback.runtimeMinutes + fallback.downtimeMinutes + fallback.setupMinutes) || 0;
      const quality = fallback.goodOutput / (fallback.goodOutput + fallback.wasteOutput) || 0;
      const oee = availability * performance * quality;

      return {
        oee: Number(oee.toFixed(4)),
        availability: Number(availability.toFixed(4)),
        performance: Number(performance.toFixed(4)),
        quality: Number(quality.toFixed(4)),
        items: [fallback],
      };
    }

    // Basic aggregation for POC
    const totalGood = kpis.reduce((acc, k) => acc + Number(k.good_output), 0);
    const totalWaste = kpis.reduce((acc, k) => acc + Number(k.waste_output), 0);
    const totalRuntime = kpis.reduce((acc, k) => acc + k.runtime_minutes, 0);
    const totalDowntime = kpis.reduce((acc, k) => acc + k.downtime_minutes, 0);

    const availability = totalRuntime / (totalRuntime + totalDowntime) || 0;
    const quality = totalGood / (totalGood + totalWaste) || 0;
    const performance = 0.85; // Placeholder for theoretical vs actual
    const oee = availability * performance * quality;

    return {
      oee: Number(oee.toFixed(4)),
      availability: Number(availability.toFixed(4)),
      performance: Number(performance.toFixed(4)),
      quality: Number(quality.toFixed(4)),
      items: kpis,
    };
  }

  async getWaste(query: KpiQueryDto) {
    const { start_date, end_date } = query;

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        deleted_at: null,
        OR: [
          {
            fecha_ingreso_planta: {
              gte: new Date(start_date),
              lte: new Date(end_date),
            },
          },
          {
            updated_at: {
              gte: new Date(start_date),
              lte: new Date(end_date),
            },
          },
        ],
      },
      orderBy: { updated_at: 'desc' },
      take: 500,
    });

    const items = workOrders
      .map((item) => toFrontendWorkOrder(item))
      .map((item: any) => {
        const total = this.toNumber(item.total_mtl);
        const waste = this.toNumber(item.merma);
        if (total <= 0 && waste <= 0) {
          return null;
        }

        const percentage = total > 0 ? (waste / total) * 100 : 0;
        return {
          ot: item.OT,
          client: item['Razon Social'] || '',
          description: item.descripcion || '',
          total: Number(total.toFixed(2)),
          waste: Number(waste.toFixed(2)),
          percentage: Number(percentage.toFixed(2)),
          status: item.Estado_pedido || '',
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.percentage - a.percentage);

    const totalMeters = items.reduce((acc: number, item: any) => acc + item.total, 0);
    const totalWaste = items.reduce((acc: number, item: any) => acc + item.waste, 0);
    const wasteRate = totalMeters > 0 ? (totalWaste / totalMeters) * 100 : 0;

    return {
      summary: `${totalWaste.toFixed(2)} unidades de merma registradas (${wasteRate.toFixed(2)}%)`,
      items: items.slice(0, 20),
    };
  }

  async getDowntime(query: KpiQueryDto) {
    const [printReports, diecutReports] = await Promise.all([
      this.prisma.printReport.findMany({
        where: this.buildPrintReportWhere(query),
        select: {
          machine: { select: { code: true, name: true } },
          activities: {
            where: { activity_type: 'STOP', deleted_at: null },
            select: { duration_minutes: true },
          },
        },
      }),
      this.prisma.diecutReport.findMany({
        where: this.buildDiecutReportWhere(query),
        select: {
          machine: { select: { code: true, name: true } },
          activities: {
            where: { activity_type: 'STOP', deleted_at: null },
            select: { duration_minutes: true },
          },
        },
      }),
    ]);

    const grouped = new Map<string, { machine: string; process: string; totalMinutes: number; events: number }>();

    const accumulate = (items: Array<{ machine?: { code?: string | null; name?: string | null } | null; activities: Array<{ duration_minutes: number }> }>, process: string) => {
      items.forEach((report) => {
        const key = `${process}:${report.machine?.code || report.machine?.name || 'SIN_MAQUINA'}`;
        const current = grouped.get(key) || {
          machine: report.machine?.name || report.machine?.code || 'Sin máquina',
          process,
          totalMinutes: 0,
          events: 0,
        };

        report.activities.forEach((activity) => {
          current.totalMinutes += Number(activity.duration_minutes || 0);
          current.events += 1;
        });

        grouped.set(key, current);
      });
    };

    accumulate(printReports, 'Impresión');
    accumulate(diecutReports, 'Troquelado');

    const items = [...grouped.values()]
      .filter((item) => item.totalMinutes > 0)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    const totalMinutes = items.reduce((acc, item) => acc + item.totalMinutes, 0);
    const totalEvents = items.reduce((acc, item) => acc + item.events, 0);

    return {
      summary: `${totalMinutes} minutos de parada en ${totalEvents} eventos`,
      items,
    };
  }

  /**
   * Job to consolidate KPIs for a specific day
   */
  async consolidateDailyKpis(date: Date) {
    // In a real scenario, this would aggregate PrintReports and DiecutReports
    // into the ProductionKpiDaily table for fast querying.
    return { message: 'Consolidation triggered' };
  }

  private calculateOEE(availability: number, performance: number, quality: number): number {
    return availability * performance * quality;
  }

  private async buildRuntimeSnapshot(query: KpiQueryDto): Promise<RuntimeSnapshot> {
    const [printReports, diecutReports] = await Promise.all([
      this.prisma.printReport.findMany({
        where: this.buildPrintReportWhere(query),
        select: {
          total_meters: true,
          waste_meters: true,
          activities: {
            where: { deleted_at: null },
            select: { activity_type: true, duration_minutes: true },
          },
        },
      }),
      this.prisma.diecutReport.findMany({
        where: this.buildDiecutReportWhere(query),
        select: {
          good_units: true,
          waste_units: true,
          activities: {
            where: { deleted_at: null },
            select: { activity_type: true, duration_minutes: true },
          },
        },
      }),
    ]);

    const snapshot: RuntimeSnapshot = {
      runtimeMinutes: 0,
      downtimeMinutes: 0,
      setupMinutes: 0,
      goodOutput: 0,
      wasteOutput: 0,
    };

    printReports.forEach((report) => {
      snapshot.goodOutput += this.toNumber(report.total_meters);
      snapshot.wasteOutput += this.toNumber(report.waste_meters);
      report.activities.forEach((activity) => {
        this.assignActivityMinutes(snapshot, activity.activity_type, activity.duration_minutes);
      });
    });

    diecutReports.forEach((report) => {
      snapshot.goodOutput += this.toNumber(report.good_units);
      snapshot.wasteOutput += this.toNumber(report.waste_units);
      report.activities.forEach((activity) => {
        this.assignActivityMinutes(snapshot, activity.activity_type, activity.duration_minutes);
      });
    });

    return snapshot;
  }

  private assignActivityMinutes(snapshot: RuntimeSnapshot, activityType: string, durationMinutes: number) {
    const normalizedType = String(activityType || '').toUpperCase();
    const duration = Number(durationMinutes || 0);

    if (normalizedType === 'RUN') {
      snapshot.runtimeMinutes += duration;
      return;
    }

    if (normalizedType === 'SETUP') {
      snapshot.setupMinutes += duration;
      return;
    }

    if (normalizedType === 'STOP') {
      snapshot.downtimeMinutes += duration;
    }
  }

  private buildPrintReportWhere(query: KpiQueryDto): Prisma.PrintReportWhereInput {
    const where: Prisma.PrintReportWhereInput = {
      deleted_at: null,
      reported_at: {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      },
    };

    if (query.machine_id) {
      where.machine_id = query.machine_id;
    }

    if (query.area_id) {
      where.machine = { is: { area_id: query.area_id } };
    }

    return where;
  }

  private buildDiecutReportWhere(query: KpiQueryDto): Prisma.DiecutReportWhereInput {
    const where: Prisma.DiecutReportWhereInput = {
      deleted_at: null,
      reported_at: {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      },
    };

    if (query.machine_id) {
      where.machine_id = query.machine_id;
    }

    if (query.area_id) {
      where.machine = { is: { area_id: query.area_id } };
    }

    return where;
  }

  private toNumber(value: unknown) {
    const normalized = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(normalized) ? normalized : 0;
  }
}
