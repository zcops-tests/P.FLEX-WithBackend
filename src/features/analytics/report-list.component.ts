
import { Component, inject, ElementRef, viewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';
import { FileExportService } from '../../services/file-export.service';
import { NotificationService } from '../../services/notification.service';
import { BackendApiService } from '../../services/backend-api.service';

type D3Module = typeof import('d3');

interface TrendPoint {
  day: string;
  date: string;
  value: number;
}

interface WasteTableItem {
  ot: string;
  client: string;
  desc: string;
  total: number;
  waste: number;
  percentage: number;
}

interface AnalyticsStats {
  pending: number;
  inProgress: number;
  paused: number;
  completed: number;
  totalOrders: number;
  totalMeters: number;
  wastePercentage: number;
}

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex flex-col p-6 max-w-[1920px] mx-auto w-full overflow-hidden h-full bg-[#0f172a] text-slate-200">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 flex-shrink-0">
        <div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <span class="material-icons text-blue-500 text-2xl">analytics</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Indicadores de Producción</h1>
          </div>
          <p class="text-slate-400 text-sm mt-1 ml-12">Métricas clave de desempeño (KPIs) en tiempo real</p>
        </div>
        
        <div class="relative">
           <button (click)="showExportMenu = !showExportMenu" class="flex items-center gap-2 px-5 py-2.5 bg-[#1e293b] hover:bg-[#283547] border border-slate-600/50 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95">
              <span class="material-icons text-sm">download</span> Exportar Reporte
           </button>
           <!-- Dropdown -->
           <div *ngIf="showExportMenu" class="absolute right-0 mt-2 w-48 bg-[#1e293b] rounded-xl shadow-2xl border border-slate-700 z-50 overflow-hidden animate-fadeIn">
              <button (click)="exportPDF()" class="w-full text-left px-4 py-3 hover:bg-slate-700/50 flex items-center gap-2 text-xs font-medium text-slate-200 transition-colors">
                 <span class="material-icons text-red-400 text-base">picture_as_pdf</span> PDF (Visual)
              </button>
              <button (click)="exportExcel()" class="w-full text-left px-4 py-3 hover:bg-slate-700/50 flex items-center gap-2 text-xs font-medium text-slate-200 border-t border-slate-700/50 transition-colors">
                 <span class="material-icons text-emerald-400 text-base">grid_on</span> Excel (Datos)
              </button>
           </div>
        </div>
      </div>

      <div #reportContent class="space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div *ngIf="isLoading" class="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-100">
          Cargando indicadores reales de producción...
        </div>

        <!-- Top Stats Row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
           <!-- Efficiency -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eficiencia (OEE)</span>
                 <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-bold">Calidad {{ quality | number:'1.1-1' }}%</span>
              </div>
              <div class="text-4xl font-black text-white tracking-tight relative z-10">{{ oee | number:'1.1-1' }}%</div>
              <div class="w-full bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
                 <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="oee"></div>
              </div>
              <p class="text-[10px] text-slate-500 mt-2 font-mono">Meta: {{ oeeTarget }}% | Disponibilidad: {{ availability | number:'1.1-1' }}%</p>
           </div>

           <!-- Production -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Producción Total</span>
                 <span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-bold">7 días</span>
              </div>
              <div class="text-4xl font-black text-white tracking-tight relative z-10">{{ stats.totalMeters | number }} <span class="text-lg font-bold text-slate-500">m</span></div>
              <div class="flex items-center gap-2 mt-4">
                 <span class="material-icons text-blue-500 text-sm">check_circle</span>
                 <p class="text-xs text-blue-200 font-medium">{{ productionReportCount }} reportes registrados</p>
              </div>
           </div>

           <!-- Waste -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasa de Mermas</span>
                 <span class="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 rounded font-bold">30 días</span>
              </div>
              <div class="text-4xl font-black text-red-500 tracking-tight relative z-10">{{ stats.wastePercentage | number:'1.1-1' }}%</div>
              <div class="w-full bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
                 <div class="bg-red-500 h-full rounded-full" [style.width.%]="stats.wastePercentage"></div>
              </div>
              <p class="text-[10px] text-slate-500 mt-2 font-mono">Objetivo: < 3%</p>
           </div>

           <!-- Downtime -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiempo Muerto</span>
              </div>
              <div class="text-4xl font-black text-white tracking-tight relative z-10">{{ downtimeMinutes | number }} <span class="text-lg font-bold text-slate-500">min</span></div>
              <div class="mt-4 flex items-center gap-2">
                 <span class="material-icons text-purple-400 text-sm">timer</span>
                 <p class="text-xs text-purple-200 font-medium">{{ downtimeEvents }} eventos {{ topDowntimeProcess ? '· ' + topDowntimeProcess : '' }}</p>
              </div>
              <p class="text-[10px] text-slate-500 mt-2 font-mono text-right">Últimos 30 días</p>
           </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           <!-- Trend Chart -->
           <div class="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col">
              <h3 class="font-bold text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
                 <span class="material-icons text-blue-500 text-base">show_chart</span>
                 Tendencia de Producción (Metros Lineales)
              </h3>
              <div #trendChartContainer class="w-full flex-1 min-h-[250px]"></div>
           </div>

           <!-- Distribution Chart -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col items-center">
              <h3 class="font-bold text-white mb-4 w-full text-left text-sm uppercase tracking-wide flex items-center gap-2">
                 <span class="material-icons text-purple-500 text-base">pie_chart</span>
                 Estado de Órdenes
              </h3>
              <div #donutChartContainer class="w-full h-56 flex items-center justify-center my-auto"></div>
              
              <!-- Custom Legend -->
              <div class="grid grid-cols-2 gap-4 w-full mt-6 text-xs bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                 <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span class="text-slate-300 font-bold">Finalizadas ({{ stats.completed }})</span>
                 </div>
                 <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                    <span class="text-slate-300 font-bold">En Proceso ({{ stats.inProgress }})</span>
                 </div>
                 <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    <span class="text-slate-300 font-bold">Pendientes ({{ stats.pending }})</span>
                 </div>
                 <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                    <span class="text-slate-300 font-bold">Pausadas ({{ stats.paused }})</span>
                 </div>
              </div>
           </div>

        </div>

        <!-- Details Table -->
        <div class="bg-[#1e293b] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
           <div class="px-6 py-4 border-b border-slate-700 bg-[#020617]/30 flex justify-between items-center">
              <h3 class="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                 <span class="material-icons text-red-500 text-base">delete</span>
                 Mermas Críticas por Orden
              </h3>
              <button class="text-blue-400 text-xs font-bold hover:text-blue-300 hover:underline transition-colors">Ver reporte detallado</button>
           </div>
           <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                 <thead class="bg-[#0f172a] text-slate-400 font-bold border-b border-slate-700 text-[10px] uppercase tracking-wider">
                    <tr>
                       <th class="px-6 py-4">OT</th>
                       <th class="px-6 py-4">Cliente / Producto</th>
                       <th class="px-6 py-4 text-right">Total (m)</th>
                       <th class="px-6 py-4 text-right">Merma (m)</th>
                       <th class="px-6 py-4 text-right">% Desp.</th>
                       <th class="px-6 py-4 text-center">Nivel</th>
                    </tr>
                 </thead>
                 <tbody class="divide-y divide-slate-700/50 bg-[#1e293b]">
                    <tr *ngFor="let item of topWasteItems" class="hover:bg-slate-700/30 transition-colors group">
                       <td class="px-6 py-4 font-mono font-bold text-white">{{ item.ot }}</td>
                       <td class="px-6 py-4">
                          <div class="font-bold text-slate-200">{{ item.client }}</div>
                          <div class="text-xs text-slate-500 truncate max-w-[200px]">{{ item.desc }}</div>
                       </td>
                       <td class="px-6 py-4 text-right text-slate-400 font-mono">{{ item.total | number }}</td>
                       <td class="px-6 py-4 text-right font-bold text-red-400 font-mono">{{ item.waste | number }}</td>
                       <td class="px-6 py-4 text-right font-black text-white">{{ item.percentage }}%</td>
                       <td class="px-6 py-4 text-center">
                          <span class="px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 uppercase">ALTO</span>
                       </td>
                    </tr>
                    <tr *ngIf="!isLoading && topWasteItems.length === 0">
                       <td colspan="6" class="px-6 py-8 text-center text-sm text-slate-500">
                          No hay mermas registradas en el periodo consultado.
                       </td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `]
})
export class ReportListComponent implements OnInit, AfterViewInit {
  ordersService = inject(OrdersService);
  backend = inject(BackendApiService);
  fileExport = inject(FileExportService);
  notifications = inject(NotificationService);
  private d3ModulePromise?: Promise<D3Module>;
  private viewReady = false;
  readonly oeeTarget = 85;

  readonly trendChartContainer = viewChild<ElementRef>('trendChartContainer');
  readonly donutChartContainer = viewChild<ElementRef>('donutChartContainer');
  readonly reportContent = viewChild<ElementRef>('reportContent');

  showExportMenu = false;
  isLoading = true;
  stats: AnalyticsStats = {
    pending: 0,
    inProgress: 0,
    paused: 0,
    completed: 0,
    totalOrders: 0,
    totalMeters: 0,
    wastePercentage: 0,
  };
  oee = 0;
  availability = 0;
  performance = 0;
  quality = 0;
  downtimeMinutes = 0;
  downtimeEvents = 0;
  topDowntimeProcess = '';
  productionReportCount = 0;
  trendData: TrendPoint[] = this.buildEmptyTrendData();
  topWasteItems: WasteTableItem[] = [];

  async ngOnInit() {
    await this.loadDashboard();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.scheduleChartRender();
  }

  async exportExcel() {
    this.showExportMenu = false;
    await this.fileExport.preloadXlsx();
    const xlsx = this.fileExport.getXlsx();
    const wb = xlsx.utils.book_new();
    const XLSX = xlsx;
    const dateStr = new Date().toISOString().split('T')[0];

    const s = this.stats;
    const kpiData = [
        ['REPORTE DE INDICADORES DE PLANTA', dateStr],
        [''],
        ['METRICAS GENERALES'],
        ['Eficiencia Global (OEE)', `${this.oee.toFixed(1)}%`],
        ['Producción Total (m)', s.totalMeters],
        ['Tasa de Mermas (%)', `${s.wastePercentage.toFixed(1)}%`],
        ['Tiempo Muerto (min)', this.downtimeMinutes],
        ['Eventos de Parada', this.downtimeEvents],
        [''],
        ['ESTADO DE ORDENES'],
        ['Pendientes', s.pending],
        ['En Proceso', s.inProgress],
        ['Finalizados', s.completed],
        ['Pausadas', s.paused]
    ];
    const wsKPI = xlsx.utils.aoa_to_sheet(kpiData);
    xlsx.utils.book_append_sheet(wb, wsKPI, "KPIs Resumen");

    const wsTrend = xlsx.utils.json_to_sheet(this.trendData.map((point) => ({
      Fecha: point.date,
      Dia: point.day,
      'Produccion (m)': point.value,
    })));
    XLSX.utils.book_append_sheet(wb, wsTrend, "Tendencia Producción");

    const wasteData = this.topWasteItems.map(i => ({
        OT: i.ot,
        Cliente: i.client,
        Producto: i.desc,
        'Total (m)': i.total,
        'Merma (m)': i.waste,
        '% Desperdicio': i.percentage + '%'
    }));
    const wsWaste = XLSX.utils.json_to_sheet(wasteData);
    XLSX.utils.book_append_sheet(wb, wsWaste, "Mermas Críticas");

    await this.fileExport.writeWorkbook(wb, `KPI_Planta_${dateStr}.xlsx`);
  }

  async exportPDF() {
    this.showExportMenu = false;
    const el = this.reportContent(); // Access Signal
    if(!el) return;
    const element = el.nativeElement;

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await this.fileExport.exportElementToPdf(element, `Reporte_Grafico_KPI_${dateStr}.pdf`, {
        orientation: 'l',
        backgroundColor: '#0f172a',
      });

    } catch (error) {
      this.notifications.showError('Hubo un error al generar el PDF visual.');
    }
  }

  private async renderCharts() {
    const d3Any = await this.loadD3();
    this.renderTrendChart(d3Any);
    this.renderDonutChart(d3Any, this.stats);
  }

  private async loadD3() {
    if (!this.d3ModulePromise) {
      this.d3ModulePromise = import('d3');
    }

    return this.d3ModulePromise as Promise<any>;
  }

  renderTrendChart(d3Any: any) {
    const el = this.trendChartContainer();
    if (!el) return;

    const element = el.nativeElement;

    d3Any.select(element).selectAll('*').remove();

    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };

    const svg = d3Any.select(element)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const data = this.trendData;

    const x = d3Any.scaleBand()
        .range([margin.left, width - margin.right])
        .padding(0.4)
        .domain(data.map((d: any) => d.day));

    const maxValue = Math.max(...data.map((d: TrendPoint) => d.value), 0);
    const yMax = maxValue > 0 ? Math.ceil((maxValue * 1.15) / 1000) * 1000 : 1000;

    const y = d3Any.scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain([0, yMax]);

    svg.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', (d: any) => x(d.day))
        .attr('y', (d: any) => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', (d: any) => height - margin.bottom - y(d.value))
        .attr('fill', '#3b82f6') // Blue-500
        .attr('rx', 4);

    const average = data.length > 0
        ? data.reduce((acc: number, item: TrendPoint) => acc + item.value, 0) / data.length
        : 0;
    if (average > 0) {
      const targetY = y(average);
      svg.append('line')
         .attr('x1', margin.left)
         .attr('x2', width - margin.right)
         .attr('y1', targetY)
         .attr('y2', targetY)
         .attr('stroke', 'rgba(255,255,255,0.1)')
         .attr('stroke-width', 2)
         .attr('stroke-dasharray', '5,5');
    }

    // X Axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3Any.axisBottom(x).tickSize(0))
        .select('.domain').remove();

    // Y Axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3Any.axisLeft(y).ticks(5).tickFormat((d: any) => this.formatChartAxis(d.valueOf())))
        .select('.domain').remove();
    
    // Style text for Dark Mode
    svg.selectAll('text')
       .attr('fill', '#94a3b8') // Slate-400
       .attr('font-size', '10px')
       .attr('font-weight', 'bold');
       
    svg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.05)');
  }

  renderDonutChart(d3Any: any, stats: any) {
    const el = this.donutChartContainer();
    if (!el) return;

    const element = el.nativeElement;

    d3Any.select(element).selectAll('*').remove();

    const width = 250;
    const height = 250;
    const margin = 10;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3Any.select(element)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const baseData = {
        Finalizado: stats.completed,
        EnProceso: stats.inProgress,
        Pendiente: stats.pending,
        Pausada: stats.paused
    };
    const hasData = Object.values(baseData).some((value) => value > 0);
    const data = hasData ? baseData : { SinDatos: 1 };

    // Dark Mode Palette
    const color = d3Any.scaleOrdinal()
        .domain(['Finalizado', 'EnProceso', 'Pendiente', 'Pausada', 'SinDatos'])
        .range(['#10b981', '#3b82f6', '#64748b', '#f59e0b', '#334155']);

    const pie = d3Any.pie()
        .value((d: any) => d[1])
        .sort(null);

    const data_ready = pie(Object.entries(data));

    const arc = d3Any.arc()
        .innerRadius(radius * 0.65)
        .outerRadius(radius)
        .cornerRadius(6);

    svg.selectAll('allSlices')
        .data(data_ready)
        .join('path')
        .attr('d', arc)
        .attr('fill', (d: any) => color(d.data[0]))
        .attr('stroke', '#1e293b') // Stroke matches background color to create gap
        .style('stroke-width', '4px')
        .style('opacity', 1)
        .on('mouseover', function(this: any) { d3Any.select(this).style('opacity', 0.8); })
        .on('mouseout', function(this: any) { d3Any.select(this).style('opacity', 1); });
        
    // Center Text
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("y", -5)
       .attr("font-size", "24px")
       .attr("font-weight", "bold")
       .attr("fill", "#ffffff")
       .text(String(stats.totalOrders || 0));
       
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("y", 20)
       .attr("font-size", "12px")
       .attr("fill", "#94a3b8")
       .text("Órdenes");
  }

  private async loadDashboard() {
    const trendRange = this.buildDateRange(7);
    const kpiRange = this.buildDateRange(30);

    this.isLoading = true;

    try {
      const orders = await this.ordersService.loadAllOrdersSnapshot();

      const [oeeResponse, wasteResponse, downtimeResponse, printResponse] = await Promise.all([
        this.backend.getAnalyticsOee({
          start_date: kpiRange.start,
          end_date: kpiRange.end,
        }),
        this.backend.getAnalyticsWaste({
          start_date: kpiRange.start,
          end_date: kpiRange.end,
        }),
        this.backend.getAnalyticsDowntime({
          start_date: kpiRange.start,
          end_date: kpiRange.end,
        }),
        this.backend.getPrintReports({
          page: 1,
          pageSize: 500,
          startDate: trendRange.start,
          endDate: trendRange.end,
        }),
      ]);

      const printReports = Array.isArray(printResponse?.items) ? printResponse.items : [];
      const wasteItems = (Array.isArray(wasteResponse?.items) ? wasteResponse.items : [])
        .map((item: any) => ({
          ot: String(item.ot || ''),
          client: item.client || '',
          desc: item.description || '',
          total: Math.round(this.toNumber(item.total)),
          waste: Math.round(this.toNumber(item.waste)),
          percentage: Number(this.toNumber(item.percentage).toFixed(1)),
        }))
        .filter((item) => item.total > 0);
      const downtimeItems = Array.isArray(downtimeResponse?.items) ? downtimeResponse.items : [];

      this.trendData = this.buildTrendData(printReports);
      this.productionReportCount = printReports.length;
      this.oee = this.toPercent(oeeResponse?.oee);
      this.availability = this.toPercent(oeeResponse?.availability);
      this.performance = this.toPercent(oeeResponse?.performance);
      this.quality = this.toPercent(oeeResponse?.quality);
      this.topWasteItems = wasteItems.slice(0, 5);
      this.downtimeMinutes = Math.round(downtimeItems.reduce((acc: number, item: any) => acc + this.toNumber(item.totalMinutes), 0));
      this.downtimeEvents = downtimeItems.reduce((acc: number, item: any) => acc + Number(item.events || 0), 0);
      this.topDowntimeProcess = downtimeItems[0]?.process || '';

      const totalMeters = this.trendData.reduce((acc, point) => acc + point.value, 0);
      const wastePercentage = this.resolveWastePercentage(wasteResponse?.summary, wasteItems);
      this.stats = this.buildStats(orders, totalMeters, wastePercentage);
    } catch {
      this.notifications.showError('No se pudieron cargar los indicadores reales de producción.');
      this.trendData = this.buildEmptyTrendData();
      this.topWasteItems = [];
      this.stats = this.buildStats([], 0, 0);
      this.oee = 0;
      this.availability = 0;
      this.performance = 0;
      this.quality = 0;
      this.downtimeMinutes = 0;
      this.downtimeEvents = 0;
      this.topDowntimeProcess = '';
      this.productionReportCount = 0;
    } finally {
      this.isLoading = false;
      this.scheduleChartRender();
    }
  }

  private scheduleChartRender() {
    if (!this.viewReady) return;
    setTimeout(() => {
      void this.renderCharts();
    }, 50);
  }

  private buildStats(orders: Partial<OT>[], totalMeters: number, wastePercentage: number): AnalyticsStats {
    const pending = orders.filter((order) => this.normalizeStatus(order.Estado_pedido) === 'PENDIENTE').length;
    const inProgress = orders.filter((order) => this.normalizeStatus(order.Estado_pedido) === 'EN PROCESO').length;
    const paused = orders.filter((order) => this.normalizeStatus(order.Estado_pedido) === 'PAUSADA').length;
    const completed = orders.filter((order) => this.normalizeStatus(order.Estado_pedido) === 'FINALIZADO').length;

    return {
      pending,
      inProgress,
      paused,
      completed,
      totalOrders: orders.length,
      totalMeters: Math.round(totalMeters),
      wastePercentage: Number(wastePercentage.toFixed(1)),
    };
  }

  private buildTrendData(reports: any[]): TrendPoint[] {
    const days = this.buildEmptyTrendData();
    const totals = new Map(days.map((day) => [day.date, 0]));

    reports.forEach((report: any) => {
      const parsed = new Date(report.reported_at || report.date || report.created_at || '');
      if (Number.isNaN(parsed.getTime())) return;
      const key = parsed.toISOString().slice(0, 10);
      if (!totals.has(key)) return;
      totals.set(key, totals.get(key)! + this.toNumber(report.totalMeters ?? report.total_meters));
    });

    return days.map((day) => ({
      ...day,
      value: Math.round(totals.get(day.date) || 0),
    }));
  }

  private buildEmptyTrendData(): TrendPoint[] {
    const formatter = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' });
    const today = new Date();
    const points: TrendPoint[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      date.setUTCDate(date.getUTCDate() - offset);
      const label = formatter.format(date).replace('.', '');
      points.push({
        day: label.charAt(0).toUpperCase() + label.slice(1),
        date: date.toISOString().slice(0, 10),
        value: 0,
      });
    }

    return points;
  }

  private resolveWastePercentage(summary: string | undefined, items: WasteTableItem[]) {
    const match = String(summary || '').match(/\(([\d.]+)%\)/);
    if (match) {
      return Number(match[1]);
    }

    const total = items.reduce((acc, item) => acc + item.total, 0);
    const waste = items.reduce((acc, item) => acc + item.waste, 0);
    return total > 0 ? (waste / total) * 100 : 0;
  }

  private buildDateRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  private normalizeStatus(value: unknown) {
    return String(value || '').trim().toUpperCase();
  }

  private toNumber(value: unknown) {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toPercent(value: unknown) {
    return Number((this.toNumber(value) * 100).toFixed(1));
  }

  private formatChartAxis(value: number) {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}k`;
    }

    return String(Math.round(value));
  }
}
