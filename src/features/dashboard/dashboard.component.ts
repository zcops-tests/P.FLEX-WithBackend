import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OtDetailComponent } from '../orders/components/ot-detail.component';
import { OT } from '../orders/models/orders.models';
import { OrdersService } from '../orders/services/orders.service';
import { QualityService } from '../quality/services/quality.service';
import { ProductionService } from '../reports/services/production.service';
import { AuditService } from '../../services/audit.service';
import { FileExportService } from '../../services/file-export.service';
import { NotificationService } from '../../services/notification.service';
import { StateService } from '../../services/state.service';

type DashboardFeedTab = 'ALL' | 'PRODUCTION' | 'ALERTS' | 'PLANT';
type DashboardFeedType = Exclude<DashboardFeedTab, 'ALL'>;

interface DashboardFeedItem {
  id: string;
  type: DashboardFeedType;
  title: string;
  description: string;
  meta: string;
  machine?: string;
  route?: string;
  actionLabel?: string;
  ot?: OT;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, OtDetailComponent],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200 font-sans">
      @if (selectedOt) {
        <app-ot-detail [ot]="selectedOt" (close)="selectedOt = null"></app-ot-detail>
      }

      <div #dashboardContent class="mx-auto max-w-[1800px] space-y-6">
        <header class="glassmorphism-card relative flex flex-col gap-6 overflow-hidden rounded-3xl p-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="pointer-events-none absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl"></div>

          <div class="relative z-10 flex items-center gap-5">
            <div class="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <span class="material-symbols-outlined text-3xl text-blue-400">analytics</span>
            </div>
            <div>
              <h1 class="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
                CENTRO DE CONTROL
                <span class="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
                  En vivo
                </span>
              </h1>
              <p class="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                LABEL PERU SAC
                <span class="text-slate-600">•</span>
                {{ state.currentShift() | uppercase }}
                <span class="text-slate-600">•</span>
                {{ now | date:'HH:mm:ss' }}
              </p>
            </div>
          </div>

          <div class="relative z-10 flex items-center gap-3">
            <div class="hidden items-center gap-6 border-r border-white/10 pr-6 xl:flex">
              <div class="text-right">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sistema</p>
                <p class="text-sm font-bold text-emerald-400">{{ machineMetrics.attention ? 'Con observaciones' : 'Operativo' }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sync</p>
                <p class="text-sm font-bold text-blue-400">{{ syncStatusLabel }}</p>
              </div>
            </div>

            <div class="relative">
              <button
                type="button"
                (click)="showExportMenu = !showExportMenu"
                class="flex items-center gap-2 rounded-xl border border-blue-500/50 bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500">
                <span class="material-symbols-outlined text-sm">ios_share</span>
                Exportar
              </button>
              @if (showExportMenu) {
                <div class="animate-fadeIn absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1e293b] shadow-xl">
                  <button type="button" (click)="exportToPdf()" class="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                    <span class="material-symbols-outlined text-sm text-red-400">picture_as_pdf</span>
                    PDF visual
                  </button>
                  <button type="button" (click)="exportToExcel()" class="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                    <span class="material-symbols-outlined text-sm text-emerald-400">table_view</span>
                    Excel datos
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          @for (card of cards; track card.label) {
            <button
              type="button"
              (click)="openRoute(card.route)"
              [disabled]="!card.route"
              class="glassmorphism-card rounded-2xl p-4 text-left transition-all hover:bg-white/5 disabled:cursor-default">
              <div class="mb-2 flex items-start justify-between text-slate-500">
                <span class="text-[10px] font-bold uppercase tracking-widest" [ngClass]="card.accent">{{ card.label }}</span>
                <span class="material-symbols-outlined text-sm" [ngClass]="card.accent">{{ card.icon }}</span>
              </div>
              <div class="text-2xl font-bold tracking-tight text-white">{{ card.value }}</div>
              <div class="mt-1 text-[10px] font-medium text-slate-400">{{ card.meta }}</div>
            </button>
          }
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <section class="glassmorphism-card flex h-[600px] flex-col overflow-hidden rounded-3xl lg:col-span-3">
            <div class="flex items-center justify-between border-b border-white/5 bg-white/5 p-5">
              <div class="flex items-center gap-4">
                <h2 class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                  <span class="material-symbols-outlined text-lg text-blue-400">reorder</span>
                  Feed operativo
                </h2>
                <div class="hidden rounded-xl border border-white/5 bg-black/20 p-1 sm:flex">
                  <button type="button" (click)="activeFeedTab = 'ALL'" class="rounded-lg px-3 py-1 text-[10px] font-bold" [ngClass]="activeFeedTab === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'">Todo</button>
                  <button type="button" (click)="activeFeedTab = 'PRODUCTION'" class="rounded-lg px-3 py-1 text-[10px] font-bold" [ngClass]="activeFeedTab === 'PRODUCTION' ? 'bg-blue-500/40 text-white' : 'text-slate-400 hover:text-white'">Producción</button>
                  <button type="button" (click)="activeFeedTab = 'ALERTS'" class="rounded-lg px-3 py-1 text-[10px] font-bold" [ngClass]="activeFeedTab === 'ALERTS' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'">Alertas</button>
                  <button type="button" (click)="activeFeedTab = 'PLANT'" class="rounded-lg px-3 py-1 text-[10px] font-bold" [ngClass]="activeFeedTab === 'PLANT' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'">Planta</button>
                </div>
              </div>
              <span class="text-[10px] font-medium text-slate-500">{{ filteredFeed.length }} items</span>
            </div>

            <div class="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
              @if (isLoadingDashboard && !feedItems.length) {
                <div class="flex h-full flex-col items-center justify-center p-12 text-center text-slate-500">
                  <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <span class="material-symbols-outlined text-3xl opacity-60">progress_activity</span>
                  </div>
                  <p class="text-sm font-medium text-slate-300">Sincronizando resumen operativo...</p>
                </div>
              } @else {
                @for (item of filteredFeed; track item.id) {
                  @if (item.type === 'PRODUCTION') {
                    <button type="button" (click)="openOtDetail(item.ot)" class="flex w-full gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:border-white/10 hover:bg-white/10">
                      <div class="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                        <span class="material-symbols-outlined text-xl">conveyor_belt</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="mb-1 flex items-start justify-between gap-3">
                          <span class="text-sm font-bold tracking-tight text-white">{{ item.title }}</span>
                          <span class="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-300">En proceso</span>
                        </div>
                        <p class="mb-2 text-xs text-slate-400">{{ item.description }}</p>
                        <div class="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                          <span>Máquina: <span class="text-slate-300">{{ item.machine }}</span></span>
                          <span class="text-slate-600">•</span>
                          <span>{{ item.meta }}</span>
                        </div>
                      </div>
                    </button>
                  } @else {
                    <div class="rounded-2xl border p-4" [ngClass]="getFeedToneClasses(item.type)">
                      <div class="flex gap-4">
                        <div class="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-current/20 bg-black/10">
                          <span class="material-symbols-outlined text-xl">{{ item.type === 'ALERTS' ? 'warning' : 'manufacturing' }}</span>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="mb-1 flex items-start justify-between gap-3">
                            <span class="text-sm font-bold text-white">{{ item.title }}</span>
                            <span class="text-[10px] font-mono text-slate-500">{{ item.meta }}</span>
                          </div>
                          <p class="text-xs text-slate-300/90">{{ item.description }}</p>
                          @if (item.machine) {
                            <p class="mt-2 text-[11px] font-medium text-slate-400">Máquina: <span class="text-slate-200">{{ item.machine }}</span></p>
                          }
                        </div>
                        @if (item.route && item.actionLabel) {
                          <div class="flex items-center">
                            <button type="button" (click)="openRoute(item.route)" class="rounded-lg border border-current/20 bg-black/10 px-4 py-1.5 text-[10px] font-bold tracking-wide text-current">
                              {{ item.actionLabel }}
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                }

                @if (!filteredFeed.length) {
                  <div class="flex h-full flex-col items-center justify-center p-12 text-center text-slate-500">
                    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                      <span class="material-symbols-outlined text-3xl opacity-50">playlist_remove</span>
                    </div>
                    <p class="text-sm font-medium text-slate-300">No hay actividad para esta categoría.</p>
                  </div>
                }
              }
            </div>

            @if (feedFooterRoute) {
              <div class="border-t border-white/5 bg-white/5 p-4">
                <button type="button" (click)="openRoute(feedFooterRoute)" class="mx-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:text-white">
                  {{ feedFooterLabel }}
                  <span class="material-symbols-outlined text-sm">open_in_new</span>
                </button>
              </div>
            }
          </section>

          <aside class="space-y-6">
            <section class="glassmorphism-card rounded-3xl p-5">
              <h2 class="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
                <span class="material-symbols-outlined text-sm text-blue-400">bolt</span>
                Acciones rápidas
              </h2>
              <div class="grid grid-cols-2 gap-3">
                @for (action of quickActions; track action.route) {
                  <button type="button" (click)="openRoute(action.route)" class="rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:bg-white/10">
                    <span class="material-symbols-outlined text-2xl" [ngClass]="action.accent">{{ action.icon }}</span>
                    <div class="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-200">{{ action.label }}</div>
                    <div class="mt-1 text-[11px] text-slate-500">{{ action.meta }}</div>
                  </button>
                }
              </div>
            </section>

            <section class="glassmorphism-card rounded-3xl p-5">
              <div class="mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm text-amber-400">precision_manufacturing</span>
                <h2 class="text-xs font-bold uppercase tracking-widest text-slate-300">Planta</h2>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] uppercase tracking-widest text-slate-500">Operativas</div>
                  <div class="mt-1 text-lg font-bold text-emerald-400">{{ machineMetrics.operational }}</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] uppercase tracking-widest text-slate-500">Atención</div>
                  <div class="mt-1 text-lg font-bold text-amber-300">{{ machineMetrics.attention }}</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] uppercase tracking-widest text-slate-500">Total</div>
                  <div class="mt-1 text-lg font-bold text-white">{{ machineMetrics.total }}</div>
                </div>
              </div>
              <div class="mt-4 space-y-2">
                @for (machine of machineAttention; track machine.id) {
                  <div class="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                    <div>
                      <div class="text-xs font-bold text-white">{{ machine.name }}</div>
                      <div class="text-[10px] uppercase tracking-widest text-slate-500">{{ machine.code || 'SIN-COD' }}</div>
                    </div>
                    <span class="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide" [ngClass]="getMachineStatusClass(machine.status)">{{ machine.status }}</span>
                  </div>
                }
                @if (!machineAttention.length) {
                  <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs font-medium text-emerald-300">
                    No hay máquinas fuera del estado operativo normal.
                  </div>
                }
              </div>
            </section>

            <section class="rounded-3xl border border-white/5 bg-black/20 p-5 backdrop-blur-sm">
              <div class="mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm text-slate-500">terminal</span>
                <h2 class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Logs del sistema</h2>
              </div>
              <div class="space-y-2 font-mono text-[9px] text-slate-400">
                @for (log of systemLogs; track log.id) {
                  <p class="flex gap-2">
                    <span class="font-bold text-blue-500">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                    <span class="truncate text-slate-300">{{ log.action }} - {{ log.details | slice:0:44 }}</span>
                  </p>
                }
                @if (!systemLogs.length) {
                  <p class="italic text-slate-600">Esperando actividad...</p>
                }
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glassmorphism-card { @apply border border-white/10 bg-white/5 shadow-lg backdrop-blur-xl; }
    .bg-gradient-mesh {
      background-color: #0b0e14;
      background-image:
        radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%),
        radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%),
        radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 999px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.22); }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  qualityService = inject(QualityService);
  production = inject(ProductionService);
  audit = inject(AuditService);
  router = inject(Router);
  fileExport = inject(FileExportService);
  notifications = inject(NotificationService);

  @ViewChild('dashboardContent') dashboardContent!: ElementRef<HTMLElement>;

  showExportMenu = false;
  selectedOt: OT | null = null;
  now = new Date();
  activeFeedTab: DashboardFeedTab = 'ALL';
  isLoadingDashboard = true;

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.clockInterval = setInterval(() => {
      this.now = new Date();
    }, 1000);

    void this.loadDashboardData();
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  get cards() {
    return [
      {
        label: 'Reportes cargados',
        value: this.reportMetrics.totalReports,
        meta: 'Impresión, troquelado, rebobinado y empaquetado',
        accent: 'text-blue-400',
        icon: 'assignment_turned_in',
      },
      {
        label: 'OTs activas',
        value: this.activeProduction.length,
        meta: `${this.stats.pending} pendientes en gestión`,
        accent: 'text-blue-400',
        icon: 'settings_input_component',
      },
      {
        label: 'Incidencias',
        value: this.activeIncidentsCount,
        meta: `${this.highPriorityCount} de prioridad alta`,
        accent: 'text-red-400',
        icon: 'report',
        route: '/incidents',
      },
      {
        label: 'Metros registrados',
        value: this.reportMetrics.totalMeters.toLocaleString('es-PE'),
        meta: 'Impresión + rebobinado + empaquetado',
        accent: 'text-emerald-400',
        icon: 'straighten',
      },
      {
        label: 'Máquinas en atención',
        value: this.machineMetrics.attention,
        meta: `${this.machineMetrics.operational} operativas de ${this.machineMetrics.total}`,
        accent: 'text-amber-400',
        icon: 'precision_manufacturing',
      },
      {
        label: 'Cola sync',
        value: this.state.pendingSyncCount(),
        meta: this.syncStatusLabel,
        accent: 'text-violet-400',
        icon: 'cloud_sync',
        route: '/sync',
      },
    ];
  }

  get quickActions() {
    return [
      { route: '/ots', icon: 'assignment', label: 'Gestión OTs', meta: 'Administrar órdenes activas.', permission: 'workorders.view', accent: 'text-blue-400' },
      { route: '/reports/print', icon: 'description', label: 'Reportes', meta: 'Consultar producción real.', permission: 'reports.print.view', accent: 'text-emerald-400' },
      { route: '/incidents', icon: 'report_problem', label: 'Incidencias', meta: 'Abrir calidad.', permission: 'quality.incidents.view', accent: 'text-red-400' },
      { route: '/sync', icon: 'cloud_sync', label: 'Sincronización', meta: 'Revisar cola y errores.', permission: 'sync.manage', accent: 'text-violet-400' },
    ].filter((action) => this.state.hasPermission(action.permission));
  }

  get activeProduction() {
    return this.ordersService.ots
      .filter((ot) => String(ot.Estado_pedido || '').toUpperCase() === 'EN PROCESO')
      .slice(0, 6) as OT[];
  }

  get activeIncidentsCount() {
    return this.qualityService.activeIncidents.length;
  }

  get highPriorityCount() {
    return this.qualityService.activeIncidents.filter((incident) => incident.priority === 'Alta').length;
  }

  get stats() {
    return {
      pending: this.ordersService.ots.filter((ot) => String(ot.Estado_pedido || '').toUpperCase() === 'PENDIENTE').length,
    };
  }

  get reportMetrics() {
    const printMeters = this.production.printReports.reduce((acc, report) => acc + report.totalMeters, 0);
    const rewindMeters = this.production.rewindReports.reduce((acc, report) => acc + report.meters, 0);
    const packagingMeters = this.production.packagingReports.reduce((acc, report) => acc + report.meters, 0);

    return {
      totalReports:
        this.production.printReports.length
        + this.production.diecutReports.length
        + this.production.rewindReports.length
        + this.production.packagingReports.length,
      totalMeters: printMeters + rewindMeters + packagingMeters,
    };
  }

  get machineAttention() {
    return this.state.adminMachines()
      .filter((machine) => !machine.active || machine.status !== 'Activo')
      .slice(0, 5);
  }

  get machineMetrics() {
    const machines = this.state.adminMachines();
    return {
      total: machines.length,
      operational: machines.filter((machine) => machine.active && machine.status === 'Activo').length,
      attention: machines.filter((machine) => !machine.active || machine.status !== 'Activo').length,
    };
  }

  get systemLogs() {
    return this.audit.logs().slice(0, 6);
  }

  get syncStatusLabel() {
    const pending = this.state.pendingSyncCount();
    if (pending > 0) return `${pending} pendientes`;

    switch (this.state.syncStatus()) {
      case 'offline':
        return 'Sin conexión';
      case 'syncing':
        return 'Sincronizando';
      case 'conflict':
        return 'Con conflicto';
      default:
        return 'Al día';
    }
  }

  get feedItems(): DashboardFeedItem[] {
    const productionItems = this.activeProduction.map<DashboardFeedItem>((ot) => ({
      id: `prod-${ot.OT}`,
      type: 'PRODUCTION',
      title: `OT ${ot.OT}`,
      description: String(ot.descripcion || 'Sin descripción disponible.'),
      meta: `${Number(ot.total_mtl || 0) || 0} m planificados`,
      machine: String(ot.maquina || 'Sin asignar'),
      ot,
    }));

    const alertItems = [...this.qualityService.activeIncidents]
      .sort((left, right) => right.reportedAt.getTime() - left.reportedAt.getTime())
      .slice(0, 6)
      .map<DashboardFeedItem>((incident) => ({
        id: `alert-${incident.id}`,
        type: 'ALERTS',
        title: incident.title,
        description: incident.description || 'Incidencia sin descripción adicional.',
        meta: this.formatTime(incident.reportedAt),
        machine: incident.machineRef || undefined,
        route: '/incidents',
        actionLabel: 'Abrir',
      }));

    const plantItems = this.machineAttention.map<DashboardFeedItem>((machine) => ({
      id: `plant-${machine.id}`,
      type: 'PLANT',
      title: machine.name,
      description: `Estado actual: ${machine.status}.`,
      meta: machine.code || 'Sin código',
      route: this.state.hasPermission('admin.panel.view') ? '/admin' : undefined,
      actionLabel: this.state.hasPermission('admin.panel.view') ? 'Revisar' : undefined,
    }));

    return [...productionItems, ...alertItems, ...plantItems];
  }

  get filteredFeed() {
    return this.activeFeedTab === 'ALL'
      ? this.feedItems
      : this.feedItems.filter((item) => item.type === this.activeFeedTab);
  }

  get feedFooterRoute() {
    if (this.activeFeedTab === 'ALERTS') return '/incidents';
    if (this.activeFeedTab === 'PLANT') return this.state.hasPermission('sync.manage') ? '/sync' : null;
    return '/ots';
  }

  get feedFooterLabel() {
    if (this.activeFeedTab === 'ALERTS') return 'Abrir módulo de incidencias';
    if (this.activeFeedTab === 'PLANT') return 'Abrir módulo relacionado';
    return 'Abrir Gestión de OTs';
  }

  async exportToPdf() {
    this.showExportMenu = false;

    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await this.fileExport.exportElementToPdf(this.dashboardContent.nativeElement, `dashboard_resumen_${dateStr}.pdf`, {
        orientation: 'l',
        backgroundColor: '#0b0e14',
      });
      this.audit.log(this.state.userName(), this.state.userRole(), 'DASHBOARD', 'Export PDF', 'Exportación visual del tablero completada.');
    } catch {
      this.notifications.showError('No fue posible generar el PDF del dashboard.');
    }
  }

  async exportToExcel() {
    this.showExportMenu = false;

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await this.fileExport.exportJsonToWorkbook([
        {
          name: 'Resumen',
          rows: [
            ['REPORTE GENERAL DE PLANTA', dateStr],
            [''],
            ['METRICA', 'VALOR'],
            ['Reportes cargados', this.reportMetrics.totalReports],
            ['OTs activas', this.activeProduction.length],
            ['OTs pendientes', this.stats.pending],
            ['Metros registrados', this.reportMetrics.totalMeters],
            ['Incidencias activas', this.activeIncidentsCount],
            ['Incidencias alta prioridad', this.highPriorityCount],
            ['Maquinas en atencion', this.machineMetrics.attention],
            ['Cola de sincronizacion', this.state.pendingSyncCount()],
          ],
        },
        {
          name: 'Produccion',
          rows: this.activeProduction.map((ot) => ({
            OT: ot.OT,
            Cliente: ot['Razon Social'],
            Producto: ot.descripcion,
            Maquina: ot.maquina || 'Sin asignar',
            Estado: ot.Estado_pedido,
            MetrosPlanificados: Number(ot.total_mtl || 0) || 0,
          })),
        },
        {
          name: 'Feed',
          rows: this.feedItems.map((item) => ({
            Tipo: item.type,
            Titulo: item.title,
            Descripcion: item.description,
            Maquina: item.machine || '-',
            Referencia: item.meta,
          })),
        },
      ], `dashboard_data_${dateStr}.xlsx`);

      this.audit.log(this.state.userName(), this.state.userRole(), 'DASHBOARD', 'Export Excel', 'Exportación de datos del tablero completada.');
    } catch {
      this.notifications.showError('No fue posible exportar los datos del dashboard.');
    }
  }

  openOtDetail(ot?: OT) {
    if (ot) this.selectedOt = ot;
  }

  openRoute(route: string | null | undefined) {
    if (!route) return;
    this.showExportMenu = false;
    void this.router.navigate([route]);
  }

  getFeedToneClasses(type: DashboardFeedType) {
    if (type === 'ALERTS') return 'border-red-500/20 bg-red-500/5 text-red-400';
    if (type === 'PLANT') return 'border-amber-500/20 bg-amber-500/5 text-amber-300';
    return 'border-blue-500/20 bg-blue-500/5 text-blue-400';
  }

  getMachineStatusClass(status: string) {
    switch (status) {
      case 'Mantenimiento':
        return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
      case 'Detenida':
        return 'border-red-500/20 bg-red-500/10 text-red-300';
      case 'Sin Operario':
        return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200';
      case 'Inactivo':
        return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
      default:
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    }
  }

  private formatTime(date: Date | null | undefined) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Sin hora';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private async loadDashboardData() {
    this.isLoadingDashboard = true;
    try {
      await Promise.allSettled([
        this.ordersService.reload(),
        this.qualityService.reload(),
        this.production.reload(),
        this.audit.reload({ page: 1, pageSize: 12 }),
      ]);
    } finally {
      this.isLoadingDashboard = false;
    }
  }
}
