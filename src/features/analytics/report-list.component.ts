
import { Component, inject, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService } from '../orders/services/orders.service';
import { OT } from '../orders/models/orders.models';
import { FileExportService } from '../../services/file-export.service';
import { NotificationService } from '../../services/notification.service';

type D3Module = typeof import('d3');

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
        <!-- Top Stats Row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
           <!-- Efficiency -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eficiencia (OEE)</span>
                 <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-bold">+2.4%</span>
              </div>
              <div class="text-4xl font-black text-white tracking-tight relative z-10">84.2%</div>
              <div class="w-full bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
                 <div class="bg-emerald-500 h-full rounded-full" style="width: 84.2%"></div>
              </div>
              <p class="text-[10px] text-slate-500 mt-2 font-mono">Meta: 85%</p>
           </div>

           <!-- Production -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Producción Total</span>
                 <span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-bold">Hoy</span>
              </div>
              <div class="text-4xl font-black text-white tracking-tight relative z-10">{{ stats.totalMeters | number }} <span class="text-lg font-bold text-slate-500">m</span></div>
              <div class="flex items-center gap-2 mt-4">
                 <span class="material-icons text-blue-500 text-sm">check_circle</span>
                 <p class="text-xs text-blue-200 font-medium">12 Órdenes Finalizadas</p>
              </div>
           </div>

           <!-- Waste -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasa de Mermas</span>
                 <span class="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 rounded font-bold">Crítico</span>
              </div>
              <div class="text-4xl font-black text-red-500 tracking-tight relative z-10">{{ stats.wastePercentage }}%</div>
              <div class="w-full bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
                 <div class="bg-red-500 h-full rounded-full" [style.width.%]="stats.wastePercentage"></div>
              </div>
              <p class="text-[10px] text-slate-500 mt-2 font-mono">Objetivo: < 3%</p>
           </div>

           <!-- OTD -->
           <div class="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div class="flex justify-between items-start mb-3 relative z-10">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entregas a Tiempo</span>
              </div>
              <div class="text-4xl font-black text-white tracking-tight relative z-10">95.8%</div>
              <div class="mt-4 flex -space-x-2">
                 <div class="w-6 h-6 rounded-full bg-slate-600 border border-[#1e293b]"></div>
                 <div class="w-6 h-6 rounded-full bg-slate-500 border border-[#1e293b]"></div>
                 <div class="w-6 h-6 rounded-full bg-slate-400 border border-[#1e293b]"></div>
                 <div class="w-6 h-6 rounded-full bg-purple-500 border border-[#1e293b] flex items-center justify-center text-[8px] font-bold">+</div>
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
export class ReportListComponent implements AfterViewInit {
  ordersService = inject(OrdersService);
  fileExport = inject(FileExportService);
  notifications = inject(NotificationService);
  private d3ModulePromise?: Promise<D3Module>;

  readonly trendChartContainer = viewChild<ElementRef>('trendChartContainer');
  readonly donutChartContainer = viewChild<ElementRef>('donutChartContainer');
  readonly reportContent = viewChild<ElementRef>('reportContent');

  showExportMenu = false;

  trendData = [
      { day: 'Lun', value: 18500 },
      { day: 'Mar', value: 22400 },
      { day: 'Mié', value: 35000 },
      { day: 'Jue', value: 28900 },
      { day: 'Vie', value: 31200 },
      { day: 'Sáb', value: 15600 },
      { day: 'Dom', value: 8000 }
  ];

  get stats() {
    const ots = this.ordersService.ots;
    
    const pending = ots.filter(o => o.Estado_pedido === 'PENDIENTE').length;
    const inProgress = ots.filter(o => o.Estado_pedido === 'EN PROCESO').length;
    const paused = ots.filter(o => o.Estado_pedido === 'PAUSADA').length;
    const completed = ots.filter(o => o.Estado_pedido === 'FINALIZADO').length;

    let totalMeters = 0;
    let totalWaste = 0;

    ots.forEach(ot => {
        const mtl = parseFloat(String(ot.total_mtl || '0').replace(/,/g, ''));
        const waste = parseFloat(String(ot.merma || '0').replace(/,/g, ''));
        
        const qty = parseFloat(String(ot['CANT PED'] || '0'));
        const simulatedMeters = mtl > 0 ? mtl : (qty > 0 ? qty * 0.1 : 0);
        const simulatedWaste = waste > 0 ? waste : simulatedMeters * (0.02 + Math.random() * 0.03);

        if (ot.Estado_pedido !== 'PENDIENTE') {
            totalMeters += simulatedMeters;
            totalWaste += simulatedWaste;
        }
    });

    const wastePercentage = totalMeters > 0 ? ((totalWaste / totalMeters) * 100).toFixed(1) : '0.0';

    return {
        pending,
        inProgress,
        paused,
        completed,
        totalMeters: Math.round(totalMeters),
        wastePercentage
    };
  }

  get topWasteItems() {
     return this.ordersService.ots
        .filter(ot => ot.Estado_pedido === 'FINALIZADO' || ot.Estado_pedido === 'EN PROCESO')
        .map(ot => {
            const mtl = parseFloat(String(ot.total_mtl || '0')) || parseFloat(String(ot['CANT PED'] || '0')) * 0.1 || 5000;
            const waste = parseFloat(String(ot.merma || '0')) || (mtl * (Math.random() * 0.1)); 
            const percentage = ((waste / mtl) * 100).toFixed(1);
            
            return {
                ot: ot.OT,
                client: ot['Razon Social'],
                desc: ot.descripcion,
                total: Math.round(mtl),
                waste: Math.round(waste),
                percentage: parseFloat(percentage)
            };
        })
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      void this.renderCharts();
    }, 100);
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
        ['Eficiencia Global (OEE)', '84.2%'],
        ['Producción Total (m)', s.totalMeters],
        ['Tasa de Mermas (%)', s.wastePercentage + '%'],
        ['Pedidos a Tiempo (OTD)', '95.8%'],
        [''],
        ['ESTADO DE ORDENES'],
        ['Pendientes', s.pending],
        ['En Proceso', s.inProgress],
        ['Finalizados', s.completed],
        ['Pausadas', s.paused]
    ];
    const wsKPI = xlsx.utils.aoa_to_sheet(kpiData);
    xlsx.utils.book_append_sheet(wb, wsKPI, "KPIs Resumen");

    const wsTrend = xlsx.utils.json_to_sheet(this.trendData);
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

    const y = d3Any.scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain([0, 50000]);

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

    const targetY = y(35000);
    svg.append('line')
       .attr('x1', margin.left)
       .attr('x2', width - margin.right)
       .attr('y1', targetY)
       .attr('y2', targetY)
       .attr('stroke', 'rgba(255,255,255,0.1)') // Light grid line
       .attr('stroke-width', 2)
       .attr('stroke-dasharray', '5,5');

    // X Axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3Any.axisBottom(x).tickSize(0))
        .select('.domain').remove();

    // Y Axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3Any.axisLeft(y).ticks(5).tickFormat((d: any) => `${d.valueOf() / 1000}k`))
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

    const data = {
        Finalizado: stats.completed,
        EnProceso: stats.inProgress,
        Pendiente: stats.pending,
        Pausada: stats.paused
    };

    // Dark Mode Palette
    const color = d3Any.scaleOrdinal()
        .domain(['Finalizado', 'EnProceso', 'Pendiente', 'Pausada'])
        .range(['#10b981', '#3b82f6', '#64748b', '#f59e0b']); // Emerald, Blue, Slate, Amber

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
       .text(stats.totalMeters > 0 ? "Total" : "0");
       
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("y", 20)
       .attr("font-size", "12px")
       .attr("fill", "#94a3b8")
       .text("Órdenes");
  }
}
