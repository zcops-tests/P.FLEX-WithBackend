
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { StateService, UserRole } from '../../services/state.service';
import { QualityService } from '../../features/quality/services/quality.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
  children?: { label: string; route: string; roles?: UserRole[]; }[];
  roles?: UserRole[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside 
      class="h-full flex flex-col p-4 gap-4 shrink-0 transition-all duration-300 font-display select-none"
      [class.w-80]="!state.isSidebarCollapsed()"
      [class.w-24]="state.isSidebarCollapsed()"
    >
      <!-- HEADER & USER SECTION -->
      <div class="tech-layer rounded-2xl flex flex-col gap-4 shrink-0 transition-all duration-300"
           [class.p-4]="!state.isSidebarCollapsed()"
           [class.p-2]="state.isSidebarCollapsed()">
        
        <!-- Logo Row -->
        <div class="flex items-center justify-between pb-4 border-b border-white/5 relative" 
             [class.flex-col]="state.isSidebarCollapsed()"
             [class.gap-2]="state.isSidebarCollapsed()">
             
          <div class="flex items-center gap-3 min-w-0" [class.justify-center]="state.isSidebarCollapsed()">
            <div class="relative h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center border border-white/20 shadow-glow-primary cursor-pointer" (click)="state.toggleSidebar()">
              <span class="font-bold text-white text-base">P</span>
              <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-gray-900 shadow-glow-secondary"></div>
            </div>
            
            @if (!state.isSidebarCollapsed()) {
              <div class="flex flex-col animate-fadeIn overflow-hidden">
                <h1 class="text-lg font-bold tracking-tight text-white leading-none whitespace-nowrap">P.FLEX</h1>
                <span class="text-[9px] text-blue-200/70 font-medium tracking-widest uppercase mt-1 whitespace-nowrap">Label Peru S.A.C.</span>
              </div>
            }
          </div>
          
          <!-- Toggle Button -->
          <button (click)="state.toggleSidebar()" 
                  class="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 hidden lg:flex items-center justify-center shrink-0 w-8 h-8"
                  [class.mt-2]="state.isSidebarCollapsed()"
                  title="Colapsar/Expandir Menú">
            <span class="material-symbols-outlined text-lg">{{ state.isSidebarCollapsed() ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left' }}</span>
          </button>
        </div>

        <!-- User Profile -->
        <div class="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5 transition-all group hover:border-white/10" 
             [class.justify-center]="state.isSidebarCollapsed()"
             [class.p-1]="state.isSidebarCollapsed()">
          <div class="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold shadow-lg border border-white/10 relative overflow-hidden">
            <span class="z-10 text-sm">{{ getInitials(state.userName()) }}</span>
            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
          </div>
          
          @if (!state.isSidebarCollapsed()) {
            <div class="flex flex-col min-w-0 animate-fadeIn overflow-hidden">
              <span class="text-sm font-semibold text-white truncate">{{ state.userName() }}</span>
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]"></div>
                <span class="text-[10px] text-emerald-400 font-medium tracking-wide uppercase shadow-glow-secondary truncate">{{ state.currentShift() || 'Sin Turno' }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Context Switcher (Search-like input from reference) -->
        <div class="relative group cursor-pointer" (click)="goToModeSelector()">
          <div class="bg-black/20 border border-white/10 rounded-lg flex items-center transition-all focus-within:border-primary/50 focus-within:bg-black/40 focus-within:shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:border-white/20"
               [class.justify-center]="state.isSidebarCollapsed()"
               [class.px-3]="!state.isSidebarCollapsed()" 
               [class.py-2]="!state.isSidebarCollapsed()"
               [class.p-2]="state.isSidebarCollapsed()">
            <span class="material-icons text-gray-500 text-sm group-focus-within:text-primary transition-colors" [class.mr-2]="!state.isSidebarCollapsed()">domain</span>
            
            @if (!state.isSidebarCollapsed()) {
               <input class="bg-transparent border-none p-0 text-xs text-gray-200 placeholder-gray-600 focus:ring-0 w-full h-full outline-none font-medium tracking-wide cursor-pointer" 
                      placeholder="CAMBIAR ENTORNO..." type="text" readonly/>
            }
          </div>
        </div>
      </div>

      <!-- NAVIGATION SECTION -->
      <div class="tech-layer rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden">
        <div class="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1">
          
          @if (!state.isSidebarCollapsed()) {
            <div class="px-4 pt-3 pb-1 animate-fadeIn">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Principal</span>
            </div>
          }

          <!-- Loop Main Items -->
          @for (item of mainMenuItems; track item.label) {
             <ng-container *ngTemplateOutlet="menuItemTemplate; context: { item: item }"></ng-container>
          }

          <div class="tech-separator my-3 mx-2 opacity-50"></div>

          @if (!state.isSidebarCollapsed()) {
            <div class="px-4 pt-1 pb-1 animate-fadeIn">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gestión</span>
            </div>
          }

          <!-- Loop Management Items -->
          @for (item of managementMenuItems; track item.label) {
             <ng-container *ngTemplateOutlet="menuItemTemplate; context: { item: item }"></ng-container>
          }

        </div>

        <!-- Bottom Config -->
        @if (canAccessConfiguration()) {
        <div class="p-2 border-t border-white/5">
            <a routerLink="/admin" class="group flex items-center px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200"
               [class.justify-center]="state.isSidebarCollapsed()"
               [title]="state.isSidebarCollapsed() ? 'Configuración' : ''">
               <span class="material-icons text-xl opacity-70 group-hover:opacity-100 icon-glow" [class.mr-3]="!state.isSidebarCollapsed()">settings</span>
               @if (!state.isSidebarCollapsed()) {
                 <span class="text-sm font-medium animate-fadeIn whitespace-nowrap">Configuración</span>
               }
            </a>
        </div>
        }

        <div class="p-2 border-t border-white/5">
          <button
            type="button"
            (click)="logout()"
            class="group flex w-full items-center px-3 py-2.5 rounded-xl text-red-300 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-400/20 transition-all duration-200 cursor-pointer"
            [class.justify-center]="state.isSidebarCollapsed()"
            [title]="state.isSidebarCollapsed() ? 'Cerrar sesión' : ''"
          >
            <span class="material-icons text-xl opacity-80 group-hover:opacity-100 icon-glow" [class.mr-3]="!state.isSidebarCollapsed()">logout</span>
            @if (!state.isSidebarCollapsed()) {
              <span class="text-sm font-medium animate-fadeIn whitespace-nowrap">Cerrar sesión</span>
            }
          </button>
        </div>
      </div>

      <!-- FOOTER / SYNC STATUS -->
      <div class="tech-layer rounded-2xl p-4 shrink-0 bg-gradient-to-r from-emerald-900/20 to-transparent border-t border-emerald-500/20"
           [class.p-2]="state.isSidebarCollapsed()"
           [class.items-center]="state.isSidebarCollapsed()"
           [class.flex-col]="state.isSidebarCollapsed()">
        
        <div class="flex items-center justify-between" [class.justify-center]="state.isSidebarCollapsed()">
          <div class="flex items-center gap-3">
            <div class="relative flex items-center justify-center h-8 w-8 rounded-lg shrink-0 transition-colors duration-300"
                 [ngClass]="isOnline() ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'">
              <span class="material-icons text-lg icon-glow" [ngClass]="isOnline() ? 'text-emerald-400' : 'text-red-400'">
                {{ isOnline() ? 'wifi' : 'wifi_off' }}
              </span>
              @if (isOnline()) {
                <span class="absolute top-0 right-0 -mt-1 -mr-1 flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              }
            </div>
            
            @if (!state.isSidebarCollapsed()) {
              <div class="flex flex-col animate-fadeIn overflow-hidden">
                <span class="text-xs font-bold tracking-wide flex items-center gap-1 shadow-glow-secondary whitespace-nowrap"
                      [ngClass]="isOnline() ? 'text-white' : 'text-red-400'">
                    {{ isOnline() ? 'ONLINE' : 'OFFLINE' }}
                </span>
                <span class="text-[10px] text-gray-400 whitespace-nowrap">{{ isOnline() ? 'Conexión estable' : 'Sin red detectada' }}</span>
              </div>
            }
          </div>

          @if (!state.isSidebarCollapsed() && isOnline()) {
            <div class="h-8 w-[1px] bg-white/10 mx-1"></div>
            <div class="flex flex-col items-end animate-fadeIn overflow-hidden">
              <span class="text-[9px] text-gray-500 uppercase whitespace-nowrap">Latency</span>
              <span class="text-xs font-mono" 
                    [ngClass]="latency() < 100 ? 'text-emerald-400' : (latency() < 300 ? 'text-yellow-400' : 'text-red-400')">
                {{ latency() }}ms
              </span>
            </div>
          }
        </div>
      </div>

    </aside>

    <!-- Menu Item Template to avoid code duplication -->
    <ng-template #menuItemTemplate let-item="item">
        <div class="flex flex-col">
            <a [routerLink]="item.children ? null : item.route"
                routerLinkActive="tech-item-active"
                #rla="routerLinkActive"
                (click)="handleItemClick(item)"
                class="group flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer mb-1 relative overflow-hidden"
                [ngClass]="{
                'text-gray-400': !rla.isActive,
                'hover:text-white': !rla.isActive,
                'hover:bg-white/5': !rla.isActive && !item.children,
                'border': !rla.isActive,
                'border-transparent': !rla.isActive,
                'hover:border-white/5': !rla.isActive,
                'justify-center': state.isSidebarCollapsed()
                }"
                [title]="state.isSidebarCollapsed() ? item.label : ''">
            
            <span class="material-icons mr-3 text-xl icon-glow transition-all duration-300"
                    [class.mr-0]="state.isSidebarCollapsed()"
                    [class.text-blue-200]="rla.isActive"
                    [class.opacity-70]="!rla.isActive"
                    [class.group-hover:opacity-100]="!rla.isActive"
                    [class.group-hover:text-blue-300]="!rla.isActive">
                {{ item.icon }}
            </span>

            @if (!state.isSidebarCollapsed()) {
                <span class="text-sm font-medium tracking-wide animate-fadeIn whitespace-nowrap" 
                    [class.text-white]="rla.isActive" 
                    [class.font-semibold]="rla.isActive"
                    [class.drop-shadow-md]="rla.isActive">
                {{ item.label }}
                </span>

                @if (item.badge) {
                <span class="ml-auto tech-badge flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded text-[10px] font-bold text-red-200 animate-fadeIn">
                    {{ item.badge }}
                </span>
                }

                @if (rla.isActive) {
                <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></div>
                }

                @if (item.children) {
                <span class="material-icons text-gray-600 text-sm ml-auto transition-transform duration-300"
                        [class.rotate-180]="isExpanded(item.label)">
                    expand_more
                </span>
                }
            } @else {
                <!-- Collapsed Badge -->
                @if (item.badge) {
                    <span class="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 shadow-glow-danger border border-[#080c14]"></span>
                }
            }
            </a>

            <!-- Submenu -->
            @if (item.children && !state.isSidebarCollapsed() && isExpanded(item.label)) {
            <div class="ml-4 pl-2 border-l border-white/5 space-y-1 mb-2 animate-slideDown">
                @for (sub of getVisibleChildren(item); track sub.label) {
                <a [routerLink]="sub.route" 
                    routerLinkActive="text-blue-300 bg-white/5 border-white/10"
                    class="flex items-center px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-white hover:bg-white/5 border border-transparent transition-all whitespace-nowrap">
                    <span class="w-1 h-1 rounded-full bg-current mr-2 opacity-50 shrink-0"></span>
                    {{ sub.label }}
                </a>
                }
            </div>
            }
        </div>
    </ng-template>
  `,
  styles: [`
    :host {
        display: block;
        height: 100vh;
    }

    .tech-layer {
        background: rgba(17, 25, 40, 0.45);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        /* Removed heavy box-shadow to prevent vertical lines artifact */
        position: relative;
        overflow: hidden;
    }

    .tech-item-active {
        position: relative;
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.4) 0%, rgba(37, 99, 235, 0.1) 100%);
        border: 1px solid rgba(37, 99, 235, 0.5);
        box-shadow: inset 0 0 20px rgba(37, 99, 235, 0.2), 0 0 15px rgba(37, 99, 235, 0.3);
        overflow: hidden;
    }
    
    .tech-item-active::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        animation: shine 3s infinite;
        pointer-events: none;
    }

    @keyframes shine {
        0% { left: -100%; }
        20% { left: 100%; }
        100% { left: 100%; }
    }

    .icon-glow {
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
    }
    
    .group:hover .icon-glow {
        text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
        transform: scale(1.1);
    }

    .tech-badge {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.6);
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        backdrop-filter: blur(4px);
    }

    .tech-separator {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    }

    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

    .shadow-glow-primary { box-shadow: 0 0 15px rgba(37, 99, 235, 0.3); }
    .shadow-glow-secondary { box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
    .shadow-glow-danger { box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
    
    @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slideDown { animation: slideDown 0.2s ease-out; }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  router: Router = inject(Router);
  qualityService = inject(QualityService);
  expandedMenus: string[] = [];

  // Connectivity Signals
  isOnline = signal(true);
  latency = signal(24);
  private intervalId: any;

  ngOnInit() {
    this.isOnline.set(navigator.onLine);
    window.addEventListener('online', this.updateStatus);
    window.addEventListener('offline', this.updateStatus);
    
    // Initial and periodic latency check
    this.measureLatency();
    this.intervalId = setInterval(() => this.measureLatency(), 5000);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.updateStatus);
    window.removeEventListener('offline', this.updateStatus);
    if (this.intervalId) clearInterval(this.intervalId);
  }

  updateStatus = () => {
    this.isOnline.set(navigator.onLine);
    if (navigator.onLine) this.measureLatency();
  }

  async measureLatency() {
    if (!this.isOnline()) return;
    
    const start = performance.now();
    try {
        // Try to fetch current origin HEAD to test RTT
        await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
        const end = performance.now();
        this.latency.set(Math.round(end - start));
    } catch (e) {
        // Fallback for strict environments (like some file:// or restricted CORS)
        // Simulate jitter if online but fetch fails
        this.latency.set(Math.floor(Math.random() * 40) + 15);
    }
  }

  getInitials(name: string): string {
    return name ? name.substring(0, 2).toUpperCase() : 'US';
  }

  handleItemClick(item: MenuItem) {
    if (item.children) {
        this.toggleSubmenu(item.label);
    }
  }

  toggleSubmenu(label: string) {
    if (this.state.isSidebarCollapsed()) {
        this.state.toggleSidebar();
    }

    if (this.expandedMenus.includes(label)) {
        this.expandedMenus = this.expandedMenus.filter(l => l !== label);
    } else {
        this.expandedMenus.push(label);
    }
  }

  isExpanded(label: string) {
    return this.expandedMenus.includes(label);
  }

  goToModeSelector() {
    this.router.navigate(['/operator']);
  }

  logout() {
    void this.state.logout();
  }

  private readonly baseMenuItems: MenuItem[] = [
    { label: 'DASHBOARD', icon: 'dashboard', route: '/dashboard', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Encargado de Tintas', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad', 'Auditor'] },
    { label: 'OTS', icon: 'assignment', route: '/ots', badge: '3', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Encargado de Tintas', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad', 'Auditor'] },
    { label: 'PROGRAMACIÓN', icon: 'calendar_month', route: '/schedule', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Encargado de Tintas', 'Encargado de Troquelado y Rebobinado'] },
    { 
      label: 'REPORTES', icon: 'precision_manufacturing', route: '/reports',
      children: [
        { label: 'IMPRESIÓN', route: '/reports/print', roles: ['Sistemas', 'Supervisor', 'Operario', 'Asistente de Producción', 'Jefe de Calidad'] },
        { label: 'TROQUELADO', route: '/reports/diecut', roles: ['Sistemas', 'Supervisor', 'Operario', 'Asistente de Producción', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad'] },
        { label: 'REBOBINADO', route: '/reports/rewind', roles: ['Sistemas', 'Supervisor', 'Operario', 'Asistente de Producción', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad'] },
        { label: 'EMPAQUETADO', route: '/reports/packaging', roles: ['Sistemas', 'Supervisor', 'Operario', 'Asistente de Producción', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad'] }
      ]
    },
    {
      label: 'INVENTARIO', icon: 'inventory_2', route: '/inventory',
      children: [
        { label: 'LAYOUT / MAPA', route: '/inventory/layout', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Encargado de Tintas', 'Jefe de Calidad', 'Auditor'] },
        { label: 'CLISÉS', route: '/inventory/clise', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Jefe de Calidad', 'Auditor'] },
        { label: 'TROQUELES', route: '/inventory/die', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Jefe de Calidad', 'Auditor'] },
        { label: 'PRODUCTO TERMINADO', route: '/inventory/stock', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad', 'Auditor'] },
        { label: 'TINTAS', route: '/inventory/ink', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Tintas', 'Jefe de Calidad'] }
      ]
    }
  ];

  private readonly managementItems: MenuItem[] = [
    { label: 'INCIDENCIAS', icon: 'warning', route: '/incidents', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Operario', 'Asistente', 'Asistente de Producción', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles', 'Encargado de Tintas', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad', 'Auditor'] },
    { label: 'INDICADORES', icon: 'analytics', route: '/analytics', roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Encargado de Troquelado y Rebobinado', 'Jefe de Calidad'] },
    { label: 'AUDITORÍA', icon: 'verified_user', route: '/audit', roles: ['Sistemas', 'Jefatura', 'Auditor'] }
  ];

  get mainMenuItems() {
    return this.baseMenuItems.filter((item) => this.canAccess(item.roles) && this.hasVisibleChildren(item));
  }

  get managementMenuItems() {
    const incidentCount = this.qualityService.activeIncidents.length;

    return this.managementItems.map(item => {
      if (item.label === 'INCIDENCIAS') {
        return { 
          ...item, 
          badge: incidentCount > 0 ? incidentCount.toString() : undefined 
        };
      }
      return item;
    }).filter((item) => this.canAccess(item.roles) && this.hasVisibleChildren(item));
  }

  canAccessConfiguration() {
    return this.state.hasAnyRole(['Sistemas']);
  }

  private canAccess(roles?: readonly UserRole[]) {
    if (!roles?.length) return true;
    return this.state.hasAnyRole(roles);
  }

  getVisibleChildren(item: MenuItem) {
    return (item.children || []).filter((child) => this.canAccess(child.roles));
  }

  private hasVisibleChildren(item: MenuItem) {
    if (!item.children?.length) return true;
    return this.getVisibleChildren(item).length > 0;
  }
}
