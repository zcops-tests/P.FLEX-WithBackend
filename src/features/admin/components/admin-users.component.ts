
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { AdminService } from '../services/admin.service';
import { AppUser } from '../models/admin.models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Search & Actions Bar -->
      <div class="glassmorphism-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="relative w-full sm:w-72 group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input [(ngModel)]="userSearch" class="block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary/50 text-white placeholder-slate-500 bg-[#111827] border border-white/10" placeholder="Buscar usuario, email o rol..." type="text"/>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button class="p-2.5 rounded-xl text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">filter_list</span>
            <span class="text-xs font-semibold uppercase tracking-wider hidden sm:inline">Filtros</span>
          </button>
          <button class="p-2.5 rounded-xl text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">download</span>
            <span class="text-xs font-semibold uppercase tracking-wider hidden sm:inline">Exportar</span>
          </button>
          <button (click)="openUserModal()" class="flex items-center px-5 py-2.5 bg-primary/80 hover:bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all border border-white/10 backdrop-blur-sm active:scale-95 group">
            <span class="material-symbols-outlined text-lg mr-2 group-hover:rotate-90 transition-transform duration-300">add</span>
            Nuevo Usuario
          </button>
        </div>
      </div>

      <!-- Users Table -->
      <div class="glassmorphism-card rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
        <div class="overflow-x-auto flex-grow">
          <table class="min-w-full text-left">
            <thead class="bg-white/5 border-b border-white/10">
              <tr>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest" scope="col">
                  <div class="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    Usuario
                    <span class="material-symbols-outlined text-sm">unfold_more</span>
                  </div>
                </th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest" scope="col">Rol / Áreas</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest" scope="col">Estado</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest" scope="col">Último Acceso</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right" scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-sm">
              <tr *ngFor="let user of filteredUsers" class="hover:bg-white/5 transition-colors group border-b border-white/5">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20">
                      <div class="h-full w-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-black/20">
                        <span class="text-white font-bold text-sm">{{ user.name.charAt(0) }}</span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="font-medium text-white group-hover:text-primary transition-colors">{{ user.name }}</div>
                      <div class="text-xs text-slate-400">{{ user.username }}&#64;planta-a.com</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                        {{ user.role }}
                      </span>
                      <!-- Show areas if Operario and has areas assigned -->
                      <div *ngIf="user.role === 'Operario' && $any(user).assignedAreas?.length" class="flex flex-wrap gap-1 mt-1">
                          <span *ngFor="let area of $any(user).assignedAreas" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600">
                              {{ area }}
                          </span>
                      </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span *ngIf="user.active" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-neon-green">
                    <span class="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse"></span> Activo
                  </span>
                  <span *ngIf="!user.active" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span> Inactivo
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-slate-400">
                  <div class="flex flex-col">
                    <span class="text-white">Hace 2 horas</span>
                    <span class="text-[10px]">192.168.1.45</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="openUserModal(user)" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                      <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button (click)="deleteUser(user)" class="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="bg-white/5 px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <div class="text-xs text-slate-400">
            Mostrando <span class="font-semibold text-white">1</span> a <span class="font-semibold text-white">{{ filteredUsers.length }}</span> de <span class="font-semibold text-white">{{ adminService.users().length }}</span> usuarios
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 text-xs font-medium transition-all disabled:opacity-50" disabled>Anterior</button>
            <button class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 text-xs font-medium transition-all">Siguiente</button>
          </div>
        </div>
      </div>

      <!-- MODAL -->
      <div *ngIf="showUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-[#1e293b] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden my-auto">
          
          <div class="flex justify-between items-center p-6 border-b border-white/10 bg-[#0f172a] sticky top-0 z-10">
            <div>
              <h2 class="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary border border-primary/20">
                  <span class="material-symbols-outlined text-xl">person_add</span>
                </span>
                {{ editingUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario' }}
              </h2>
              <p class="text-slate-400 text-sm mt-1 ml-11">Complete los detalles para crear una nueva cuenta de acceso.</p>
            </div>
            <button (click)="showUserModal = false" class="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-[#1e293b]">
            <div class="space-y-6">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Avatar del Usuario</label>
                <div class="flex items-center gap-6">
                  <div class="relative group">
                    <div class="w-24 h-24 rounded-full bg-slate-900 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden hover:border-primary transition-colors cursor-pointer group-hover:bg-slate-800">
                      <span class="material-symbols-outlined text-3xl text-slate-500 group-hover:text-primary transition-colors">add_a_photo</span>
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white border-2 border-[#0B0E14]">
                      <span class="material-symbols-outlined text-sm">edit</span>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <button class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg border border-white/10 transition-colors">
                      Subir Imagen
                    </button>
                    <p class="text-[10px] text-slate-500">Recomendado: 400x400px.<br/>JPG, PNG o WEBP. Max 2MB.</p>
                  </div>
                </div>
              </div>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-1.5">Nombre Completo</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <span class="material-symbols-outlined text-[18px]">badge</span>
                    </span>
                    <input [(ngModel)]="tempUser.name" class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-white placeholder-slate-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="Ej: Juan Pérez" type="text"/>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-1.5">Usuario (Login)</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <span class="material-symbols-outlined text-[18px]">account_circle</span>
                    </span>
                    <input [(ngModel)]="tempUser.username" class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-white placeholder-slate-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="Ej: jperez" type="text"/>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <div class="pb-2 border-b border-white/10 flex justify-between items-center">
                <h3 class="text-sm font-semibold text-primary uppercase tracking-wider">Configuración de Acceso</h3>
              </div>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-1.5">Estado de la Cuenta</label>
                  <div class="p-1 rounded-xl bg-[#111827] border border-white/10 flex">
                    <button (click)="tempUser.active = true" [class.bg-neon-green-20]="tempUser.active" class="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
                            [ngClass]="tempUser.active ? 'bg-neon-green/20 border border-neon-green/30' : 'text-slate-400 hover:text-white hover:bg-white/5'">
                      <span *ngIf="tempUser.active" class="h-1.5 w-1.5 rounded-full bg-neon-green shadow-neon-green"></span>
                      Activa
                    </button>
                    <button (click)="tempUser.active = false" class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                            [ngClass]="!tempUser.active ? 'bg-red-500/20 text-white border border-red-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'">
                      Inactiva
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Rol Asignado</label>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      </span>
                      <select [(ngModel)]="tempUser.role" class="w-full pl-10 pr-8 py-2.5 rounded-xl appearance-none cursor-pointer bg-[#111827] border border-white/10 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                        <option *ngFor="let role of adminService.roles()" [value]="role.name" class="bg-slate-900">{{ role.name }}</option>
                      </select>
                      <span class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                        <span class="material-symbols-outlined text-sm">expand_more</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Departamento</label>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <span class="material-symbols-outlined text-[18px]">apartment</span>
                      </span>
                      <select class="w-full pl-10 pr-8 py-2.5 rounded-xl appearance-none cursor-pointer bg-[#111827] border border-white/10 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                        <option value="">Área</option>
                        <option class="bg-slate-900 text-white">Producción</option>
                        <option class="bg-slate-900 text-white">Logística</option>
                        <option class="bg-slate-900 text-white">Calidad</option>
                      </select>
                      <span class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                        <span class="material-symbols-outlined text-sm">expand_more</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- SELECTOR DE ÁREAS (SOLO PARA OPERARIO) -->
                <div *ngIf="tempUser.role === 'Operario'" class="bg-[#111827] p-4 rounded-xl border border-white/10 animate-fadeIn">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm text-blue-400">factory</span>
                        Áreas de Producción Asignadas
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <label *ngFor="let area of productionAreas" 
                               class="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all"
                               [ngClass]="isAreaSelected(area) ? 'bg-blue-500/20 border-blue-500/50' : 'bg-transparent border-white/5 hover:bg-white/5'">
                            <div class="relative flex items-center">
                                <input type="checkbox" 
                                       [checked]="isAreaSelected(area)" 
                                       (change)="toggleArea(area)"
                                       class="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-500 bg-slate-900/50 checked:bg-blue-500 checked:border-blue-500 transition-all"/>
                                <span class="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                    <span class="material-symbols-outlined text-xs font-bold">check</span>
                                </span>
                            </div>
                            <span class="text-xs font-bold uppercase tracking-wide" 
                                  [ngClass]="isAreaSelected(area) ? 'text-white' : 'text-slate-400'">
                                {{ area }}
                            </span>
                        </label>
                    </div>
                    <p class="text-[10px] text-slate-500 mt-2 italic">* Seleccione al menos una área para habilitar el acceso.</p>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-1.5">Contraseña Temporal</label>
                  <div class="relative group">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <span class="material-symbols-outlined text-[18px]">lock</span>
                    </span>
                    <input class="w-full pl-10 pr-10 py-2.5 font-mono text-sm tracking-wider rounded-xl bg-[#111827] border border-white/10 text-white outline-none" readonly type="password" value="tempPassword123!"/>
                    <button class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white">
                      <span class="material-symbols-outlined text-[18px]">refresh</span>
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">info</span>
                    El usuario deberá cambiarla en el primer inicio de sesión.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="p-6 border-t border-white/10 bg-[#0f172a] flex justify-end gap-3 sticky bottom-0 z-10">
            <button (click)="showUserModal = false" class="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
              Cancelar
            </button>
            <button (click)="saveUser()" class="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary/80 hover:bg-primary border border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 backdrop-blur-sm">
              <span class="material-symbols-outlined text-lg">check</span>
              Guardar Usuario
            </button>
          </div>
          
        </div>
      </div>

    </div>
  `
})
export class AdminUsersComponent {
  state = inject(StateService);
  adminService = inject(AdminService);
  userSearch = '';
  showUserModal = false;
  editingUser: AppUser | null = null;
  
  tempUser: any = {};

  productionAreas = ['Impresión', 'Troquelado', 'Acabado', 'Empaquetado'];

  get filteredUsers() {
    const term = this.userSearch.toLowerCase();
    return this.adminService.users().filter(u => 
        u.name.toLowerCase().includes(term) || 
        u.username.toLowerCase().includes(term)
    );
  }

  openUserModal(user: AppUser | null = null) {
    this.editingUser = user;
    if (user) {
        this.tempUser = JSON.parse(JSON.stringify(user));
        if (this.tempUser.role === 'Operario' && !this.tempUser.assignedAreas) {
            this.tempUser.assignedAreas = []; 
        }
    } else {
        this.tempUser = { 
            role: 'Operario', 
            active: true,
            assignedAreas: [] 
        };
    }
    this.showUserModal = true;
  }

  isAreaSelected(area: string): boolean {
      return (this.tempUser.assignedAreas || []).includes(area);
  }

  toggleArea(area: string) {
      if (!this.tempUser.assignedAreas) {
          this.tempUser.assignedAreas = [];
      }
      
      if (this.isAreaSelected(area)) {
          this.tempUser.assignedAreas = this.tempUser.assignedAreas.filter((a: string) => a !== area);
      } else {
          this.tempUser.assignedAreas.push(area);
      }
  }

  saveUser() {
    if (!this.tempUser.name || !this.tempUser.username) return;
    
    if (this.tempUser.role !== 'Operario') {
        delete this.tempUser.assignedAreas;
    }

    if (this.editingUser) {
         this.adminService.updateAdminUser(this.tempUser as AppUser);
    } else {
         this.adminService.addAdminUser(this.tempUser);
    }
    this.showUserModal = false;
  }

  deleteUser(user: AppUser) {
    if(confirm(`¿Eliminar usuario ${user.name}?`)) {
        this.adminService.deleteAdminUser(user.id);
    }
  }
}
