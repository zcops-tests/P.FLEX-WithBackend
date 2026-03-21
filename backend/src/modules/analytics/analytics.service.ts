import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { KpiQueryDto } from './dto/kpi.dto';
import { Prisma } from '@prisma/client';

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
      return { oee: 0, availability: 0, performance: 0, quality: 0, items: [] };
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
    // Waste trends and distribution
    return { summary: 'Waste analysis not yet fully implemented', items: [] };
  }

  async getDowntime(query: KpiQueryDto) {
    // Pareto of downtime reasons
    return { summary: 'Downtime Pareto not yet fully implemented', items: [] };
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
}
