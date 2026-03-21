
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { AdminService } from '../services/admin.service';
import { RoleDefinition } from '../models/admin.models';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      
      <!-- Header Section -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white mb-1">Roles del Sistema</h2>
          <p class="text-slate-400 text-sm">Administra los niveles de acceso y permisos operativos.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div class="relative group w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="material-symbols-outlined text-slate-500 group-focus-within:text-primary transition-colors">search</span>
            </div>
            <input class="block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm bg-[#111827] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar rol o permiso..." type="text"/>
          </div>
          <button (click)="openRoleModal()" class="flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 border border-primary/50">
            <span class="material-symbols-outlined text-lg mr-2">add_moderator</span>
            Crear Rol
          </button>
        </div>
      </div>

      <!-- Roles Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        <!-- Role Card Loop -->
        <div *ngFor="let role of adminService.roles()" (click)="openRoleModal(role)" class="glassmorphism-card rounded-3xl p-6 flex flex-col h-full relative group cursor-pointer hover:border-primary/30 transition-all">
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10 transition-opacity opacity-40 group-hover:opacity-60"></div>
          
          <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-4">
              <div class="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                <span class="material-symbols-outlined text-primary text-2xl">security</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">{{ role.name }}</h3>
                <span class="text-xs text-slate-400 font-medium">Rol de Sistema</span>
              </div>
            </div>
            <div class="relative">
              <button (click)="deleteRole(role, $event)" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <div class="space-y-4 mb-6 flex-grow">
            <div class="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span class="text-slate-400 flex items-center gap-2"><span class="material-symbols-outlined text-base">group</span>Usuarios Asignados</span>
              <span class="text-white font-semibold bg-white/5 px-2 py-0.5 rounded-md border border-white/5">--</span>
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Permisos Clave</p>
              <div class="flex flex-wrap gap-2">
                <span *ngFor="let perm of role.permissions.slice(0,3)" class="backdrop-blur-md border border-white/10 shadow-sm px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 bg-white/5 flex items-center gap-1.5">
                  <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  {{ perm }}
                </span>
              </div>
            </div>
          </div>

          <div class="pt-4 mt-auto border-t border-white/5 flex gap-3">
            <button class="flex-1 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">Editar</button>
            <button class="flex-1 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">Duplicar</button>
          </div>
        </div>

        <!-- Add Role Placeholder -->
        <div (click)="openRoleModal()" class="border-2 border-dashed border-white/10 rounded-3xl p-6 flex flex-col justify-center items-center h-full hover:border-primary/40 hover:bg-white/5 transition-all cursor-pointer group min-h-[300px]">
          <div class="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5">
            <span class="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">add</span>
          </div>
          <h3 class="text-lg font-semibold text-slate-300 group-hover:text-white transition-colors">Crear Nuevo Rol</h3>
          <p class="text-sm text-slate-500 text-center mt-2 px-4 group-hover:text-slate-400">Define permisos personalizados para un nuevo grupo de usuarios.</p>
        </div>

      </div>

      <!-- Permission Matrix Preview -->
      <div class="glassmorphism-card rounded-2xl overflow-hidden border border-white/10">
        <div class="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5">
          <div>
            <h3 class="text-lg font-bold text-white">Matriz de Permisos Rápida</h3>
            <p class="text-xs text-slate-400 mt-1">Vista previa de accesos por módulo</p>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition-all">Exportar CSV</button>
            <button class="px-3 py-1.5 text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary rounded-lg border border-primary/20 transition-all">Guardar Cambios</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-xs font-bold text-slate-400 border-b border-white/5 bg-white/5 uppercase tracking-wider">
                <th class="px-6 py-4 font-bold">Módulo</th>
                <th *ngFor="let role of adminService.roles()" class="px-6 py-4 text-center">{{ role.name }}</th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-white/5">
              <tr class="hover:bg-white/5 transition-colors group">
                <td class="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">dashboard</span> Dashboard
                </td>
                <td *ngFor="let role of adminService.roles()" class="px-6 py-4 text-center">
                   <span class="material-symbols-outlined text-lg" [ngClass]="role.permissions.includes('Ver Dashboard') ? 'text-green-500' : 'text-slate-600'">
                      {{ role.permissions.includes('Ver Dashboard') ? 'check_circle' : 'cancel' }}
                   </span>
                </td>
              </tr>
              <tr class="hover:bg-white/5 transition-colors group">
                <td class="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">settings</span> Configuración Global
                </td>
                <td *ngFor="let role of adminService.roles()" class="px-6 py-4 text-center">
                   <span class="material-symbols-outlined text-lg" [ngClass]="role.permissions.includes('Admin Total') ? 'text-green-500' : 'text-slate-600'">
                      {{ role.permissions.includes('Admin Total') ? 'check_circle' : 'cancel' }}
                   </span>
                </td>
              </tr>
              <tr class="hover:bg-white/5 transition-colors group">
                <td class="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">edit_document</span> Edición de Registros
                </td>
                <td *ngFor="let role of adminService.roles()" class="px-6 py-4 text-center">
                   <span class="material-symbols-outlined text-lg" [ngClass]="role.permissions.includes('Aprobar OTs') ? 'text-green-500' : 'text-yellow-500'">
                      {{ role.permissions.includes('Aprobar OTs') ? 'check_circle' : 'remove_moderator' }}
                   </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ROLE MODAL -->
      <div *ngIf="showRoleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-md animate-fade-in">
        <div class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b] text-left align-middle shadow-2xl transition-all sm:my-8">
           <div class="px-6 py-5 border-b border-white/10 bg-[#0f172a] flex items-center justify-between sticky top-0 z-10">
              <div class="flex items-center gap-3">
                 <div class="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-glow-primary">
                    <span class="material-symbols-outlined text-xl">security</span>
                 </div>
                 <h3 class="text-lg font-bold leading-6 text-white">{{ tempRole.id ? 'Editar Rol' : 'Crear Nuevo Rol' }}</h3>
              </div>
              <button (click)="showRoleModal = false" class="text-slate-400 hover:text-white transition-colors">
                 <span class="material-symbols-outlined">close</span>
              </button>
           </div>
           
           <div class="px-6 py-6 space-y-6 overflow-y-auto max-h-[70vh] bg-[#1e293b]">
              <div>
                 <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre del Rol</label>
                 <input [(ngModel)]="tempRole.name" class="w-full px-4 py-3 rounded-xl border border-white/10 text-sm text-white bg-[#111827] focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ej: Supervisor de Planta"/>
              </div>
              <div>
                 <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Descripción</label>
                 <textarea [(ngModel)]="tempRole.description" rows="3" class="w-full px-4 py-3 rounded-xl border border-white/10 text-sm text-white bg-[#111827] focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Breve descripción de las responsabilidades..."></textarea>
              </div>
              
              <div class="pt-2">
                 <h4 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-lg">vpn_key</span>
                    Asignación de Permisos
                 </h4>
                 <div class="space-y-4">
                    <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                       <div class="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                          <span class="text-sm font-medium text-slate-200">Dashboard</span>
                          <span class="text-xs text-slate-500 uppercase tracking-widest font-bold">Acceso</span>
                       </div>
                       <div class="p-4 space-y-3">
                          <div class="flex items-center justify-between">
                             <div class="flex flex-col">
                                <span class="text-sm text-slate-300">Ver Métricas Generales</span>
                                <span class="text-xs text-slate-500">KPIs de producción y rendimiento</span>
                             </div>
                             <div class="relative inline-block w-10 mr-2 align-middle select-none">
                                <input type="checkbox" [checked]="hasPermission('Ver Dashboard')" (change)="togglePermission('Ver Dashboard')" id="perm1" class="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"/>
                                <label for="perm1" class="toggle-label block overflow-hidden h-6 rounded-full bg-slate-700/50 cursor-pointer"></label>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                       <div class="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                          <span class="text-sm font-medium text-slate-200">Inventario</span>
                          <span class="text-xs text-slate-500 uppercase tracking-widest font-bold">Gestión</span>
                       </div>
                       <div class="p-4 space-y-4">
                          <div class="flex items-center justify-between">
                             <div class="flex flex-col">
                                <span class="text-sm text-slate-300">Consultar Stock</span>
                                <span class="text-xs text-slate-500">Visualizar niveles de materia prima</span>
                             </div>
                             <div class="relative inline-block w-10 mr-2 align-middle select-none">
                                <input type="checkbox" [checked]="hasPermission('Ver Inventario')" (change)="togglePermission('Ver Inventario')" id="perm2" class="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"/>
                                <label for="perm2" class="toggle-label block overflow-hidden h-6 rounded-full bg-slate-700/50 cursor-pointer"></label>
                             </div>
                          </div>
                          <div class="flex items-center justify-between border-t border-white/5 pt-3">
                             <div class="flex flex-col">
                                <span class="text-sm text-slate-300">Ajustar Inventario</span>
                                <span class="text-xs text-slate-500">Modificar cantidades manualmente</span>
                             </div>
                             <div class="relative inline-block w-10 mr-2 align-middle select-none">
                                <input type="checkbox" [checked]="hasPermission('Ajustar Inventario')" (change)="togglePermission('Ajustar Inventario')" id="perm3" class="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"/>
                                <label for="perm3" class="toggle-label block overflow-hidden h-6 rounded-full bg-slate-700/50 cursor-pointer"></label>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div class="px-6 py-5 bg-[#0f172a] border-t border-white/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sticky bottom-0 z-10">
              <button (click)="showRoleModal = false" class="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 font-medium text-sm transition-all text-center">Cancelar</button>
              <button (click)="saveRole()" class="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all border border-white/10 active:scale-95">
                 <span class="material-symbols-outlined text-lg mr-2">save</span> Guardar Rol
              </button>
           </div>
        </div>
      </div>

    </div>
  `
})
export class AdminRolesComponent {
  state = inject(StateService);
  adminService = inject(AdminService);
  showRoleModal = false;
  tempRole: Partial<RoleDefinition> = {};

  openRoleModal(role: RoleDefinition | null = null) {
    this.tempRole = role ? JSON.parse(JSON.stringify(role)) : { name: '', description: '', permissions: [] };
    this.showRoleModal = true;
  }

  saveRole() {
    if (this.tempRole.id) {
        this.adminService.updateRole(this.tempRole as RoleDefinition);
    }
    this.showRoleModal = false;
  }
  
  deleteRole(role: RoleDefinition, event: Event) {
    event.stopPropagation();
    if(confirm(`¿Eliminar rol ${role.name}?`)) {
        this.adminService.deleteRole(role.id);
    }
  }

  hasPermission(perm: string): boolean {
      return this.tempRole.permissions?.includes(perm) || false;
  }

  togglePermission(perm: string) {
      if (!this.tempRole.permissions) this.tempRole.permissions = [];
      if (this.tempRole.permissions.includes(perm)) {
          this.tempRole.permissions = this.tempRole.permissions.filter(p => p !== perm);
      } else {
          this.tempRole.permissions.push(perm);
      }
  }
}
