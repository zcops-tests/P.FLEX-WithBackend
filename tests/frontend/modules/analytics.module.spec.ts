import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ReportListComponent } from '../../../src/features/analytics/report-list.component';

const source = readFileSync(resolve(process.cwd(), 'src/features/analytics/report-list.component.ts'), 'utf8');

test('analytics module smoke imports report list component', () => {
  assert.equal(typeof ReportListComponent, 'function');
});

test('analytics module includes KPI/report and export functionality', () => {
  assert.match(source, /analytics/i);
  assert.match(source, /exportExcel/);
  assert.match(source, /KPI|kpi/i);
});

function createAnalyticsComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(ReportListComponent.prototype) as ReportListComponent & Record<string, any>;
  const exportCalls: any[] = [];
  const notifications = {
    errors: [] as string[],
    showError(message: string) { this.errors.push(message); },
  };

  Object.assign(component, {
    stats: {
      pending: 0,
      inProgress: 0,
      paused: 0,
      completed: 0,
      totalOrders: 0,
      totalMeters: 0,
      wastePercentage: 0,
    },
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0,
    downtimeMinutes: 0,
    downtimeEvents: 0,
    topDowntimeProcess: '',
    productionReportCount: 0,
    trendData: [],
    topWasteItems: [],
    showExportMenu: true,
    fileExport: {
      preloadXlsx: async () => undefined,
      getXlsx: () => ({
        utils: {
          book_new: () => ({ sheets: [] }),
          aoa_to_sheet: (data: any) => data,
          json_to_sheet: (data: any) => data,
          book_append_sheet: (wb: any, ws: any, name: string) => {
            wb.sheets.push({ name, ws });
          },
        },
      }),
      writeWorkbook: async (...args: any[]) => { exportCalls.push(['xlsx', ...args]); },
      exportElementToPdf: async (...args: any[]) => { exportCalls.push(['pdf', ...args]); },
    },
    reportContent: () => ({ nativeElement: { id: 'report-content' } }),
    notifications,
    ...overrides,
  });

  return { component, exportCalls, notifications };
}

test('analytics module computes order stats, trend data and waste percentage from backend-shaped data', () => {
  const { component } = createAnalyticsComponent();

  const stats = component['buildStats'](
    [
      { Estado_pedido: 'PENDIENTE' },
      { Estado_pedido: 'EN PROCESO' },
      { Estado_pedido: 'PAUSADA' },
      { Estado_pedido: 'FINALIZADO' },
      { Estado_pedido: 'FINALIZADO' },
    ],
    3200,
    4.44,
  );

  assert.deepEqual(stats, {
    pending: 1,
    inProgress: 1,
    paused: 1,
    completed: 2,
    totalOrders: 5,
    totalMeters: 3200,
    wastePercentage: 4.4,
  });

  const emptyTrend = component['buildEmptyTrendData']();
  const trend = component['buildTrendData']([
    { reported_at: `${emptyTrend[0].date}T12:00:00.000Z`, totalMeters: 1000 },
    { date: `${emptyTrend[0].date}T16:00:00.000Z`, total_meters: 500 },
    { reported_at: 'invalid-date', totalMeters: 999 },
  ]);
  assert.equal(trend.length, 7);
  assert.equal(trend[0].value, 1500);

  assert.equal(component['resolveWastePercentage']('Merma (2.5%)', []), 2.5);
  assert.equal(component['resolveWastePercentage']('', [{ total: 1000, waste: 50 }, { total: 500, waste: 25 }]), 5);
});

test('analytics module formats percentages and exports both PDF and Excel', async () => {
  const { component, exportCalls } = createAnalyticsComponent({
    stats: {
      pending: 1,
      inProgress: 2,
      paused: 0,
      completed: 3,
      totalOrders: 6,
      totalMeters: 4500,
      wastePercentage: 2.3,
    },
    oee: 82.1,
    downtimeMinutes: 30,
    downtimeEvents: 2,
    trendData: [{ date: '2026-04-05', day: 'Dom', value: 2000 }],
    topWasteItems: [{ ot: 'OT-1', client: 'Cliente', desc: 'Trabajo', total: 1000, waste: 40, percentage: 4 }],
  });

  assert.equal(component['toPercent'](0.823), 82.3);
  assert.equal(component['formatChartAxis'](2000), '2k');
  assert.equal(component['formatChartAxis'](950), '950');

  await component.exportExcel();
  await component.exportPDF();

  assert.equal(component.showExportMenu, false);
  assert.equal(exportCalls.filter((call) => call[0] === 'xlsx').length, 1);
  assert.equal(exportCalls.filter((call) => call[0] === 'pdf').length, 1);
});
