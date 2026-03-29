
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService, Machine } from '../../services/state.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-operator-machine-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

    <div class="bg-gradient-mesh font-sans min-h-screen w-full flex flex-col relative overflow-hidden selection:bg-blue-500 selection:text-white text-gray-100">
      
      <!-- Background Effects -->
      <div class="fixed inset-0 z-0 pointer-events-none">
          <div class="grid-overlay absolute inset-0 opacity-40"></div>
          <div class="orb orb-1"></div>
          <div class="orb orb-2"></div>
          <div class="scanline absolute inset-0 z-50 pointer-events-none opacity-10"></div>
      </div>

      <!-- Header -->
      <header class="w-full glass-panel h-24 flex items-center justify-between px-8 z-50 sticky top-0 border-b border-white/5 relative">
         <div class="flex items-center gap-6">
            <button (click)="goBack()" class="w-14 h-14 rounded-2xl glass-button flex items-center justify-center group active:scale-95 transition-all duration-300">
               <span class="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors text-2xl">arrow_back</span>
            </button>
            <div class="flex flex-col">
               <h1 class="text-2xl font-tech font-bold uppercase tracking-[0.15em] text-white leading-none mb-1">
                  SELECCIÓN DE MÁQUINA
               </h1>
               <div class="flex items-center gap-2 text-xs font-mono text-gray-400 tracking-widest uppercase">
                  <span class="text-blue-400 font-bold">{{ typeName }}</span>
                  <span class="text-gray-600">|</span>
                  <span>{{ machines.length }} Unidades Disponibles</span>
               </div>
            </div>
         </div>
      </header>

      <!-- Main Content -->
      <main class="flex-grow flex flex-col items-center justify-center p-8 lg:p-12 w-full max-w-[1920px] mx-auto relative z-10">
         
         <div class="w-full max-w-[1600px] mx-auto">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
               
               <ng-container *ngFor="let machine of machines">
                  <button (click)="selectMachine(machine)" 
                     class="group relative glass-card rounded-2xl p-0 text-left cursor-pointer overflow-hidden h-56 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] border border-white/5 hover:border-blue-500/30"
                     [class.opacity-60]="machine.status !== 'Activo'"
                     [class.grayscale]="machine.status !== 'Activo'"
                     [class.cursor-not-allowed]="machine.status !== 'Activo'">
                     
                     <div class="absolute inset-0 bg-gradient-to-br from-[#0f172a] to-[#020408] z-0"></div>
                     
                     <ng-container *ngIf="getMachineImage(machine); let bgImg">
                        <img [src]="bgImg" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500 grayscale group-hover:grayscale-0">
                     </ng-container>

                     <!-- Status Indicator Line -->
                     <div class="absolute top-0 left-0 w-1 h-full z-20"
                        [ngClass]="{
                           'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]': machine.status === 'Activo',
                           'bg-orange-500': machine.status === 'Mantenimiento',
                           'bg-red-500': machine.status === 'Detenida',
                           'bg-slate-500': machine.status === 'Sin Operario' || machine.status === 'Inactivo'
                        }"></div>

                     <div class="relative z-10 flex flex-col h-full w-full p-6 justify-between">
                        <div class="flex justify-between items-start w-full">
                           <div class="w-12 h-12 rounded-xl glass-button flex items-center justify-center border border-white/10 text-gray-300 group-hover:text-blue-400 transition-colors shadow-lg">
                              <span class="material-symbols-outlined text-2xl">precision_manufacturing</span>
                           </div>
                           
                           <div class="px-3 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-2 border backdrop-blur-md shadow-sm font-tech tracking-wider"
                              [ngClass]="{
                                 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': machine.status === 'Activo',
                                 'bg-orange-500/10 text-orange-400 border-orange-500/20': machine.status === 'Mantenimiento',
                                 'bg-red-500/10 text-red-400 border-red-500/20': machine.status === 'Detenida',
                                 'bg-slate-500/10 text-slate-300 border-white/10': machine.status === 'Sin Operario' || machine.status === 'Inactivo'
                              }">
                              <span class="w-1.5 h-1.5 rounded-full" 
                                 [ngClass]="{
                                    'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]': machine.status === 'Activo',
                                    'bg-orange-400': machine.status === 'Mantenimiento',
                                    'bg-red-400': machine.status === 'Detenida',
                                    'bg-slate-400': machine.status === 'Sin Operario' || machine.status === 'Inactivo'
                                 }"></span>
                              {{ machine.status }}
                           </div>
                        </div>

                        <div>
                           <h3 class="text-2xl font-tech font-bold text-white group-hover:text-blue-200 transition-colors truncate drop-shadow-md tracking-wide mb-1">{{ machine.name }}</h3>
                           <p class="text-blue-300/50 text-xs font-mono font-bold tracking-widest">{{ machine.code }}</p>
                        </div>
                     </div>

                  </button>
               </ng-container>
               
               <div *ngIf="machines.length === 0" class="col-span-full text-center py-24 glass-panel rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center">
                  <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <span class="material-symbols-outlined text-4xl text-gray-600">dns</span>
                  </div>
                  <p class="text-xl text-gray-300 font-tech uppercase tracking-widest font-bold">No hay máquinas registradas</p>
                  <p class="text-sm text-gray-500 mt-2 font-mono">Contacte a soporte técnico para configuración.</p>
               </div>

            </div>

         </div>

      </main>
    </div>
  `,
  styles: [`
    .font-tech { font-family: var(--app-font-stack); }
    
    .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        z-index: 0;
        opacity: 0.3;
    }
    .orb-1 { top: 20%; left: 10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(30, 58, 138, 0.2) 0%, transparent 70%); }
    .orb-2 { bottom: 20%; right: 10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(88, 28, 135, 0.15) 0%, transparent 70%); }
    
    .glass-panel {
        background: rgba(2, 4, 8, 0.8);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .glass-card {
        background: linear-gradient(160deg, rgba(15, 23, 42, 0.6) 0%, rgba(2, 4, 8, 0.8) 100%);
        backdrop-filter: blur(12px);
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    .glass-button {
        background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.05);
    }
    .scanline {
        background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 51%);
        background-size: 100% 4px;
    }
  `]
})
export class OperatorMachineSelectorComponent {
  route: ActivatedRoute = inject(ActivatedRoute);
  router: Router = inject(Router);
  state = inject(StateService);
  notifications = inject(NotificationService);

  type = 'print';

  constructor() {
    this.route.params.subscribe(params => {
      this.type = params['type'];
      if (!this.state.hasActiveOperator()) {
        this.router.navigate(['/operator']);
        return;
      }

      if (!this.state.canCreateProcessReport(this.type)) {
        this.notifications.showError('La sesión anfitriona no tiene permiso para registrar reportes en esta área.');
        this.router.navigate(['/operator']);
      }
    });
  }

  getMachineImage(machine: Machine): string | null {
     const name = machine.name.toUpperCase();
     if (name.includes('PLANA')) {
        return 'https://picsum.photos/seed/troqueladora/600/400'; 
     }
     return null;
  }

  get machines(): Machine[] {
     if (this.type === 'print') {
        return this.state.adminMachines().filter((m) => m.type === 'Impresión' && this.state.isMachineAllowedForActiveOperator(m, 'print'));
     }
     if (this.type === 'diecut') {
        return this.state.adminMachines().filter((m) => m.type === 'Troquelado' && this.state.isMachineAllowedForActiveOperator(m, 'diecut'));
     }
     if (this.type === 'rewind') {
        return this.state.adminMachines().filter((m) => m.type === 'Rebobinado' && this.state.isMachineAllowedForActiveOperator(m, 'rewind'));
     }
     return [];
  }

  get typeName(): string {
     switch(this.type) {
        case 'print': return 'IMPRESIÓN';
        case 'diecut': return 'TROQUELADO';
        case 'rewind': return 'REBOBINADO';
        default: return 'PROCESO';
     }
  }

  goBack() {
    this.router.navigate(['/operator']);
  }

  selectMachine(machine: Machine) {
    if (!this.state.canCreateProcessReport(this.type)) {
      this.notifications.showError('La sesión anfitriona no tiene permiso para registrar reportes en esta área.');
      return;
    }

    if (machine.status !== 'Activo' || !this.state.isMachineAllowedForActiveOperator(machine, this.type)) return;
    this.router.navigate(['/operator/report', this.type, machine.name]);
  }
}
