
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService, Machine } from '../../../services/state.service';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-machines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      
      <!-- Filters Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div class="relative w-full md:w-96 group">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
               <span class="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            </div>
            <input class="block w-full pl-11 pr-4 py-3 rounded-xl text-sm border-white/10 bg-[#111827] text-white focus:border-primary/50 focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Buscar por ID, modelo o zona..." type="text"/>
         </div>
         <div class="flex items-center gap-3 w-full md:w-auto">
            <button class="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111827] border border-white/10 hover:bg-white/10 text-sm font-medium text-slate-300 hover:text-white transition-colors">
               <span class="material-symbols-outlined text-lg">tune</span> Filtros
            </button>
            <button (click)="openMachineModal()" class="flex items-center gap-2 px-6 py-3 bg-primary/90 hover:bg-primary text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/25 backdrop-blur-sm transition-all hover:scale-[1.02] border border-white/10">
               <span class="material-symbols-outlined">add</span> Nueva Máquina
            </button>
         </div>
      </div>

      <!-- Machines Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         
         <div *ngFor="let machine of adminService.machines()" class="glassmorphism-card rounded-2xl p-6 flex flex-col relative group overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            <div class="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
               <button (click)="openMachineModal(machine)" class="text-slate-400 hover:text-white"><span class="material-symbols-outlined">more_vert</span></button>
            </div>
            
            <div class="flex items-start gap-4 mb-6">
               <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <span class="material-symbols-outlined text-3xl" [ngClass]="getMachineIconColor(machine.type)">{{ getMachineIcon(machine.type) }}</span>
               </div>
               <div>
                  <h3 class="text-lg font-bold text-white tracking-tight">{{ machine.name }}</h3>
                  <p class="text-xs text-slate-400 font-mono mt-1">S/N: {{ machine.code }}</p>
                  <div class="mt-2 flex items-center gap-2">
                     <span class="h-2 w-2 rounded-full shadow-lg" [ngClass]="getMachineStatusColor(machine.status)"></span>
                     <span class="text-xs font-medium tracking-wide uppercase" [ngClass]="getMachineStatusTextColor(machine.status)">{{ machine.status }}</span>
                  </div>
               </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6">
               <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                  <span class="text-[10px] uppercase text-slate-500 font-bold tracking-wider block mb-1">Temperatura</span>
                  <div class="flex items-end gap-1">
                     <span class="text-xl font-mono text-white" style="text-shadow: 0 0 10px rgba(255,255,255,0.3)">64</span>
                     <span class="text-xs text-slate-400 mb-1">°C</span>
                  </div>
               </div>
               <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                  <span class="text-[10px] uppercase text-slate-500 font-bold tracking-wider block mb-1">Carga</span>
                  <div class="flex items-end gap-1">
                     <span class="text-xl font-mono text-white" style="text-shadow: 0 0 10px rgba(255,255,255,0.3)">82</span>
                     <span class="text-xs text-slate-400 mb-1">%</span>
                  </div>
               </div>
            </div>

            <div class="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
               <span class="text-xs text-slate-500 font-medium">Zona: {{ machine.area }}</span>
               <button (click)="deleteMachine(machine)" class="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider flex items-center gap-1 group/btn">
                  Eliminar <span class="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">delete</span>
               </button>
            </div>
            
            <div class="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
         </div>

         <!-- Add New Placeholder -->
         <button (click)="openMachineModal()" class="glassmorphism-card rounded-2xl p-6 flex flex-col items-center justify-center border-dashed border-2 border-white/10 hover:border-primary/50 hover:bg-primary/5 group transition-all duration-300 min-h-[280px]">
            <div class="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-black/20">
               <span class="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary">add</span>
            </div>
            <span class="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">Añadir Nueva Máquina</span>
            <span class="text-xs text-slate-500 mt-2 text-center px-8">Configure un nuevo dispositivo IoT o maquinaria industrial</span>
         </button>

      </div>

      <!-- MACHINE MODAL -->
      <div *ngIf="showMachineModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog">
         <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>
         <div class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b] shadow-2xl transition-all">
            <div class="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#0f172a]">
               <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                     <span class="material-symbols-outlined">add_circle</span>
                  </div>
                  <div>
                     <h3 class="text-lg font-bold text-white leading-6">{{ editingMachine ? 'Editar Máquina' : 'Añadir Nueva Máquina' }}</h3>
                     <p class="text-xs text-slate-400 mt-0.5">Registro de activos y configuración IoT</p>
                  </div>
               </div>
               <button (click)="showMachineModal = false" class="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                  <span class="material-symbols-outlined">close</span>
               </button>
            </div>
            
            <div class="px-6 py-6 max-h-[70vh] overflow-y-auto bg-[#1e293b]">
               <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div class="col-span-2 sm:col-span-1">
                     <label class="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Nombre de la Máquina</label>
                     <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                           <span class="material-symbols-outlined text-[20px]">precision_manufacturing</span>
                        </span>
                        <input [(ngModel)]="tempMachine.name" class="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm bg-[#111827] border border-white/10 text-white focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Ej: Prensa Hidráulica H-500" type="text"/>
                     </div>
                  </div>
                  <div class="col-span-2 sm:col-span-1">
                     <label class="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Modelo / Nº Serie</label>
                     <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                           <span class="material-symbols-outlined text-[20px]">qr_code</span>
                        </span>
                        <input [(ngModel)]="tempMachine.code" class="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm font-mono bg-[#111827] border border-white/10 text-white focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Ej: SN-2024-X99" type="text"/>
                     </div>
                  </div>
                  <div class="col-span-2 sm:col-span-1">
                     <label class="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Área de Asignación</label>
                     <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                           <span class="material-symbols-outlined text-[20px]">factory</span>
                        </span>
                        <input [(ngModel)]="tempMachine.area" class="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm bg-[#111827] border border-white/10 text-white focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Ej: Nave A" type="text"/>
                     </div>
                  </div>
                  <div class="col-span-2 sm:col-span-1">
                     <label class="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Tipo</label>
                     <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                           <span class="material-symbols-outlined text-[20px]">category</span>
                        </span>
                        <select [(ngModel)]="tempMachine.type" class="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm appearance-none cursor-pointer bg-[#111827] border border-white/10 text-white focus:ring-1 focus:ring-primary focus:outline-none">
                           <option class="bg-slate-900" value="Impresión">Impresión</option>
                           <option class="bg-slate-900" value="Troquelado">Troquelado</option>
                           <option class="bg-slate-900" value="Acabado">Acabado</option>
                        </select>
                        <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                           <span class="material-symbols-outlined text-sm">expand_more</span>
                        </span>
                     </div>
                  </div>
               </div>

               <div class="pt-6">
                  <div class="flex items-center gap-2 mb-4">
                     <span class="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></span>
                     <span class="text-xs font-bold uppercase tracking-widest text-primary">Parámetros IoT</span>
                     <span class="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></span>
                  </div>
                  <div class="space-y-3">
                     <!-- IoT Toggles (Visual Only for now) -->
                     <div class="rounded-xl border border-white/5 p-3 flex items-center justify-between group hover:border-white/20 transition-all bg-[#111827]">
                        <div class="flex items-center gap-3">
                           <div class="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                              <span class="material-symbols-outlined text-[20px]">thermostat</span>
                           </div>
                           <div>
                              <div class="text-sm font-medium text-white">Sensor Térmico</div>
                              <div class="text-[10px] text-slate-400">Monitoreo de temperatura crítica</div>
                           </div>
                        </div>
                        <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                           <input type="checkbox" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-slate-700 appearance-none cursor-pointer transition-all duration-300"/>
                           <label class="toggle-label block overflow-hidden h-5 rounded-full bg-slate-700 cursor-pointer transition-colors duration-300"></label>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[#0f172a]">
               <button (click)="showMachineModal = false" class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Cancelar</button>
               <button (click)="saveMachine()" class="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all border border-white/10 backdrop-blur-sm active:scale-95">
                  <span class="material-symbols-outlined text-lg">save</span> {{ editingMachine ? 'Guardar Cambios' : 'Registrar Máquina' }}
               </button>
            </div>
         </div>
      </div>

    </div>
  `
})
export class AdminMachinesComponent {
  state = inject(StateService);
  adminService = inject(AdminService);
  showMachineModal = false;
  editingMachine: Machine | null = null;
  tempMachine: Partial<Machine> = {};

  getMachineIcon(type: string) {
     switch(type) {
        case 'Impresión': return 'print';
        case 'Troquelado': return 'content_cut';
        case 'Acabado': return 'sync';
        default: return 'precision_manufacturing';
     }
  }

  getMachineIconColor(type: string) {
     switch(type) {
        case 'Impresión': return 'text-blue-400';
        case 'Troquelado': return 'text-purple-400';
        case 'Acabado': return 'text-industrial-orange';
        default: return 'text-slate-400';
     }
  }

  getMachineStatusColor(status: string) {
     if(status === 'Operativa') return 'bg-neon-green shadow-neon-green animate-pulse';
     if(status === 'Mantenimiento') return 'bg-neon-yellow shadow-neon-yellow';
     return 'bg-neon-red shadow-neon-red';
  }

  getMachineStatusTextColor(status: string) {
     if(status === 'Operativa') return 'text-neon-green';
     if(status === 'Mantenimiento') return 'text-neon-yellow';
     return 'text-neon-red';
  }

  openMachineModal(machine: Machine | null = null) {
     this.editingMachine = machine;
     this.tempMachine = machine ? { ...machine } : { type: 'Impresión', status: 'Operativa', active: true };
     this.showMachineModal = true;
  }

  saveMachine() {
     if (!this.tempMachine.name || !this.tempMachine.code) return;
     if (this.editingMachine) {
         this.adminService.updateMachine(this.tempMachine as Machine);
     } else {
         this.adminService.addMachine(this.tempMachine);
     }
     this.showMachineModal = false;
  }

  deleteMachine(machine: Machine) {
     if(confirm(`¿Eliminar máquina ${machine.name}?`)) {
         this.adminService.deleteMachine(machine.id);
     }
  }
}
